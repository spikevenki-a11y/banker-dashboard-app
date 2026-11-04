import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import {
  MEMBER_EDIT_SECTIONS,
  isMemberEditSection,
  pickSectionFields,
  validateMemberSection,
} from "@/lib/member-profile-validation"
import { readSectionSnapshot, recordSectionChanges } from "@/lib/member-edit-history"

// Empty strings from the form are stored as NULL.
const v = (x: unknown) => (x === undefined || x === null || String(x).trim() === "" ? null : String(x).trim())

// Saves one Edit Member tab: body = { membership_no, section, data }.
// Only the tables/columns belonging to that tab are touched.
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { membership_no, section } = body || {}
  if (!membership_no) {
    return NextResponse.json({ error: "membership_no is required" }, { status: 400 })
  }
  if (!isMemberEditSection(section)) {
    return NextResponse.json({ error: "A valid section is required" }, { status: 400 })
  }

  const d = pickSectionFields(section, body.data || {})
  if (section === "kyc") {
    d.pan_no = d.pan_no.trim().toUpperCase()
    d.passport_no = d.passport_no.toUpperCase()
  }
  const validationError = validateMemberSection(section, d)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const label = MEMBER_EDIT_SECTIONS[section].label
  const branchId = session.branch
  const client = await pool.connect()
  try {
    const { rows: [mem] } = await client.query(
      `SELECT customer_code FROM memberships WHERE membership_no = $1 AND branch_id = $2`,
      [membership_no, branchId]
    )
    if (!mem) return NextResponse.json({ error: "Member not found" }, { status: 404 })
    const { customer_code } = mem

    await client.query("BEGIN")

    // Edit history: stored values of this tab before the update
    const historyIds = { customerCode: String(customer_code), membershipNo: String(membership_no), branchId: String(branchId) }
    const before = await readSectionSnapshot(client, section, historyIds)

    if (section === "personal") {
      await client.query(
        `UPDATE customers SET
           full_name = $1, father_name = $2, spouse_name = $3,
           date_of_birth = $4, gender = $5, mobile_no = $6, email = $7,
           occupation = $8, marital_status = $9,
           caste_category = $10,
           alt_mobile_no = $11, qualification = $12, qualification_details = $13,
           dccbaccountnumber = $14,
           updated_at = NOW()
         WHERE customer_code = $15`,
        [
          v(d.full_name), v(d.father_name), v(d.spouse_name),
          v(d.date_of_birth), v(d.gender), v(d.mobile_no), v(d.email),
          v(d.occupation), v(d.marital_status),
          v(d.caste_category),
          v(d.alt_mobile_no), v(d.qualification), v(d.qualification_details),
          v(d.dccb_account_number),
          customer_code,
        ]
      )
    }

    if (section === "address") {
      // Current + permanent; create the row if the customer has none yet
      const addressValues = [
        v(d.house_no), v(d.street), v(d.village), v(d.thaluk),
        v(d.district), v(d.state), v(d.pincode), v(d.phone_no),
        v(d.permanent_house_no), v(d.permanent_street), v(d.permanent_village),
        v(d.permanent_thaluk), v(d.permanent_district), v(d.permanent_state),
        v(d.permanent_pincode), v(d.permanent_phone_no),
      ]
      const addrUpdate = await client.query(
        `UPDATE customer_address SET
           house_no = $2, street = $3, village = $4, thaluk = $5,
           district = $6, state = $7, pincode = $8, phone_no = $9,
           permanent_house_no = $10, permanent_street = $11, permanent_village = $12,
           permanent_thaluk = $13, permanent_district = $14, permanent_state = $15,
           permanent_pincode = $16, permanent_phone_no = $17,
           updated_at = NOW()
         WHERE customer_code = $1`,
        [customer_code, ...addressValues]
      )
      if (addrUpdate.rowCount === 0 && addressValues.some((x) => x !== null)) {
        await client.query(
          `INSERT INTO customer_address (
             customer_code,
             house_no, street, village, thaluk, district, state, pincode, phone_no,
             permanent_house_no, permanent_street, permanent_village, permanent_thaluk,
             permanent_district, permanent_state, permanent_pincode, permanent_phone_no
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [customer_code, ...addressValues]
        )
      }
    }

    if (section === "kyc") {
      // Aadhaar is immutable; create the row if the customer has none yet
      const kycValues = [
        v(d.pan_no), v(d.ration_no), v(d.ration_card_type), v(d.driving_license_no),
        v(d.passport_no), v(d.eb_bill_no), v(d.other_document_name), v(d.other_document_no),
      ]
      const kycUpdate = await client.query(
        `UPDATE customer_kycdetails SET
           pan_no = $2, ration_no = $3, ration_card_type = $4, driving_license_no = $5,
           passport_no = $6, eb_bill_no = $7, other_document_name = $8, other_document_no = $9,
           updated_at = NOW()
         WHERE customer_code = $1`,
        [customer_code, ...kycValues]
      )
      if (kycUpdate.rowCount === 0 && kycValues.some((x) => x !== null)) {
        await client.query(
          `INSERT INTO customer_kycdetails (
             customer_code, pan_no, ration_no, ration_card_type, driving_license_no,
             passport_no, eb_bill_no, other_document_name, other_document_no
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [customer_code, ...kycValues]
        )
      }
    }

    if (section === "membership") {
      await client.query(
        `UPDATE memberships
        SET
          ledger_folio_number = $1,
          board_resolution_number = $2,
          board_resolution_date = $3
        WHERE membership_no = $4
          AND branch_id = $5`,
        [
          v(d.ledger_folio_number),
          v(d.board_resolution_number),
          v(d.board_resolution_date),
          membership_no,
          branchId,
        ]
      )
    }

    // Edit history: record each field that actually changed (same transaction)
    const after = await readSectionSnapshot(client, section, historyIds)
    const changedCount = await recordSectionChanges(client, {
      section,
      before,
      after,
      branchId: String(branchId),
      membershipNo: String(membership_no),
      customerCode: String(customer_code),
      userId: session.userId || null,
      userName: session.fullName || null,
    })

    await client.query("COMMIT")
    return NextResponse.json({
      success: true,
      section,
      changed_fields: changedCount,
      message: changedCount > 0 ? `${label} updated successfully.` : `No changes to ${label.toLowerCase()} were made.`,
    })
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {})
    if (err?.code === "42P01" && /member_edit_history/.test(String(err?.message))) {
      // History must be recorded, so the update is not saved without it
      console.error("member_edit_history table missing — run scripts/076_member_edit_history.sql")
      return NextResponse.json(
        { error: "Edit history is not set up yet, so changes were not saved. Please contact the administrator." },
        { status: 503 }
      )
    }
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "This KYC document number is already registered to another customer." },
        { status: 409 }
      )
    }
    console.error(`Member profile PUT (${section}) error:`, err)
    return NextResponse.json({ error: `Failed to update ${label.toLowerCase()}.` }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
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
