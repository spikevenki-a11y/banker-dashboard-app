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
    const body = await req.json()
    const { memberNumber, memberName, fatherName, aadhaarNumber, contactNo } = body

    // Build dynamic query conditions
    const conditions: string[] = ["m.branch_id = $1", "m.status = 'ACTIVE'"]
    const values: (string | number)[] = [branchId]
    let paramIndex = 2

    if (memberNumber?.trim()) {
      conditions.push(`m.membership_no ILIKE $${paramIndex}`)
      values.push(`%${memberNumber.trim()}%`)
      paramIndex++
    }

    if (memberName?.trim()) {
      conditions.push(`c.full_name ILIKE $${paramIndex}`)
      values.push(`%${memberName.trim()}%`)
      paramIndex++
    }

    if (fatherName?.trim()) {
      conditions.push(`c.father_name ILIKE $${paramIndex}`)
      values.push(`%${fatherName.trim()}%`)
      paramIndex++
    }

    if (aadhaarNumber?.trim()) {
      conditions.push(`ck.aadhaar_no ILIKE $${paramIndex}`)
      values.push(`%${aadhaarNumber.trim()}%`)
      paramIndex++
    }

    if (contactNo?.trim()) {
      conditions.push(`c.mobile_no ILIKE $${paramIndex}`)
      values.push(`%${contactNo.trim()}%`)
      paramIndex++
    }

    // At least one search criterion is needed
    if (paramIndex === 2) {
      return NextResponse.json({ success: true, results: [] })
    }

    const query = `
      SELECT
        m.membership_no,
        m.member_type,
        m.status,
        m.membership_class,
        c.full_name,
        c.father_name,
        c.mobile_no,
        TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
        ck.aadhaar_no,
        c.customer_code,
        c.gender
      FROM memberships m
      JOIN customers c ON m.customer_code = c.customer_code
      LEFT JOIN customer_kycdetails ck ON ck.customer_code = m.customer_code
      WHERE ${conditions.join(" AND ")}
      ORDER BY c.full_name ASC
      LIMIT 50
    `

    const { rows } = await pool.query(query, values)

    return NextResponse.json({ success: true, results: rows })
  } catch (error: any) {
    console.error("Error searching members:", error)
    return NextResponse.json({ error: "Failed to search members" }, { status: 500 })
  }
}
