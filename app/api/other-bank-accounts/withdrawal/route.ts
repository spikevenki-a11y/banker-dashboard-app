import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const userId = session.userId
    const businessDate = session.businessDate

    const body = await request.json()
    const {
      account_head,
      account_number,
      withdrawal_amount,
      transaction_date,
      voucher_no: inputVoucherNo,
      voucher_type,
      narration: inputNarration,
      close_account,   // boolean — close the account after withdrawal
      selected_batch,  // 0 = new batch, >0 = join existing batch
    } = body

    if (!account_head || !account_number || !withdrawal_amount || !transaction_date) {
      return NextResponse.json(
        { error: "Missing required fields: account_head, account_number, withdrawal_amount, transaction_date" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    const { rows: accs } = await client.query(
      `SELECT * FROM bank_accounts WHERE account_number = $1`,
      [account_number]
    )
    if (accs.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
    if (accs[0].status !== "ACTIVE") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account is not active" }, { status: 400 })
    }

    const account = accs[0]
    const amount = parseFloat(withdrawal_amount)
    const currentBalance = parseFloat(account.account_balance)

    if (amount > currentBalance) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: `Withdrawal amount exceeds account balance. Available: ${currentBalance}` },
        { status: 400 }
      )
    }

    const newBalance = currentBalance - amount
    const txnType = close_account ? "CLOSURE" : "WITHDRAWAL"

    // GL sequences — join existing batch or create new
    let batchId: number
    let voucherNo: number

    if (selected_batch && selected_batch > 0) {
      batchId = selected_batch
      const { rows: [existingBatch] } = await client.query(
        `SELECT voucher_id FROM gl_batches WHERE batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, branchId]
      )
      if (!existingBatch) throw new Error("Selected GL batch not found or already verified")
      voucherNo = existingBatch.voucher_id
    } else {
      const { rows: [batchRow] } = await client.query(
        `UPDATE gl_batch_sequences SET last_batch_id = last_batch_id + 1
         WHERE branch_id = $1 RETURNING last_batch_id`,
        [branchId]
      )
      batchId = batchRow.last_batch_id

      const { rows: [voucherRow] } = await client.query(
        `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
         VALUES ($1, $2, 1)
         ON CONFLICT (branch_id, business_date)
         DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
         RETURNING last_voucher_no`,
        [branchId, businessDate]
      )
      voucherNo = voucherRow.last_voucher_no

      await client.query(
        `INSERT INTO gl_batches (business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
        [transaction_date, branchId, batchId, voucherNo, voucher_type || "CASH", userId]
      )
    }

    const narration = inputNarration || `${txnType === "CLOSURE" ? "Account Closure" : "Withdrawal"} - ${account_number}`
    const cashGl = voucher_type === "TRANSFER" ? "11100000" : "23100000"

    // DR: Cash / Bank GL (asset increases — money received)
    await client.query(
      `INSERT INTO gl_batch_lines
         (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
       VALUES ($1,$2,$3,$4,'0',$5,0,$6,$7,$8)`,
      [branchId, batchId, transaction_date, cashGl, amount, voucherNo, narration, userId]
    )

    // CR: Other Bank Account GL (asset decreases — balance reduces)
    await client.query(
      `INSERT INTO gl_batch_lines
         (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
       VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)`,
      [branchId, batchId, transaction_date, account_head, account_number, amount, voucherNo, narration, userId]
    )

    // Insert transaction record
    const { rows: [txn] } = await client.query(
      `INSERT INTO bank_accounts_transactions
         (branch_id, transaction_date, voucher_no, batch_id, transaction_type, account_number,
          debit_amount, credit_amount, interest_amount, ledger_balance_amount, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,'COMPLETED',$9)
       RETURNING *`,
      [branchId, transaction_date, inputVoucherNo || String(voucherNo), batchId,
       txnType, account_number, amount, newBalance, userId]
    )

    // Update account balance; close if requested
    const newStatus = close_account ? "CLOSED" : "ACTIVE"
    await client.query(
      `UPDATE bank_accounts
       SET account_balance = $1, account_clear_balance = $1, status = $2
       WHERE account_number = $3`,
      [newBalance, newStatus, account_number]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: close_account ? "Account closed successfully" : "Withdrawal recorded successfully",
      transaction: txn,
      new_balance: newBalance,
      account_status: newStatus,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Other Bank Accounts Withdrawal POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
