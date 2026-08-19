import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const { userId, branch: branchId } = session

    const { deposit_id, additional_years } = await req.json()

    if (!deposit_id || !additional_years || Number(additional_years) < 1) {
      return NextResponse.json(
        { error: "deposit_id and additional_years (min 1) are required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    const { rows: depositRows } = await client.query(
      `SELECT id, locker_id, membership_no, expiry_date, period_years, annual_rent, deposit_amount, status
       FROM locker_deposits WHERE id = $1 AND branch_id = $2`,
      [deposit_id, branchId]
    )

    if (depositRows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Deposit account not found" }, { status: 404 })
    }

    const dep = depositRows[0]

    if (dep.status !== "ACTIVE") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Only active accounts can be renewed" }, { status: 400 })
    }

    // Extend from current expiry (or today if already expired)
    const base = new Date(dep.expiry_date) > new Date() ? new Date(dep.expiry_date) : new Date()
    base.setFullYear(base.getFullYear() + Number(additional_years))
    const newExpiry = base.toISOString().split("T")[0]
    const newPeriod = (Number(dep.period_years) || 0) + Number(additional_years)

    await client.query(
      `UPDATE locker_deposits SET expiry_date = $1, period_years = $2, updated_at = NOW()
       WHERE id = $3`,
      [newExpiry, newPeriod, deposit_id]
    )

    if (dep.locker_id) {
      // Extend linked assignment
      await client.query(
        `UPDATE locker_assignments SET expiry_date = $1, updated_at = NOW()
         WHERE locker_id = $2 AND membership_no = $3 AND status = 'ACTIVE'`,
        [newExpiry, dep.locker_id, dep.membership_no]
      )

      // Audit
      await client.query(
        `INSERT INTO locker_assignment_history
           (locker_id, membership_no, annual_rent, deposit_amount, action, performed_by, branch_id)
         VALUES ($1, $2, $3, $4, 'RENEWED', $5, $6)`,
        [dep.locker_id, dep.membership_no, dep.annual_rent, dep.deposit_amount, userId, branchId]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      new_expiry_date: newExpiry,
      new_period_years: newPeriod,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error renewing deposit:", error)
    return NextResponse.json({ error: "Failed to renew: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
