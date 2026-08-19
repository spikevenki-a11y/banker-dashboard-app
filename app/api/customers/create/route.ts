import { getSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const u = await getSession()
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  

  const body = await req.json()
  console.log("Create customer request body:", body)

  // Permission check
  const { rowCount } = await pool.query(
    `
    SELECT 1
    FROM users usr
    JOIN role_permissions rp ON rp.role = usr.role
    JOIN permissions p ON p.permission_code = rp.permission_code
    WHERE usr.id = $1
      AND p.permission_code = 'MEMBER_CREATE'
  `,
    [u.userId]
  )

  if (!rowCount) {
    return NextResponse.json({ error: "No permission" }, { status: 403 })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    /* -------- Generate Customer Code -------- */
    const {
      rows: [{ code }],
    } = await client.query(
      `SELECT LPAD(nextval('customer_code_seq')::text, 8, '0') AS code`
    )

    /* -------- Insert Customers (core only) -------- */
    await client.query(
      `
      INSERT INTO customers (
        customer_code,
        full_name,
        father_name,
        gender,
        date_of_birth,
        mobile_no,
        alt_mobile_no,
        email,
        customer_type,
        caste_category
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
      [
        code,
        body.full_name,
        body.father_name,
        body.gender,
        body.dob,
        body.phone,
        body.alt_phone || null,
        body.email,
        body.customer_type,
        body.caste_category || null
      ]
    )

    /* -------- Insert Address -------- */
    await client.query(
      `
      INSERT INTO customer_address (
        customer_code,
        house_no,
        street,
        village,
        thaluk,
        district,
        state,
        pincode,
        permanent_house_no,
        permanent_street,
        permanent_village,
        permanent_thaluk,
        permanent_district,
        permanent_state,
        permanent_pincode
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15
      )
    `,
      [
        code,
        body.house_no,
        body.street,
        body.village,
        body.taluk,
        body.district,
        body.state,
        body.pin_code,
        body.permanent_house_no,
        body.permanent_street,
        body.permanent_village,
        body.permanent_taluk,
        body.permanent_district,
        body.permanent_state,
        body.permanent_pincode,
      ]
    )

    /* -------- Insert KYC (only if provided) -------- */
    if (
      body.aadhar_id ||
      body.pan_card_number ||
      body.ration_no ||
      body.ration_card_type ||
      body.driving_license_no ||
      body.voter_id
    ) {
      await client.query(
        `
        INSERT INTO customer_kycdetails (
          customer_code,
          aadhaar_no,
          pan_no,
          ration_no,
          ration_card_type,
          driving_license_no
        ) VALUES ($1,$2,$3,$4,$5,$6)
      `,
        [
          code,
          body.aadhar_id,
          body.pan_card_number,
          body.ration_no,
          body.ration_card_type || null,
          body.driving_license_no,
        ]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      customer_code: code,
    })
  } catch (e: any) {
    await client.query("ROLLBACK")

    if (e.code === "23505") {
      console.error("Duplicate KYC document detected:", e.detail)
      return NextResponse.json(
          { error: "Duplicate KYC document detected" },
        { status: 409 }
      )
    }

    console.error("Customer create error:", e)
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
