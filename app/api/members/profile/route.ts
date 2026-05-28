import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function PUT(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const body = await req.json()
    const { membership_no, personal, address, kyc, membership } = body

    if (!membership_no) {
      return NextResponse.json({ error: "membership_no is required" }, { status: 400 })
    }

    const { rows: [mem] } = await client.query(
      `SELECT customer_code FROM memberships WHERE membership_no = $1 AND branch_id = $2`,
      [membership_no, branchId]
    )
    if (!mem) return NextResponse.json({ error: "Member not found" }, { status: 404 })
    const { customer_code } = mem

    await client.query("BEGIN")

    // Update core customer fields
    await client.query(
      `UPDATE customers SET
         full_name = $1, father_name = $2, spouse_name = $3,
         date_of_birth = $4, gender = $5, mobile_no = $6, email = $7,
         occupation = $8, marital_status = $9, blood_group = $10,
         updated_at = NOW()
       WHERE customer_code = $11`,
      [
        personal.full_name || null, personal.father_name || null, personal.spouse_name || null,
        personal.date_of_birth || null, personal.gender || null, personal.mobile_no || null,
        personal.email || null, personal.occupation || null, personal.marital_status || null,
        personal.blood_group || null, customer_code,
      ]
    )

    // Upsert address
    await client.query(
      `UPDATE customer_address
      SET
        house_no = $2,
        street = $3,
        village = $4,
        thaluk = $5,
        district = $6,
        state = $7,
        pincode = $8,
        phone_no = $9
      WHERE customer_code = $1`,
      [
        customer_code,
        address.house_no || null,
        address.street || null,
        address.village || null,
        address.thaluk || null,
        address.district || null,
        address.state || null,
        address.pincode || null,
        address.phone_no || null,
      ]
    )

    // Upsert KYC (excluding aadhaar — immutable)
    await client.query(
      `UPDATE customer_kycdetails
      SET
        pan_no = $2,
        ration_no = $3,
        driving_license_no = $4,
        updated_at = NOW()
      WHERE customer_code = $1`,
      [
        customer_code,
        kyc.pan_no ?? null,
        kyc.ration_no ?? null,
        kyc.driving_license_no ?? null
      ]
    )
    
    // Update membership-level fields
    await client.query(
      `UPDATE memberships
      SET
        ledger_folio_number = $1,
        board_resolution_number = $2,
        board_resolution_date = $3
      WHERE membership_no = $4
        AND branch_id = $5`,
      [
        membership.ledger_folio_number ?? null,
        membership.board_resolution_number ?? null,
        membership.board_resolution_date ?? null,
        membership_no,
        branchId,
      ]
    )

    await client.query("COMMIT")
    return NextResponse.json({ success: true })
  } catch (err: any) {
    await client.query("ROLLBACK")
    console.error("Member profile PUT error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}

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
