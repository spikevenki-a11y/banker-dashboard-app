import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const membershipNo = new URL(req.url).searchParams.get("membership_no")

    if (!membershipNo) {
      return NextResponse.json({ error: "membership_no is required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `SELECT
        m.membership_no,
        m.membership_class,
        m.member_type,
        m.status,
        TO_CHAR(m.join_date, 'YYYY-MM-DD')          AS join_date,
        m.ledger_folio_number,
        m.board_resolution_number,

        c.customer_code,
        c.full_name,
        c.father_name,
        c.gender,
        TO_CHAR(c.date_of_birth, 'YYYY-MM-DD')       AS date_of_birth,
        c.customer_type,
        c.spouse_name,
        c.marital_status,
        c.blood_group,
        c.occupation,
        c.mobile_no,
        c.email                                       AS customer_email,

        ca.house_no,
        ca.street,
        ca.village,
        ca.thaluk,
        ca.district,
        ca.state,
        ca.pincode,
        ca.phone_no                                   AS address_phone,

        ck.aadhaar_no,
        ck.pan_no,
        ck.ration_no,
        ck.driving_license_no

      FROM memberships m
      JOIN customers c        ON c.customer_code  = m.customer_code
      LEFT JOIN customer_address ca   ON ca.customer_code = m.customer_code
      LEFT JOIN customer_kycdetails ck ON ck.customer_code = m.customer_code
      WHERE m.membership_no = $1 AND m.branch_id = $2`,
      [membershipNo, branchId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ found: false }, { status: 404 })
    }

    return NextResponse.json({ found: true, profile: rows[0] })
  } catch (error: any) {
    console.error("Error fetching member profile:", error)
    return NextResponse.json({ error: "Failed to fetch member profile" }, { status: 500 })
  }
}
