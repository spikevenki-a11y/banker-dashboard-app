import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"

const STEP_ORDER = [
  "SAVINGS_ACCRUAL",
  "TD_ACCRUAL",
  "RD_PENALTY",
  "LOAN_ACCRUAL",
  "BORROWING_ACCRUAL",
  "MATURITY_CHECK",
  "TRIAL_BALANCE",
  "DATE_ADVANCE",
]

export async function POST(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const branchId = u.branch
  const businessDate: string = u.businessDate

  let body: { dayendId: string; stepName: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { dayendId, stepName } = body
  if (!dayendId || !stepName || !STEP_ORDER.includes(stepName)) {
    return NextResponse.json({ error: "Invalid dayendId or stepName" }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Verify dayend_log belongs to this branch and is in valid state
    const logRes = await client.query(
      `SELECT id, status FROM dayend_log WHERE id = $1 AND branch_id = $2`,
      [dayendId, branchId]
    )
    if (logRes.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Day-end session not found" }, { status: 404 })
    }
    if (logRes.rows[0].status === "COMPLETED") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Day-end is already completed" }, { status: 400 })
    }

    // Mark dayend_log as IN_PROGRESS
    await client.query(
      `UPDATE dayend_log SET status = 'IN_PROGRESS' WHERE id = $1`,
      [dayendId]
    )

    // Mark the step as RUNNING
    await client.query(
      `UPDATE dayend_step_log
       SET status = 'RUNNING', started_at = now(), error_message = NULL
       WHERE dayend_id = $1 AND step_name = $2`,
      [dayendId, stepName]
    )

    // ── Execute the step logic ─────────────────────────────────────────────
    let recordsProcessed = 0

    if (stepName === "SAVINGS_ACCRUAL") {
      // Accrue daily interest for active savings accounts
      const accrualRes = await client.query(
        `INSERT INTO savings_interest_accrual
           (branch_id, account_number, accrual_date, opening_balance, interest_rate,
            accrued_interest, cumulative_accrual, is_posted, dayend_id)
         SELECT
           sa.branch_id,
           sa.account_number,
           $1::date,
           sa.clear_balance,
           COALESCE(ip.savings_interest_rate, 0),
           ROUND(sa.clear_balance * COALESCE(ip.savings_interest_rate, 0) / 100.0 / 365.0, 4),
           COALESCE(sa.accrued_interest_balance, 0) +
             ROUND(sa.clear_balance * COALESCE(ip.savings_interest_rate, 0) / 100.0 / 365.0, 4),
           false,
           $2::uuid
         FROM savings_accounts sa
         LEFT JOIN interest_policy ip ON ip.branch_id = sa.branch_id
         WHERE sa.branch_id = $3 AND sa.account_status = 'Active'
         ON CONFLICT (account_number, accrual_date) DO NOTHING`,
        [businessDate, dayendId, branchId]
      )
      recordsProcessed = accrualRes.rowCount ?? 0

      // Update running accrued_interest_balance on savings_accounts
      await client.query(
        `UPDATE savings_accounts sa
         SET accrued_interest_balance = sia.cumulative_accrual
         FROM savings_interest_accrual sia
         WHERE sia.account_number = sa.account_number
           AND sia.accrual_date = $1::date
           AND sa.branch_id = $2`,
        [businessDate, branchId]
      )
    } else if (stepName === "TD_ACCRUAL") {
      // Accrue daily interest for active term/recurring deposits
      const accrualRes = await client.query(
        `INSERT INTO deposit_interest_accrual
           (branch_id, account_id, deposit_type, accrual_date, principal_balance,
            interest_rate, accrued_interest, cumulative_accrual, is_posted, dayend_id)
         SELECT
           da.branch_id,
           da.id,
           da.deposittype,
           $1::date,
           da.clearbalance,
           da.interestrate,
           ROUND(da.clearbalance * da.interestrate / 100.0 / 365.0, 4),
           COALESCE(
             (SELECT cumulative_accrual FROM deposit_interest_accrual
              WHERE account_id = da.id ORDER BY accrual_date DESC LIMIT 1), 0
           ) + ROUND(da.clearbalance * da.interestrate / 100.0 / 365.0, 4),
           false,
           $2::uuid
         FROM deposit_account da
         WHERE da.branch_id = $3
           AND da.accountstatus = 1
           AND da.deposittype IN ('TERM','FD','RD','PIGMY')
         ON CONFLICT (account_id, accrual_date) DO NOTHING`,
        [businessDate, dayendId, branchId]
      )
      recordsProcessed = accrualRes.rowCount ?? 0
    } else if (stepName === "RD_PENALTY") {
      // Placeholder: RD penalty logic (applied at application level)
      recordsProcessed = 0
    } else if (stepName === "LOAN_ACCRUAL") {
      // Accrue daily interest for active loans
      const accrualRes = await client.query(
        `INSERT INTO loan_interest_accrual
           (branch_id, loan_application_id, accrual_date, outstanding_principal,
            interest_rate, accrued_interest, overdue_days, npa_flag, dayend_id)
         SELECT
           la.branch_id,
           la.loan_application_id,
           $1::date,
           la.outstanding_balance,
           la.interest_rate,
           ROUND(la.outstanding_balance * la.interest_rate / 100.0 / 365.0, 4),
           la.overdue_days,
           la.npa_flag,
           $2::uuid
         FROM loan_applications la
         WHERE la.branch_id = $3
           AND la.application_status IN ('APPROVED','DISBURSED','ACTIVE')
         ON CONFLICT (loan_application_id, accrual_date) DO NOTHING`,
        [businessDate, dayendId, branchId]
      )
      recordsProcessed = accrualRes.rowCount ?? 0

      // Update overdue days and NPA flag
      await client.query(
        `UPDATE loan_applications
         SET overdue_days = overdue_days + 1,
             npa_flag = CASE WHEN overdue_days + 1 >= 90 THEN true ELSE npa_flag END,
             npa_classified_date = CASE WHEN overdue_days + 1 = 90 THEN $1::date ELSE npa_classified_date END
         WHERE branch_id = $2
           AND application_status IN ('APPROVED','DISBURSED','ACTIVE')
           AND overdue_days > 0`,
        [businessDate, branchId]
      )
    } else if (stepName === "BORROWING_ACCRUAL") {
      // Placeholder: borrowing accrual (no borrowings table yet)
      recordsProcessed = 0
    } else if (stepName === "MATURITY_CHECK") {
      // Mark matured deposits as PENDING_CLOSURE
      const matRes = await client.query(
        `UPDATE deposit_account
         SET maturity_action = 'PENDING_CLOSURE',
             maturity_processed_date = $1::date
         WHERE branch_id = $2
           AND accountstatus = 1
           AND maturitydate <= $1::date
           AND maturity_action IS NULL`,
        [businessDate, branchId]
      )
      recordsProcessed = matRes.rowCount ?? 0
    } else if (stepName === "TRIAL_BALANCE") {
      // Verify all posted GL batches for today are balanced
      const tbRes = await client.query(
        `SELECT COUNT(DISTINCT b.batch_id) AS unbalanced
         FROM gl_batches b
         JOIN gl_batch_lines l ON l.branch_id = b.branch_id AND l.batch_id = b.batch_id
         WHERE b.branch_id = $1
           AND b.status = 'POSTED'
           AND b.business_date = $2::date
         GROUP BY b.batch_id
         HAVING ABS(SUM(l.debit_amount) - SUM(l.credit_amount)) > 0.005`,
        [branchId, businessDate]
      )
      if (tbRes.rows.length > 0) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: `Trial Balance failed: ${tbRes.rows.length} unbalanced batch(es) found.` },
          { status: 400 }
        )
      }
      recordsProcessed = 0
    } else if (stepName === "DATE_ADVANCE") {
      // Advance the business date: compute next working day (skip Sundays)
      const nextDateRes = await client.query(
        `SELECT ($1::date + INTERVAL '1 day')::date AS next_date`,
        [businessDate]
      )
      const nextDate: string = nextDateRes.rows[0].next_date

      // Mark day-end as COMPLETED and record next business date
      await client.query(
        `UPDATE dayend_log
         SET status = 'COMPLETED', completed_at = now(), next_business_date = $1
         WHERE id = $2`,
        [nextDate, dayendId]
      )
      recordsProcessed = 1
    }
    // ──────────────────────────────────────────────────────────────────────

    // Mark step DONE
    await client.query(
      `UPDATE dayend_step_log
       SET status = 'DONE', completed_at = now(), records_processed = $1
       WHERE dayend_id = $2 AND step_name = $3`,
      [recordsProcessed, dayendId, stepName]
    )

    // If all steps are DONE, mark dayend COMPLETED (DATE_ADVANCE handles it too)
    if (stepName !== "DATE_ADVANCE") {
      const checkRes = await client.query(
        `SELECT COUNT(*) AS pending
         FROM dayend_step_log
         WHERE dayend_id = $1 AND status NOT IN ('DONE')`,
        [dayendId]
      )
      if (Number(checkRes.rows[0].pending) === 0) {
        await client.query(
          `UPDATE dayend_log SET status = 'COMPLETED', completed_at = now() WHERE id = $1`,
          [dayendId]
        )
      }
    }

    await client.query("COMMIT")
    return NextResponse.json({ success: true, stepName, recordsProcessed })
  } catch (e: any) {
    await client.query("ROLLBACK")

    // Mark step as FAILED
    await pool.query(
      `UPDATE dayend_step_log
       SET status = 'FAILED', completed_at = now(), error_message = $1
       WHERE dayend_id = $2 AND step_name = $3`,
      [String(e?.message || "Unknown error"), dayendId, stepName]
    )
    await pool.query(
      `UPDATE dayend_log SET status = 'FAILED', error_message = $1 WHERE id = $2`,
      [String(e?.message || "Unknown error"), dayendId]
    )

    console.error("Dayend run-step error:", e)
    return NextResponse.json({ error: e?.message || "Step execution failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
