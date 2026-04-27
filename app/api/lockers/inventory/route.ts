import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET() {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { rows: lockers } = await pool.query(
      `SELECT
         l.id,
         l.locker_no,
         l.status,
         l.location,
         lt.locker_type_id AS type_id,
         lt.type_name,
         lt.dimensions,
         lt.annual_rent,
         ld.account_number AS deposit_account,
         ld.membership_no,
         c.full_name    AS member_name,
         TO_CHAR(ld.expiry_date, 'YYYY-MM-DD') AS expiry_date
       FROM lockers l
       JOIN locker_types lt ON lt.id = l.locker_type_id
       LEFT JOIN locker_deposits ld ON ld.locker_id = l.id AND ld.status = 'ACTIVE'
       LEFT JOIN memberships m ON m.membership_no = ld.membership_no AND m.branch_id = ld.branch_id
       LEFT JOIN customers   c ON c.customer_code = m.customer_code
       WHERE l.branch_id = $1
       ORDER BY l.locker_no`,
      [branchId]
    )

    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*)                                                AS total,
         COUNT(*) FILTER (WHERE status = 'AVAILABLE')           AS available,
         COUNT(*) FILTER (WHERE status = 'ALLOCATED')           AS allocated,
         COUNT(*) FILTER (WHERE status = 'MAINTENANCE')         AS maintenance
       FROM lockers WHERE branch_id = $1`,
      [branchId]
    )

    return NextResponse.json({ success: true, lockers, stats: statsRows[0] })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch locker inventory: " + error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const { locker_no, locker_type_id, location } = await req.json()

    console.log("Received data for new locker:", { locker_no, locker_type_id, location })

    if (!locker_no?.trim() || !locker_type_id) {
      return NextResponse.json({ error: "locker_no and locker_type_id are required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `INSERT INTO lockers (branch_id, locker_no, locker_type_id, location)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [branchId, locker_no.trim().toUpperCase(), Number(locker_type_id), location?.trim() || null]
    )

    return NextResponse.json({ success: true, locker: rows[0] })
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Locker number already exists in this branch" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to add locker: " + error.message }, { status: 500 })
  }
}
