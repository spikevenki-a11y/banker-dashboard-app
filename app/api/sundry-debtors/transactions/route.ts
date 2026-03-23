import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import pool from '@/lib/connection/db'

export async function GET(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const session = JSON.parse(c.value)
    const branchId = session.branch

    const accountNumber = request.nextUrl.searchParams.get('account_number')

    if (!accountNumber) {
      return NextResponse.json(
        { error: 'account_number is required' },
        { status: 400 }
      )
    }

    const { rows: transactions } = await pool.query(
      `SELECT 
         sdt.*,
         gb.status as batch_status,
         gb.voucher_type as batch_voucher_type
       FROM sundry_debitors_transactions sdt
       LEFT JOIN gl_batches gb ON gb.branch_id = sdt.branch_id AND gb.batch_id = sdt.gl_batch_id
       WHERE sdt.account_number = $1 AND sdt.branch_id = $2
       ORDER BY sdt.transaction_date DESC, sdt.created_at DESC`,
      [accountNumber, branchId]
    )

    return NextResponse.json(transactions)
  } catch (error: any) {
    console.error('Error fetching sundry debtor transactions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sundry debtor transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  
  try {
    const session = JSON.parse(c.value)
    const body = await request.json()
    const businessDate = session.businessDate || new Date().toISOString().split('T')[0]

    const {
      entries,
      transaction_date,
      transaction_type,
      voucher_type,
      selected_batch,
      branch_id,
    } = body

    // Validate voucher type
    if (!voucher_type || !["CASH", "TRANSFER"].includes(voucher_type)) {
      return NextResponse.json({ error: "Valid voucher type (CASH/TRANSFER) is required" }, { status: 400 })
    }

    await client.query("BEGIN")

    // Validate entries
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "At least one account entry is required" }, { status: 400 })
    }

    const processedEntries = entries.map((e: any) => ({
      account_number: e.account_number,
      amount: parseFloat(e.amount),
      description: e.description || `Sundry Debtor ${transaction_type}`
    }))

    // Validate entries
    for (const entry of processedEntries) {
      if (!entry.amount || entry.amount <= 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: `Invalid amount for account ${entry.account_number}` }, { status: 400 })
      }
    }

    /* ---------------- BATCH ID ---------------- */
    let batchId = 0
    if (selected_batch && selected_batch !== 0) {
      batchId = selected_batch
    } else {
      // Create new batch
      const { rows: [batch] } = await client.query(`
        UPDATE gl_batch_sequences
        SET last_batch_id = last_batch_id + 1
        WHERE branch_id = $1
        RETURNING last_batch_id
      `, [session.branch])
      
      if (!batch) {
        // Initialize if not exists
        await client.query(`
          INSERT INTO gl_batch_sequences (branch_id, last_batch_id)
          VALUES ($1, 1)
          ON CONFLICT (branch_id) DO UPDATE SET last_batch_id = gl_batch_sequences.last_batch_id + 1
          RETURNING last_batch_id
        `, [session.branch])
        const { rows: [newBatch] } = await client.query(`
          SELECT last_batch_id FROM gl_batch_sequences WHERE branch_id = $1
        `, [session.branch])
        batchId = newBatch?.last_batch_id || 1
      } else {
        batchId = batch.last_batch_id
      }
    }

    /* ---------------- VOUCHER NO ---------------- */
    let voucherNo = 0
    if (!selected_batch || selected_batch === 0) {
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
      voucherNo = lvo?.voucher_id || 0
    }

    /* ---------------- GL BATCH ---------------- */
    if (!selected_batch || selected_batch === 0) {
      await client.query(`
        INSERT INTO gl_batches (
          business_date, branch_id, batch_id, voucher_id,
          voucher_type, maker_id, status
        ) VALUES ($1,$2,$3,$4,$5,$6,'PENDING')
      `, [businessDate, session.branch, batchId, voucherNo, voucher_type, session.userId])
    }

    // Calculate total amount
    const totalAmount = processedEntries.reduce((sum: number, e: any) => sum + e.amount, 0)

    /* ---------------- CASH GL LINE ---------------- */
    if (voucher_type === "CASH") {
      if (transaction_type === "DEBIT") {
        // CR Cash (Asset decreases) when we give goods/services on credit
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
          totalAmount,
          voucherNo,
          "Sundry Debtor - Debit",
          session.userId
        ])
      } else {
        // DR Cash (Asset increases) when we receive from debtors
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
          totalAmount,
          voucherNo,
          "Sundry Debtor - Receipt",
          session.userId
        ])
      }
    }

    /* ---------------- PROCESS EACH ENTRY ---------------- */
    for (const entry of processedEntries) {
      // Get current account balance and parent GL account
      const { rows: accounts } = await client.query(
        `SELECT sd.*, gla.accountcode 
         FROM sundry_debitors sd
         LEFT JOIN general_ledger_accounts gla ON gla.accountcode = sd.parent_account_number
         WHERE sd.account_number = $1 AND sd.branch_id = $2
         FOR UPDATE`,
        [entry.account_number, session.branch]
      )

      if (accounts.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: `Account not found: ${entry.account_number}` },
          { status: 404 }
        )
      }

      const account = accounts[0]
      const currentBalance = parseFloat(account.ledger_balance) || 0
      const glAccountCode = account.parent_account_number

      // Calculate new balance
      let newBalance: number
      let debitAmt = 0
      let creditAmt = 0

      if (transaction_type === "DEBIT") {
        // Debit increases asset (someone owes us more)
        newBalance = currentBalance + entry.amount
        debitAmt = entry.amount
      } else {
        // Credit decreases asset (they paid us)
        newBalance = currentBalance - entry.amount
        creditAmt = entry.amount
      }

      /* ---------------- GL LINES FOR SUNDRY DEBTOR ACCOUNT ---------------- */
      if (transaction_type === "DEBIT") {
        // DR Sundry Debtor GL (Asset increases)
        await client.query(`
          INSERT INTO gl_batch_lines (
            branch_id, batch_id, business_date,
            accountcode, ref_account_id,
            debit_amount, credit_amount,
            voucher_id, narration, created_by
          ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)
        `, [
          session.branch, batchId, businessDate,
          glAccountCode, entry.account_number,
          entry.amount,
          voucherNo,
          entry.description,
          session.userId
        ])
      } else {
        // CR Sundry Debtor GL (Asset decreases)
        await client.query(`
          INSERT INTO gl_batch_lines (
            branch_id, batch_id, business_date,
            accountcode, ref_account_id,
            debit_amount, credit_amount,
            voucher_id, narration, created_by
          ) VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)
        `, [
          session.branch, batchId, businessDate,
          glAccountCode, entry.account_number,
          entry.amount,
          voucherNo,
          entry.description,
          session.userId
        ])
      }

      /* ---------------- SUNDRY DEBTOR TRANSACTION ---------------- */
      await client.query(`
        INSERT INTO sundry_debitors_transactions (
          branch_id, account_number,
          transaction_date, voucher_type,
          description, debit_amount, credit_amount,
          running_balance, reference_no,
          gl_batch_id, voucher_no,
          created_by
        ) VALUES (
          $1, $2,
          $3, $4,
          $5, $6, $7,
          $8, $9,
          $10, $11,
          $12
        )
      `, [
        session.branch, entry.account_number,
        transaction_date || businessDate, voucher_type,
        entry.description, debitAmt, creditAmt,
        newBalance, null,
        batchId, voucherNo,
        session.userId
      ])

      // Update account balance
      await client.query(
        `UPDATE sundry_debitors 
         SET ledger_balance = $1
         WHERE account_number = $2 AND branch_id = $3`,
        [newBalance, entry.account_number, session.branch]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      batch_id: batchId,
      entries_count: processedEntries.length,
      total_amount: totalAmount,
      status: "PENDING_APPROVAL",
      message: `${processedEntries.length} sundry debtor transaction(s) recorded. Batch: ${batchId}, Voucher: ${voucherNo}. Total: ₹${totalAmount.toLocaleString("en-IN")}`,
    }, { status: 201 })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error('Error creating sundry debtor transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create sundry debtor transaction' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
