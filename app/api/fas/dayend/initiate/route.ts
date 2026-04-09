import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

const ALL_STEPS = [
  "SAVINGS_ACCRUAL",
  "TD_ACCRUAL",
  "RD_PENALTY",
  "LOAN_ACCRUAL",
  "BORROWING_ACCRUAL",
  "MATURITY_CHECK",
  "TRIAL_BALANCE",
  "DATE_ADVANCE",
] as const

export async function POST() {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const branchId = u.branch
  const businessDate: string = u.businessDate
  const userId = u.id

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Guard: block if there are pending (unverified) vouchers
    const pendingCheck = await client.query(
      `SELECT COUNT(*) AS cnt FROM gl_batches WHERE branch_id = $1 AND status = 'PENDING'`,
      [branchId]
    )
    if (Number(pendingCheck.rows[0].cnt) > 0) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: "There are pending unverified vouchers. Please verify all vouchers before initiating day-end." },
        { status: 400 }
      )
    }

    // Guard: block if day-end already completed for this date
    const existCheck = await client.query(
      `SELECT id, status FROM dayend_log WHERE branch_id = $1 AND business_date = $2`,
      [branchId, businessDate]
    )
    if (existCheck.rows.length > 0 && existCheck.rows[0].status === "COMPLETED") {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: "Day-end has already been completed for this business date." },
        { status: 400 }
      )
    }

    // If a prior FAILED/INITIATED run exists, reuse it; otherwise insert new
    let dayendId: string
    if (existCheck.rows.length > 0) {
      dayendId = existCheck.rows[0].id
      await client.query(
        `UPDATE dayend_log SET status = 'INITIATED', initiated_at = now(), error_message = NULL
         WHERE id = $1`,
        [dayendId]
      )
    } else {
      const ins = await client.query(
        `INSERT INTO dayend_log (branch_id, business_date, status, initiated_by)
         VALUES ($1, $2, 'INITIATED', $3)
         RETURNING id`,
        [branchId, businessDate, userId]
      )
      dayendId = ins.rows[0].id
    }

    // Upsert step rows as PENDING
    for (const step of ALL_STEPS) {
      await client.query(
        `INSERT INTO dayend_step_log (dayend_id, step_name, status)
         VALUES ($1, $2, 'PENDING')
         ON CONFLICT (dayend_id, step_name) DO UPDATE SET status = 'PENDING', error_message = NULL`,
        [dayendId, step]
      )
    }

    await client.query("COMMIT")
    return NextResponse.json({ success: true, dayendId })
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("Dayend initiate error:", e)
    return NextResponse.json({ error: "Failed to initiate day-end" }, { status: 500 })
  } finally {
    client.release()
  }
}
