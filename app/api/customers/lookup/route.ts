import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { aadhaar_no } = await req.json()

    if (!aadhaar_no) {
      return NextResponse.json({ error: "Aadhaar number is required" }, { status: 400 })
    }
    console.log("Looking up Aadhaar:", aadhaar_no)

    // Lookup customer by Aadhaar
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
          c.email,

          -- Address
          ca.house_no,
          ca.street,
          ca.village,
          ca.thaluk,
          ca.district,
          ca.state,
          ca.pincode,
          ca.email,
          ca.phone_no,

          -- KYC
          ck.aadhaar_no,
          ck.pan_no,
          ck.ration_no,
          ck.driving_license_no

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
    console.log("Customer found:", rows[0])
    return NextResponse.json({ found: true, customer: rows[0] })
  } catch (error: any) {
    console.error("[v0] Customer lookup error:", error)
    return NextResponse.json({ error: "Failed to lookup customer" }, { status: 500 })
  }
}
