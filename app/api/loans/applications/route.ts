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
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

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

    // Generate reference number
    const referenceNo = `LN${branchId}${String(loanApplicationId).padStart(6, '0')}`

    // Insert loan application
    const { rows: inserted } = await client.query(
      `INSERT INTO loan_applications (
        loan_application_id, branch_id, application_date, membership_no,
        scheme_id, loan_purpose, applied_loan_amount, reference_no,
        application_status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, NOW())
      RETURNING *`,
      [
        loanApplicationId, branchId, application_date || new Date().toISOString().split('T')[0],
        membership_no, scheme_id, loan_purpose || '', loan_amount,
        referenceNo, session.userId
      ]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      application: inserted[0],
      reference_no: referenceNo,
      message: `Loan application ${referenceNo} created successfully`
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
