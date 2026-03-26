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
      ledger_account,
      account_number,
      drawal_amount,
      transaction_date,
      voucher_no: inputVoucherNo,
      voucher_type,
    } = body

    if (!ledger_account || !account_number || !drawal_amount || !transaction_date) {
      return NextResponse.json(
        { error: "Missing required fields: ledger_account, account_number, drawal_amount, transaction_date" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Get account details
    const { rows: accounts } = await client.query(
      `SELECT * FROM borrowing_master WHERE account_number = $1`,
      [account_number]
    )

    if (accounts.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const account = accounts[0]
    const borrowingGlAccount = account.borrowing_head
    const newBalance =
      parseFloat(account.ledger_balance || 0) + parseFloat(drawal_amount)

    if (newBalance > parseFloat(account.amount_sanctioned)) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        {
          error: `Drawal amount exceeds sanctioned limit. Available: ${
            account.amount_sanctioned - (account.ledger_balance || 0)
          }`,
        },
        { status: 400 }
      )
    }

    // Generate batch ID
    const { rows: [batchRow] } = await client.query(
      `UPDATE gl_batch_sequences
       SET last_batch_id = last_batch_id + 1
       WHERE branch_id = $1
       RETURNING last_batch_id`,
      [branchId]
    )
    const batchId = batchRow.last_batch_id

    // Generate voucher number
    const { rows: [voucherRow] } = await client.query(
      `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
       VALUES ($1, $2, 1)
       ON CONFLICT (branch_id, business_date)
       DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
       RETURNING last_voucher_no`,
      [branchId, businessDate]
    )
    const voucherNo = voucherRow.last_voucher_no

    // Create GL batch header
    await client.query(
      `INSERT INTO gl_batches (
        business_date, branch_id, batch_id, voucher_id,
        voucher_type, maker_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
      [transaction_date, branchId, batchId, voucherNo, voucher_type || "CASH", userId]
    )

    const narration = `Borrowing Drawal - ${account_number}`
    const cashGlAccount = voucher_type === "TRANSFER" ? "11100000" : "23100000"

    // DR: Cash / Bank (asset increases — money received from lender)
    await client.query(
      `INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
      [
        branchId, batchId, transaction_date,
        cashGlAccount, "0",
        drawal_amount,
        voucherNo, narration, userId,
      ]
    )

    // CR: Borrowings Ledger GL (liability increases)
    await client.query(
      `INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)`,
      [
        branchId, batchId, transaction_date,
        ledger_account, account_number,
        drawal_amount,
        voucherNo, narration, userId,
      ]
    )

    // Insert borrowing transaction record
    const { rows: [txn] } = await client.query(
      `INSERT INTO borrowing_transactions (
        branch_id, transaction_date, voucher_no, voucher_type, transaction_type,
        account_number, drawal_amount, ledger_balance_amount, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        branchId,
        transaction_date,
        inputVoucherNo || String(voucherNo),
        voucher_type || "CASH",
        "drawal",
        account_number,
        drawal_amount,
        newBalance,
        "COMPLETED",
        userId,
      ]
    )

    // Update account balance
    await client.query(
      `UPDATE borrowing_master SET ledger_balance = $1 WHERE account_number = $2`,
      [newBalance, account_number]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Drawal recorded successfully",
      transaction: txn,
      new_balance: newBalance,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Borrowings Drawal POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
