import { getSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { normalizeAadhaar, validateAadhaar, validateAdditionalKycDocs, validatePan } from "@/lib/member-profile-validation"

export async function POST(req: Request) {
  const u = await getSession()
  if (!u) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  

  const body = await req.json()

  // Passport / EB Bill / Others KYC documents
  const t = (x: unknown) => (x === undefined || x === null ? "" : String(x).trim())
  const extraKyc = {
    passport_no: t(body.passport_no).toUpperCase(),
    eb_bill_no: t(body.eb_bill_no),
    other_document_name: t(body.other_document_name),
    other_document_no: t(body.other_document_no),
  }
  // PAN: uppercase, then must match ABCDE1234F, a valid holder type (4th character)
  // and the holder's name (5th character)
  body.pan_card_number = t(body.pan_card_number).toUpperCase() || null
  const panError = validatePan(body.pan_card_number, t(body.full_name))
  if (panError) {
    return NextResponse.json({ error: panError }, { status: 400 })
  }

  // Aadhaar: spaces trimmed, then 12 digits + Verhoeff checksum
  body.aadhar_id = normalizeAadhaar(body.aadhar_id) || null
  const aadhaarError = validateAadhaar(body.aadhar_id)
  if (aadhaarError) {
    return NextResponse.json({ error: aadhaarError }, { status: 400 })
  }

  const extraKycError = validateAdditionalKycDocs(extraKyc)
  if (extraKycError) {
    return NextResponse.json({ error: extraKycError }, { status: 400 })
  }

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

    /* -------- Duplicate Aadhaar (one customer per Aadhaar, as the unique index enforces) -------- */
    if (body.aadhar_id) {
      const dup = await client.query(
        `SELECT 1 FROM customer_kycdetails WHERE TRIM(aadhaar_no) = $1 LIMIT 1`,
        [body.aadhar_id]
      )
      if ((dup.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "A customer with this Aadhaar number already exists" },
          { status: 409 }
        )
      }
    }

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
      body.voter_id ||
      extraKyc.passport_no ||
      extraKyc.eb_bill_no ||
      extraKyc.other_document_no
    ) {
      await client.query(
        `
        INSERT INTO customer_kycdetails (
          customer_code,
          aadhaar_no,
          pan_no,
          ration_no,
          ration_card_type,
          driving_license_no,
          passport_no,
          eb_bill_no,
          other_document_name,
          other_document_no
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
        [
          code,
          body.aadhar_id,
          body.pan_card_number,
          body.ration_no,
          body.ration_card_type || null,
          body.driving_license_no,
          extraKyc.passport_no || null,
          extraKyc.eb_bill_no || null,
          extraKyc.other_document_name || null,
          extraKyc.other_document_no || null,
        ]
      )
    }

    /* -------- Religion / Annual Income / DCCB Branch / Voter ID (migration 079) -------- */
    // Saved separately inside a savepoint so customer creation still works if
    // migration 079 has not been run yet (the values are then skipped).
    const income = Number(body.anual_income ?? body.annual_income)
    await client.query("SAVEPOINT extra_customer_details")
    try {
      await client.query(
        `UPDATE customers SET religion = $2, annual_income = $3, dccb_branch = $4 WHERE customer_code = $1`,
        [
          code,
          t(body.religion) || null,
          t(body.anual_income ?? body.annual_income) !== "" && Number.isFinite(income) && income >= 0 ? income : null,
          t(body.dccb_Branch ?? body.dccb_branch) || null,
        ]
      )
      const voterId = t(body.voter_id).toUpperCase()
      if (voterId) {
        await client.query(`UPDATE customer_kycdetails SET voter_id = $2 WHERE customer_code = $1`, [code, voterId])
      }
      await client.query("RELEASE SAVEPOINT extra_customer_details")
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT extra_customer_details")
      console.warn("Religion/income/DCCB branch/voter ID not saved — run scripts/079:", (err as Error).message)
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
