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

    // Lookup customer by Aadhaar
    const { rows } = await pool.query(
      `
      SELECT 
        customer_code,
        full_name,
        father_name,
        gender,
        date_of_birth,
        aadhaar_no,
        pan_no,
        mobile_no,
        email,
        address_line1,
        address_line2,
        village,
        taluk,
        district,
        state,
        pincode
      FROM customers
      WHERE aadhaar_no = $1 AND is_active = true
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
