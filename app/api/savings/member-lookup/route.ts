import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
    
  const c = (await cookies()).get("banker_session")
  if (!c) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    console.log(branchId)
    const { membership_no } = await req.json()

    if (!membership_no) {
      return NextResponse.json({ error: "Membership number is required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `SELECT m.membership_no, m.member_type, m.status, m.membership_class,
              c.full_name, c.father_name, c.mobile_no, c.date_of_birth, 
              c.aadhaar_no, c.customer_code, c.gender
       FROM memberships m
       JOIN customers c ON m.customer_code = c.customer_code
       WHERE m.membership_no = $1 AND m.branch_id = $2 AND m.status = 'ACTIVE'`,
      [membership_no, branchId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ found: false }, { status: 404 })
    }
    console.log("the row is ",rows[0])

    return NextResponse.json({ found: true, member: rows[0] })
  } catch (error: any) {
    console.error("Error looking up member:", error)
    return NextResponse.json({ error: "Failed to lookup member" }, { status: 500 })
  }
}
