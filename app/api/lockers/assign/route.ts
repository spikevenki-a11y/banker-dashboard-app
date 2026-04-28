import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const { deposit_id, locker_id } = await req.json()

    if (!deposit_id || !locker_id) {
      return NextResponse.json({ error: "deposit_id and locker_id are required" }, { status: 400 })
    }

    await client.query("BEGIN")

    // Verify deposit belongs to this branch and has no locker yet
    const depositCheck = await client.query(
      `SELECT id, locker_id, status FROM locker_deposits WHERE id = $1 AND branch_id = $2`,
      [deposit_id, branchId]
    )
    if (depositCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 })
    }
    if (depositCheck.rows[0].locker_id) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "A locker is already assigned to this deposit" }, { status: 400 })
    }
    if (depositCheck.rows[0].status !== "ACTIVE") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Deposit is not active" }, { status: 400 })
    }

    // Verify locker is available
    const lockerCheck = await client.query(
      `SELECT id, status FROM lockers WHERE id = $1 AND branch_id = $2`,
      [locker_id, branchId]
    )
    if (lockerCheck.rows.length === 0 || lockerCheck.rows[0].status !== "AVAILABLE") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Selected locker is not available" }, { status: 400 })
    }

    await client.query(
      `UPDATE locker_deposits SET locker_id = $1, updated_at = NOW() WHERE id = $2`,
      [locker_id, deposit_id]
    )
    await client.query(`UPDATE lockers SET status = 'ALLOCATED' WHERE id = $1`, [locker_id])

    await client.query("COMMIT")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query("ROLLBACK")
    return NextResponse.json({ error: "Failed to assign locker: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
