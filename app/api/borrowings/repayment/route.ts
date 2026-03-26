import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GL account codes
const INTEREST_PAID_GL = "41000000"   // Interest Paid on Borrowings
const OTHER_EXPENSES_GL = "43000000"  // Charges, IOD, Penal Interest

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
      transaction_date,
      voucher_no: inputVoucherNo,
      voucher_type,
      repayment_amount,
      principal_amount,
      interest_amount,
      charge_amount,
      iod_amount,
      penal_interest_amount,
    } = body

    if (!ledger_account || !account_number || !repayment_amount || !transaction_date) {
      return NextResponse.json(
        { error: "Missing required fields: ledger_account, account_number, repayment_amount, transaction_date" },
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

    const totalDeductions =
      (parseFloat(interest_amount) || 0) +
      (parseFloat(charge_amount) || 0) +
      (parseFloat(iod_amount) || 0) +
      (parseFloat(penal_interest_amount) || 0)

    const principalPaid =
      principal_amount != null
        ? parseFloat(principal_amount)
        : parseFloat(repayment_amount) - totalDeductions

    const otherChargesTotal =
      (parseFloat(charge_amount) || 0) +
      (parseFloat(iod_amount) || 0) +
      (parseFloat(penal_interest_amount) || 0)

    const newBalance = parseFloat(account.ledger_balance || 0) - principalPaid

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

    const baseNarration = `Borrowing Repayment - ${account_number}`
    const cashGlAccount = voucher_type === "TRANSFER" ? "11100000" : "23100000"

    // DR: Borrowings Ledger GL — principal repaid (liability decreases)
    if (principalPaid > 0) {
      await client.query(
        `INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
        [
          branchId, batchId, transaction_date,
          ledger_account, account_number,
          principalPaid,
          voucherNo, `${baseNarration} - Principal`, userId,
        ]
      )
    }

    // DR: Interest Paid GL — interest expense on borrowing
    if ((parseFloat(interest_amount) || 0) > 0) {
      await client.query(
        `INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
        [
          branchId, batchId, transaction_date,
          INTEREST_PAID_GL, account_number,
          parseFloat(interest_amount),
          voucherNo, `${baseNarration} - Interest`, userId,
        ]
      )
    }

    // DR: Other Expenses GL — charges, IOD, penal interest
    if (otherChargesTotal > 0) {
      await client.query(
        `INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
        [
          branchId, batchId, transaction_date,
          OTHER_EXPENSES_GL, account_number,
          otherChargesTotal,
          voucherNo, `${baseNarration} - Charges/IOD/Penal`, userId,
        ]
      )
    }

    // CR: Cash / Bank (asset decreases — total amount paid out)
    await client.query(
      `INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)`,
      [
        branchId, batchId, transaction_date,
        cashGlAccount, "0",
        parseFloat(repayment_amount),
        voucherNo, baseNarration, userId,
      ]
    )

    // Insert borrowing transaction record
    const { rows: [txn] } = await client.query(
      `INSERT INTO borrowing_transactions (
        branch_id, transaction_date, voucher_no, voucher_type, transaction_type,
        account_number, repayment_amount, charge_amount, iod_amount,
        penal_interest_amount, interest_amount, ledger_balance_amount,
        last_interest_paid_date, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        branchId,
        transaction_date,
        inputVoucherNo || String(voucherNo),
        voucher_type || "CASH",
        "repayment",
        account_number,
        repayment_amount,
        charge_amount || 0,
        iod_amount || 0,
        penal_interest_amount || 0,
        interest_amount || 0,
        newBalance,
        transaction_date,
        "COMPLETED",
        userId,
      ]
    )

    // Update account balance and status
    const newStatus = newBalance <= 0 ? "CLOSED" : "ACTIVE"
    await client.query(
      `UPDATE borrowing_master SET ledger_balance = $1, status = $2 WHERE account_number = $3`,
      [Math.max(0, newBalance), newStatus, account_number]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Repayment recorded successfully",
      transaction: txn,
      new_balance: Math.max(0, newBalance),
      principal_paid: principalPaid,
      interest_paid: interest_amount || 0,
      account_status: newStatus,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Borrowings Repayment POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
