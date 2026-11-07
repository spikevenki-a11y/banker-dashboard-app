import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { DEPOSIT_CREDIT_STATUSES } from "@/lib/deposit-account-status"
import { checkDayEndRestriction } from "@/lib/dayend-check"

// POST: Reject a deposit application — an account that was opened but never funded.
// Fixed Deposits → Application Status → Deposit View → Reject Application.
const MAX_REASON_LENGTH = 500

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const businessDate = session.businessDate
    const body = await request.json()
    const accountNumber = String(body?.accountNumber ?? "").trim()
    const reason = String(body?.reason ?? "").trim()

    if (!accountNumber) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: "A reason for rejecting the application is required" }, { status: 400 })
    }
    if (reason.length > MAX_REASON_LENGTH) {
      return NextResponse.json({ error: `Reason must be ${MAX_REASON_LENGTH} characters or fewer` }, { status: 400 })
    }

    const dayendErr = await checkDayEndRestriction(branchId, businessDate)
    if (dayendErr) return dayendErr

    await client.query("BEGIN")

    const { rows: statusRows } = await client.query(
      `SELECT account_status_id FROM ref_account_status WHERE account_status_name = 'Rejected'`
    )
    if (statusRows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: "The 'Rejected' account status is not set up. Run scripts/073_deposit_application_reject.sql." },
        { status: 500 }
      )
    }
    const rejectedStatusId = statusRows[0].account_status_id

    const { rows: accounts } = await client.query(
      `SELECT accountnumber, accountstatus, clearbalance, unclearbalance
       FROM deposit_account
       WHERE CAST(accountnumber AS TEXT) = $1 AND branch_id = $2
       FOR UPDATE`,
      [accountNumber, branchId]
    )
    if (accounts.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Deposit account not found" }, { status: 404 })
    }
    const account = accounts[0]

    // Pending (awaiting the initial deposit) — or Active, for accounts opened before
    // the Pending status was introduced
    if (!DEPOSIT_CREDIT_STATUSES.includes(Number(account.accountstatus))) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Only an open (pending or active) deposit application can be rejected" }, { status: 400 })
    }

    if (Number(account.clearbalance) !== 0 || Number(account.unclearbalance) !== 0) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: "This deposit has a balance. Use Closure or Premature Closure instead of rejecting it." },
        { status: 400 }
      )
    }

    // No credit may be awaiting verification or already posted against the account
    const { rows: [txns] } = await client.query(
      `SELECT COUNT(*)::int AS n FROM deposit_transactions
       WHERE CAST(accountnumber AS TEXT) = $1 AND branch_id = $2
         AND COALESCE(status, '') IN ('PENDING', 'COMPLETED')`,
      [accountNumber, branchId]
    )
    if (txns.n > 0) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: "This deposit has transactions that are posted or awaiting verification, so it cannot be rejected." },
        { status: 400 }
      )
    }

    // RD: no installment may be marked paid
    const { rows: [paid] } = await client.query(
      `SELECT COUNT(*)::int AS n FROM rd_installment_details
       WHERE CAST(accountnumber AS TEXT) = $1 AND branch_id = $2 AND installment_paid_date IS NOT NULL`,
      [accountNumber, branchId]
    )
    if (paid.n > 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Installments have been paid on this deposit, so it cannot be rejected." }, { status: 400 })
    }

    await client.query(
      `UPDATE deposit_account
       SET accountstatus = $1,
           accountclosedate = $2,
           rejection_reason = $3,
           rejected_by = $4,
           rejected_date = $2
       WHERE CAST(accountnumber AS TEXT) = $5 AND branch_id = $6`,
      [rejectedStatusId, businessDate, reason, String(session.userId), accountNumber, branchId]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: `Deposit application ${accountNumber} has been rejected.`,
      status_id: rejectedStatusId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Failed to reject deposit application:", error)
    return NextResponse.json({ error: "Failed to reject application: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
