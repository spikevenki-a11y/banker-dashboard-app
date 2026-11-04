import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function POST(req: Request) {
  // Validate the session itself, not just the presence of the cookie
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { aadhaar_no } = await req.json()

    if (!aadhaar_no) {
      return NextResponse.json({ error: "Aadhaar number is required" }, { status: 400 })
    }

    // Lookup customer by Aadhaar — every saved customer, address and KYC detail
    const { rows } = await pool.query(
      `
      SELECT
          c.id AS customer_id,
          c.customer_code,
          c.full_name,
          c.father_name,
          c.gender,
          TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
          c.customer_type,
          c.spouse_name,
          c.mobile_no,
          c.alt_mobile_no,
          c.email,
          c.marital_status,
          c.caste_category,
          c.occupation,
          c.qualification,
          c.qualification_details,
          c.dccbaccountnumber AS dccb_account_number,

          -- Address (current)
          ca.house_no,
          ca.street,
          ca.village,
          ca.thaluk,
          ca.district,
          ca.state,
          ca.pincode,
          ca.email AS address_email,
          ca.phone_no,

          -- Address (permanent)
          ca.permanent_house_no,
          ca.permanent_street,
          ca.permanent_village,
          ca.permanent_thaluk,
          ca.permanent_district,
          ca.permanent_state,
          ca.permanent_pincode,
          ca.permanent_phone_no,

          -- KYC
          ck.aadhaar_no,
          ck.pan_no,
          ck.ration_no,
          ck.ration_card_type,
          ck.driving_license_no,
          -- Read through JSON so the lookup keeps working before migration 075 adds these columns
          to_jsonb(ck) ->> 'passport_no'         AS passport_no,
          to_jsonb(ck) ->> 'eb_bill_no'          AS eb_bill_no,
          to_jsonb(ck) ->> 'other_document_name' AS other_document_name,
          to_jsonb(ck) ->> 'other_document_no'   AS other_document_no

      FROM customers c
      LEFT JOIN customer_address ca
          ON ca.customer_code = c.customer_code
      LEFT JOIN customer_kycdetails ck
          ON ck.customer_code = c.customer_code
      WHERE ck.aadhaar_no LIKE '%' || $1 || '%'
          and c.is_active = true

    `,
      [aadhaar_no],
    )

    if (rows.length === 0) {
      return NextResponse.json({ found: false }, { status: 404 })
    }
    return NextResponse.json({ found: true, customer: rows[0] })
  } catch (error: any) {
    console.error("[v0] Customer lookup error:", error)
    return NextResponse.json({ error: "Failed to lookup customer" }, { status: 500 })
  }
}
