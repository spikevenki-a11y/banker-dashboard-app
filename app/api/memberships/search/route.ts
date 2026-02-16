import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() || ""
  const status = searchParams.get("status") || "all"

  if (!q) {
    return NextResponse.json({ success: true, data: [] })
  }

  try {
    const searchPattern = `%${q}%`

    let query = `
      SELECT
        m.id,
        m.membership_no,
        m.membership_class,
        m.member_type,
        m.status,
        m.branch_id,
        TO_CHAR(m.join_date, 'YYYY-MM-DD') AS join_date,
        m.ledger_folio_number,

        c.customer_code,
        c.full_name,
        c.father_name,
        c.gender,
        TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
        c.mobile_no,
        c.email,

        ca.house_no,
        ca.street,
        ca.village,
        ca.thaluk,
        ca.district,
        ca.state,
        ca.pincode,
        ca.phone_no,

        ck.aadhaar_no,
        ck.pan_no

      FROM memberships m
      LEFT JOIN customers c ON c.customer_code = m.customer_code
      LEFT JOIN customer_address ca ON ca.customer_code = m.customer_code
      LEFT JOIN customer_kycdetails ck ON ck.customer_code = m.customer_code
      WHERE (
        c.full_name ILIKE $1
        OR c.email ILIKE $1
        OR c.mobile_no ILIKE $1
        OR m.membership_no ILIKE $1
        OR ck.aadhaar_no ILIKE $1
        OR c.father_name ILIKE $1
        OR m.ledger_folio_number ILIKE $1
      )
    `

    const values: any[] = [searchPattern]
    let paramIndex = 2

    // Branch restriction for non-admin
    if (u.role !== "admin") {
      query += ` AND m.branch_id = $${paramIndex}`
      values.push(u.branch)
      paramIndex++
    }

    // Status filter
    if (status !== "all") {
      query += ` AND UPPER(m.status) = UPPER($${paramIndex})`
      values.push(status)
      paramIndex++
    }

    query += ` ORDER BY c.full_name ASC LIMIT 50`

    const { rows } = await pool.query(query, values)

    return NextResponse.json({ success: true, data: rows })
  } catch (error: any) {
    console.error("[v0] Member search error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to search members" },
      { status: 500 }
    )
  }
}
