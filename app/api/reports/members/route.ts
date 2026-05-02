import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "all"
    const fromDate = url.searchParams.get("from_date") || ""
    const toDate = url.searchParams.get("to_date") || ""

    const baseSelect = `
      SELECT m.membership_no, m.member_type, m.membership_class, m.status,
             TO_CHAR(m.join_date, 'YYYY-MM-DD') AS join_date,
             TO_CHAR(m.close_date, 'YYYY-MM-DD') AS close_date,
             c.full_name, c.father_name, c.mobile_no,
             TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
             c.gender
      FROM memberships m
      JOIN customers c ON c.customer_code = m.customer_code
      WHERE m.branch_id = $1
    `

    let rows: any[]

    if (type === "all") {
      const params: any[] = [branchId]
      let extra = ""
      if (fromDate) { params.push(fromDate); extra += ` AND m.join_date >= $${params.length}` }
      if (toDate)   { params.push(toDate);   extra += ` AND m.join_date <= $${params.length}` }
      const result = await pool.query(`${baseSelect}${extra} ORDER BY m.join_date DESC`, params)
      rows = result.rows
    } else if (type === "inactive") {
      const result = await pool.query(
        `${baseSelect} AND m.status != 'ACTIVE' ORDER BY m.close_date DESC NULLS LAST`,
        [branchId]
      )
      rows = result.rows
    } else if (type === "kyc") {
      const result = await pool.query(
        `SELECT m.membership_no, m.member_type, m.status,
                TO_CHAR(m.join_date, 'YYYY-MM-DD') AS join_date,
                c.full_name, c.mobile_no, k.aadhaar_no, c.gender,
                TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
                CASE WHEN k.aadhaar_no IS NOT NULL AND TRIM(k.aadhaar_no) != ''
                     THEN 'Verified' ELSE 'Pending' END AS kyc_status
         FROM memberships m
         JOIN customers c ON c.customer_code = m.customer_code
         join customer_kycdetails k on k.customer_code = m.customer_code
         WHERE m.branch_id = $1
         ORDER BY kyc_status DESC, m.join_date DESC`,
        [branchId]
      )
      rows = result.rows
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, rows, count: rows.length })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch report: " + error.message }, { status: 500 })
  }
}
