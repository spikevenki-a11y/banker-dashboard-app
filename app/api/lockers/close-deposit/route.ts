import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const session = JSON.parse(c.value)
    const { userId, branch: branchId } = session

    const { deposit_id } = await req.json()

    if (!deposit_id) {
      return NextResponse.json({ error: "deposit_id is required" }, { status: 400 })
    }

    await client.query("BEGIN")

    const { rows: depositRows } = await client.query(
      `SELECT id, locker_id, membership_no, annual_rent, deposit_amount, status
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
      return NextResponse.json({ error: "Only active accounts can be closed" }, { status: 400 })
    }

    // Close the deposit account
    await client.query(
      `UPDATE locker_deposits SET status = 'CLOSED', updated_at = NOW() WHERE id = $1`,
      [deposit_id]
    )

    if (dep.locker_id) {
      // Release the locker
      await client.query(
        `UPDATE lockers SET status = 'AVAILABLE' WHERE id = $1`,
        [dep.locker_id]
      )

      // Close the active assignment
      await client.query(
        `UPDATE locker_assignments SET status = 'CLOSED', updated_at = NOW()
         WHERE locker_id = $1 AND membership_no = $2 AND status = 'ACTIVE'`,
        [dep.locker_id, dep.membership_no]
      )

      // Audit history
      await client.query(
        `INSERT INTO locker_assignment_history
           (locker_id, membership_no, released_date, annual_rent, deposit_amount, action, performed_by, branch_id)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, 'RELEASED', $5, $6)`,
        [dep.locker_id, dep.membership_no, dep.annual_rent, dep.deposit_amount, userId, branchId]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error closing deposit:", error)
    return NextResponse.json({ error: "Failed to close account: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
