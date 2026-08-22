import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { locker_id } = await req.json()
    if (!locker_id) return NextResponse.json({ error: "locker_id required" }, { status: 400 })

    const { rows } = await pool.query(
      `SELECT
         l.id,
         l.locker_no,
         l.status,
         la.membership_no,
         TO_CHAR(la.assigned_date, 'YYYY-MM-DD') AS assigned_date,
         TO_CHAR(la.expiry_date,   'YYYY-MM-DD') AS expiry_date,
         c.full_name AS member_name
       FROM lockers l
       LEFT JOIN locker_assignments la
         ON la.locker_id = l.id AND la.status = 'ACTIVE'
       LEFT JOIN memberships m
         ON m.membership_no = la.membership_no AND m.branch_id = l.branch_id
       LEFT JOIN customers c
         ON c.customer_code = m.customer_code
       WHERE l.id = $1`,
      [locker_id]
    )

    if (rows.length === 0)
      return NextResponse.json({ error: "Locker not found" }, { status: 404 })

    return NextResponse.json({ success: true, locker: rows[0] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
