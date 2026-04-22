import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

// GET: Fetch all loan applications
export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const membershipNo = searchParams.get("membershipNo")
    const applicationId = searchParams.get("id")
    const includeSecurity = searchParams.get("include_security") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // If fetching single application with security details
    if (applicationId && includeSecurity) {
      const { rows: securities } = await pool.query(
        `SELECT security_id, security_type, security_description, security_value, document_reference
         FROM loan_security_details WHERE loan_application_id = $1
         ORDER BY security_id`,
        [applicationId]
      )
      return NextResponse.json({ securities })
    }

    let query = `
      SELECT 
        la.*,
        ls.sanction_id,
        ls.sanctioned_amount,
        ls.sanction_date,
        ls.interest_rate as sanctioned_interest_rate,
        ls.loan_tenure_months as sanctioned_tenure,
        ls.payment_amount as emi_amount,
        ls.sanction_status,
        ls.approved_by,
        ls.remarks as sanction_remarks,
        lscheme.scheme_name,
        lscheme.loan_type,
        lscheme.interest_rate as scheme_interest_rate,
        lscheme.minimum_period_months,
        lscheme.maximum_period_months,
        lscheme.loan_gl_account,
        m.customer_code,
        c.full_name as member_name,
        c.mobile_no,
        c.aadhaar_no
      FROM loan_applications la
      LEFT JOIN loan_sanction_details ls ON la.loan_application_id = ls.loan_application_id
      LEFT JOIN loan_schemes lscheme ON la.scheme_id = lscheme.scheme_id
      LEFT JOIN memberships m ON la.membership_no = CAST(m.membership_no AS VARCHAR)
      LEFT JOIN customers c ON m.customer_code = c.customer_code
      WHERE la.branch_id = $1
    `
    const params: any[] = [branchId]

    if (status && status !== "all") {
      params.push(status.toUpperCase())
      query += ` AND la.application_status = $${params.length}`
    }

    if (membershipNo) {
      params.push(membershipNo)
      query += ` AND la.membership_no = $${params.length}`
    }

    query += ` ORDER BY la.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const { rows: applications } = await pool.query(query, params)

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM loan_applications WHERE branch_id = $1`
    const countParams: any[] = [branchId]
    
    if (status && status !== "all") {
      countParams.push(status.toUpperCase())
      countQuery += ` AND application_status = $${countParams.length}`
    }

    const { rows: countResult } = await pool.query(countQuery, countParams)

    console.log(`Fetched ${applications.length} loan applications (Total: ${countResult[0]?.total || 0})`)
    console.log("Sample application data:", applications)

    return NextResponse.json({
      applications,
      total: parseInt(countResult[0]?.total || "0"),
    })
  } catch (error: any) {
    console.error("Failed to fetch loan applications:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create new loan application
export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const body = await request.json()
    console.log("Received loan application data:", body)

    const {
      membership_no,
      scheme_id,
      loan_amount,
      loan_purpose,
      application_date,
      tenure_months,
      guarantor_name,
      guarantor_membership_no,
      remarks,
      security,
    } = body

    if (!membership_no || !scheme_id || !loan_amount) {
      return NextResponse.json(
        { error: "Membership number, loan product, and amount are required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Verify membership exists and is active
    const { rows: members } = await client.query(
      `SELECT m.*, c.full_name 
       FROM memberships m 
       JOIN customers c ON m.customer_code = c.customer_code
       WHERE m.membership_no = $1 AND m.branch_id = $2 AND m.status = 'ACTIVE'`,
      [membership_no, branchId]
    )

    if (members.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Invalid or inactive membership" }, { status: 400 })
    }

    // Verify loan scheme exists
    const { rows: schemes } = await client.query(
      `SELECT * FROM loan_schemes 
       WHERE scheme_id = $1 AND (branch_id = $2 OR branch_id = 23108001) AND scheme_status = 'ACTIVE'`,
      [scheme_id, branchId]
    )

    if (schemes.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Invalid loan scheme" }, { status: 400 })
    }

    const scheme = schemes[0]

    // Validate loan amount against scheme limits
    if (loan_amount < parseFloat(scheme.minimum_loan_amount) || 
        loan_amount > parseFloat(scheme.maximum_loan_amount)) {
      await client.query("ROLLBACK")
      return NextResponse.json({ 
        error: `Loan amount must be between ₹${scheme.minimum_loan_amount} and ₹${scheme.maximum_loan_amount}` 
      }, { status: 400 })
    }

    // Generate loan application ID
    const { rows: seqResult } = await client.query(
      `SELECT COALESCE(MAX(loan_application_id), 0) + 1 as next_id FROM loan_applications WHERE branch_id = $1`,
      [branchId]
    )
    const loanApplicationId = seqResult[0].next_id
    console.log("Generated loan application ID:", loanApplicationId)

    // Generate reference number
    const referenceNo = loanApplicationId

    // Insert loan application
    console.log("Inserting loan application data:", {
      loanApplicationId, branchId, application_date, membership_no,
      scheme_id, loan_purpose, loan_amount, referenceNo
    })
    await client.query(
      `INSERT INTO loan_applications (
        loan_application_id, branch_id, application_date, membership_no,
        scheme_id, loan_purpose, applied_loan_amount, reference_no,
        application_status, created_by, created_at, loan_tenure_months
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, NOW(), $10)`,
      [
        loanApplicationId, branchId,
        application_date || new Date().toISOString().split('T')[0],
        membership_no, scheme_id, loan_purpose || '', loan_amount,
        referenceNo, session.userId, tenure_months,
      ]
    )

    // Persist security details if provided
    if (security?.security_type_id) {
      const secRefNo = `SEC-${branchId}-${loanApplicationId}-1`

      const { rows: secRows } = await client.query(
        `INSERT INTO loan_securities (
          branch_id, loan_application_id, security_type_id, security_ref_no,
          description, is_primary_security, assessed_value, valuation_date,
          security_status, verification_status, created_by, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING','PENDING',$9,NOW())
        RETURNING id`,
        [
          branchId, loanApplicationId, security.security_type_id, secRefNo,
          security.description || null,
          security.is_primary_security !== false,
          security.assessed_value || null,
          security.valuation_date || null,
          session.userId,
        ]
      )

      const securityId = secRows[0].id
      const typeId = Number(security.security_type_id)

      if (typeId === 6) {
        // Gold
        await client.query(
          `INSERT INTO security_gold_details (
            security_id, gold_form, purity_karat, number_of_items,
            gross_weight_grams, stone_weight_grams, net_weight_grams,
            packet_no, appraiser_name, appraiser_license_no, appraisal_date,
            gold_rate_per_gram, gold_rate_date, market_value, storage_location, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())`,
          [
            securityId,
            security.gold_form || 'ORNAMENTS',
            security.purity_karat || 22,
            security.number_of_items || null,
            security.gross_weight_grams || 0,
            security.stone_weight_grams || 0,
            security.net_weight_grams || 0,
            security.packet_no || null,
            security.appraiser_name || null,
            security.appraiser_license_no || null,
            security.appraisal_date || null,
            security.gold_rate_per_gram || null,
            security.gold_rate_date || null,
            security.market_value || null,
            security.storage_location || null,
          ]
        )
      } else if ([1, 2].includes(typeId)) {
        // Land / Building
        await client.query(
          `INSERT INTO security_property_details (
            security_id, property_type, ownership_type, survey_no, owner_name,
            address_line1, city, district, state, pincode,
            land_area_sqft, built_up_area_sqft, land_area_acres,
            registration_no, registration_date, document_type,
            guideline_value, market_value, encumbrance_cert_date,
            title_clear, legal_opinion_by, legal_opinion_date, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NOW())`,
          [
            securityId,
            security.property_type || (typeId === 1 ? 'AGRICULTURAL' : 'RESIDENTIAL'),
            security.ownership_type || 'OWNED',
            security.survey_no || null,
            security.owner_name || null,
            security.address_line1 || null,
            security.city || null,
            security.district || null,
            security.state_name || null,
            security.pincode || null,
            security.land_area_sqft || null,
            security.built_up_area_sqft || null,
            security.land_area_acres || null,
            security.registration_no || null,
            security.registration_date || null,
            security.document_type || null,
            security.guideline_value || null,
            security.market_value || null,
            security.encumbrance_cert_date || null,
            security.title_clear || null,
            security.legal_opinion_by || null,
            security.legal_opinion_date || null,
          ]
        )
      } else if (typeId === 7) {
        // Vehicle
        await client.query(
          `INSERT INTO security_vehicle_details (
            security_id, vehicle_type, registration_no, chassis_no, engine_no,
            manufacturer, model, year_of_manufacture, registration_date,
            rc_book_held, insurance_policy_no, insurance_expiry,
            purchase_price, current_market_value, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())`,
          [
            securityId,
            security.vehicle_type || 'FOUR_WHEELER',
            security.vehicle_registration_no || null,
            security.chassis_no || null,
            security.engine_no || null,
            security.manufacturer || null,
            security.model || null,
            security.year_of_manufacture || null,
            security.vehicle_registration_date || null,
            security.rc_book_held || false,
            security.insurance_policy_no || null,
            security.insurance_expiry || null,
            security.purchase_price || null,
            security.current_market_value || null,
          ]
        )
      } else if ([8, 12].includes(typeId)) {
        // Deposit / NSC / KVP
        await client.query(
          `INSERT INTO security_deposit_details (
            security_id, deposit_type, deposit_account_no, certificate_no,
            institution_name, deposit_amount, deposit_date,
            maturity_date, maturity_amount, interest_rate, lien_amount, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
          [
            securityId,
            security.deposit_type || 'FD',
            security.deposit_account_no || null,
            security.certificate_no || null,
            security.institution_name || null,
            security.deposit_amount || 0,
            security.deposit_date || null,
            security.maturity_date || null,
            security.maturity_amount || null,
            security.deposit_interest_rate || null,
            security.lien_amount || null,
          ]
        )
      } else if (typeId === 10) {
        // Insurance
        await client.query(
          `INSERT INTO security_insurance_details (
            security_id, policy_no, policy_type, insurer_name, insured_name,
            sum_assured, surrender_value, surrender_value_date,
            premium_amount, premium_frequency, policy_start_date, policy_maturity_date,
            assignment_done, assignee_name, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())`,
          [
            securityId,
            security.policy_no || null,
            security.policy_type || 'LIFE',
            security.insurer_name || null,
            security.insured_name || null,
            security.sum_assured || null,
            security.surrender_value || null,
            security.surrender_value_date || null,
            security.premium_amount || null,
            security.premium_frequency || null,
            security.policy_start_date || null,
            security.policy_maturity_date || null,
            security.assignment_done || false,
            security.assignment_done ? (security.assignee_name || null) : null,
          ]
        )
      }
      // For types 3,4,5,9,11 — base loan_securities record is sufficient
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      loan_application_id: loanApplicationId,
      reference_no: referenceNo,
      message: `Loan application ${referenceNo} created successfully`,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Failed to create loan application:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}

// DELETE: Delete a loan application (only pending)
export async function DELETE(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get("id")

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 })
    }

    await client.query("BEGIN")

    // Check if application exists and is pending
    const { rows: apps } = await client.query(
      `SELECT * FROM loan_applications WHERE loan_application_id = $1 AND branch_id = $2`,
      [applicationId, branchId]
    )

    if (apps.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    if (apps[0].application_status !== 'PENDING') {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Only pending applications can be deleted" }, { status: 400 })
    }

    // Delete related records first
    await client.query(
      `DELETE FROM loan_security_details WHERE loan_application_id = $1`,
      [applicationId]
    )

    await client.query(
      `DELETE FROM loan_sanction_details WHERE loan_application_id = $1`,
      [applicationId]
    )

    await client.query(
      `DELETE FROM loan_applications WHERE loan_application_id = $1 AND branch_id = $2`,
      [applicationId, branchId]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Loan application deleted successfully"
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Failed to delete loan application:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
