import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const accountNumber = searchParams.get("account")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!accountNumber) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }

    const { rows: transactions } = await pool.query(
      `SELECT 
         st.*,
         gb.status as batch_status,
         gb.voucher_type as batch_voucher_type
       FROM savings_transactions st
       LEFT JOIN gl_batches gb ON gb.branch_id = st.branch_id AND gb.batch_id = st.gl_batch_id
       WHERE st.account_number = $1 AND st.branch_id = $2
       ORDER BY st.transaction_date DESC, st.created_at DESC
       LIMIT $3 OFFSET $4`,
      [accountNumber, branchId, limit, offset]
    )

    const { rows: countResult } = await pool.query(
      `SELECT COUNT(*) as total FROM savings_transactions WHERE account_number = $1 AND branch_id = $2`,
      [accountNumber, branchId]
    )

    return NextResponse.json({
      transactions,
      total: parseInt(countResult[0]?.total || "0"),
    })
  } catch (error) {
    console.error("Failed to fetch transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const body = await request.json()
    const { accountNumber, transactionType, amount, narration, voucherType, selectedBatch } = body

    const businessDate = session.businessDate

    if (!accountNumber || !transactionType || !amount) {
      return NextResponse.json(
        { error: "Account number, transaction type, and amount are required" },
        { status: 400 }
      )
    }

    if (!voucherType || !["CASH", "TRANSFER"].includes(voucherType)) {
      return NextResponse.json({ error: "Valid voucher type (CASH/TRANSFER) is required" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      /* ---------------- ACCOUNT LOOKUP ---------------- */
      const { rows: accounts } = await client.query(
        `SELECT sa.*, ss.savings_gl_account
         FROM savings_accounts sa
         JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id
         WHERE sa.account_number = $1 FOR UPDATE`,
        [accountNumber]
      )

      if (accounts.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }

      const account = accounts[0]

      if (account.account_status?.toUpperCase() !== "ACTIVE") {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Account is not active" }, { status: 400 })
      }

      let newBalance: number
      const currentBalance = parseFloat(account.available_balance)

      if (transactionType === "DEPOSIT") {
        newBalance = currentBalance + parseFloat(amount)
      } else if (transactionType === "WITHDRAWAL") {
        if (currentBalance < parseFloat(amount)) {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
        }
        newBalance = currentBalance - parseFloat(amount)
      } else {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Invalid transaction type. Use 'DEPOSIT' or 'WITHDRAWAL'" }, { status: 400 })
      }

      const savingsGlAccount = account.savings_gl_account

      /* ---------------- BATCH ID ---------------- */
      let batchId = 0
      if (selectedBatch && selectedBatch !== 0) {
        batchId = selectedBatch
      } else {
        const { rows: [batch] } = await client.query(`
          UPDATE gl_batch_sequences
          SET last_batch_id = last_batch_id + 1
          WHERE branch_id = $1
          RETURNING last_batch_id
        `, [session.branch])
        batchId = batch.last_batch_id
      }

      /* ---------------- VOUCHER NO ---------------- */
      let voucherNo = 0
      if (!selectedBatch || selectedBatch === 0) {
        const { rows: [voucher] } = await client.query(`
          INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
          VALUES ($1, $2, 1)
          ON CONFLICT (branch_id, business_date)
          DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
          RETURNING last_voucher_no
        `, [session.branch, businessDate])
        voucherNo = voucher.last_voucher_no
      } else {
        const { rows: [lvo] } = await client.query(`
          SELECT voucher_id FROM gl_batches
          WHERE branch_id = $1 AND batch_id = $2
        `, [session.branch, batchId])
        voucherNo = lvo.voucher_id
      }

      /* ---------------- GL BATCH ---------------- */
      if (!selectedBatch || selectedBatch === 0) {
        await client.query(`
          INSERT INTO gl_batches (
            business_date, branch_id, batch_id, voucher_id,
            voucher_type, maker_id, status
          ) VALUES ($1,$2,$3,$4,$5,$6,'PENDING')
        `, [businessDate, session.branch, batchId, voucherNo, voucherType, session.userId])
      }

      /* ---------------- GL LINES ---------------- */
      if (transactionType === "DEPOSIT") {
        // DR Cash (Asset increases)
        if (voucherType === "CASH") {
          await client.query(`
            INSERT INTO gl_batch_lines (
              branch_id, batch_id, business_date,
              accountcode, ref_account_id,
              debit_amount, credit_amount,
              voucher_id, narration, created_by
            ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)
          `, [
            session.branch, batchId, businessDate,
            23100000, '0',
            amount,
            voucherNo,
            narration || "Savings Deposit",
            session.userId
          ])
        }

        // CR Savings GL (Liability increases)
        await client.query(`
          INSERT INTO gl_batch_lines (
            branch_id, batch_id, business_date,
            accountcode, ref_account_id,
            debit_amount, credit_amount,
            voucher_id, narration, created_by
          ) VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)
        `, [
          session.branch, batchId, businessDate,
          savingsGlAccount, accountNumber,
          amount,
          voucherNo,
          narration || "Savings Deposit",
          session.userId
        ])
      } else {
        // WITHDRAWAL
        // DR Savings GL (Liability decreases)
        await client.query(`
          INSERT INTO gl_batch_lines (
            branch_id, batch_id, business_date,
            accountcode, ref_account_id,
            debit_amount, credit_amount,
            voucher_id, narration, created_by
          ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)
        `, [
          session.branch, batchId, businessDate,
          savingsGlAccount, accountNumber,
          amount,
          voucherNo,
          narration || "Savings Withdrawal",
          session.userId
        ])

        // CR Cash (Asset decreases)
        if (voucherType === "CASH") {
          await client.query(`
            INSERT INTO gl_batch_lines (
              branch_id, batch_id, business_date,
              accountcode, ref_account_id,
              debit_amount, credit_amount,
              voucher_id, narration, created_by
            ) VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)
          `, [
            session.branch, batchId, businessDate,
            23100000, '0',
            amount,
            voucherNo,
            narration || "Savings Withdrawal",
            session.userId
          ])
        }
      }

      /* ---------------- SAVINGS TXN ---------------- */
      const debitAmount = transactionType === "WITHDRAWAL" ? amount : 0
      const creditAmount = transactionType === "DEPOSIT" ? amount : 0

      await client.query(`
        INSERT INTO savings_transactions (
          branch_id, account_number,
          transaction_date, value_date,
          transaction_type, voucher_type,
          debit_amount, credit_amount, running_balance,
          narration, voucher_no, gl_batch_id,
          status, created_by
        ) VALUES (
          $1,$2,
          $3,$3,
          $4,$5,
          $6,$7,$8,
          $9,$10,$11,
          'PENDING',$12
        )
      `, [
        session.branch, accountNumber,
        businessDate,
        transactionType, voucherType,
        debitAmount, creditAmount, newBalance,
        narration || (transactionType === "DEPOSIT" ? "Savings Deposit" : "Savings Withdrawal"),
        voucherNo, batchId,
        session.userId
      ])

      // Update the account balance
      await client.query(
        `UPDATE savings_accounts 
         SET available_balance = $1, clear_balance = $1, updated_at = NOW()
         WHERE account_number = $2`,
        [newBalance, accountNumber]
      )

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        voucher_no: voucherNo,
        batch_id: batchId,
        newBalance,
        status: "PENDING_APPROVAL",
        message: `${transactionType === "DEPOSIT" ? "Deposit" : "Withdrawal"} of ₹${Number(amount).toLocaleString("en-IN")} successful. Batch: ${batchId}, Voucher: ${voucherNo}. New balance: ₹${newBalance.toLocaleString("en-IN")}`,
      })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error("Failed to process transaction:", error)
    return NextResponse.json({ error: error.message || "Failed to process transaction" }, { status: 500 })
  }
}
