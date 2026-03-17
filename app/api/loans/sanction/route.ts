import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

// POST: Approve or Reject a loan application
export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const body = await request.json()
    const businessDate = session.businessDate

    const {
      loan_application_id,
      action, // 'APPROVE' or 'REJECT'
      sanctioned_amount,
      interest_rate,
      loan_tenure_months,
      moratorium_period,
      remarks,
      repayment_type,
      number_of_installments,
      installment_start_date
    } = body
    console.log("Sanction Request Body:", body)
    console.log("the data is", {
      loan_application_id,
      action,
      sanctioned_amount,
      interest_rate,
      loan_tenure_months,
      moratorium_period,
      remarks,
      repayment_type,
      number_of_installments,
      installment_start_date
    })

    if (!loan_application_id || !action) {
      return NextResponse.json(
        { error: "Application ID and action are required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Verify application exists and is pending
    const { rows: apps } = await client.query(
      `SELECT la.*, ls.scheme_name, ls.interest_rate as scheme_rate, ls.loan_gl_account
       FROM loan_applications la
       JOIN loan_schemes ls ON la.scheme_id = ls.scheme_id
       WHERE la.loan_application_id = $1 AND la.branch_id = $2`,
      [loan_application_id, branchId]
    )

    if (apps.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const app = apps[0]

    if (app.application_status !== 'PENDING') {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Application is not pending" }, { status: 400 })
    }

    if (action === 'APPROVE') {
      if (!sanctioned_amount || !interest_rate || !loan_tenure_months) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "Sanctioned amount, interest rate, and tenure are required for approval" },
          { status: 400 }
        )
      }

      // Calculate EMI
      const P = parseFloat(sanctioned_amount)
      const R = parseFloat(interest_rate) / 12 / 100
      const N = parseInt(loan_tenure_months)
      
      let emiAmount = 0
        if(repayment_type === 'CLOSING_TIME'){
          emiAmount = sanctioned_amount
      }else{
        if (R > 0) {
          emiAmount = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1)
        } else {
          emiAmount = P / N
        }
        emiAmount = Math.round(emiAmount * 100) / 100
      }
      // Generate sanction ID
      const { rows: seqResult } = await client.query(
        `SELECT COALESCE(MAX(sanction_id), 0) + 1 as next_id FROM loan_sanction_details`
      )
      const sanctionId = seqResult[0].next_id

      // Insert sanction details
      await client.query(
        `INSERT INTO loan_sanction_details (
          sanction_id, loan_application_id, sanctioned_amount, sanction_date,
          interest_rate, loan_tenure_months, payment_amount, moratorium_period,
          sanction_status, approved_by, remarks, created_at,repayment_type,number_of_installments,installment_start_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SANCTIONED', $9, $10, NOW(), $11, $12, $13)`,
        [
          sanctionId, loan_application_id, sanctioned_amount, businessDate,
          interest_rate, loan_tenure_months, emiAmount, moratorium_period || 0, session.userId, remarks || '', repayment_type, number_of_installments, installment_start_date
        ]
      )

      // Update application status
      await client.query(
        `UPDATE loan_applications SET application_status = 'SANCTIONED', updated_at = NOW() 
         WHERE loan_application_id = $1`,
        [loan_application_id]
      )

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Loan application approved successfully",
        sanction_id: sanctionId,
        emi_amount: emiAmount
      })

    } else if (action === 'REJECT') {
      if (!remarks) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Remarks are required for rejection" }, { status: 400 })
      }

      // Generate sanction ID for rejection record
      const { rows: seqResult } = await client.query(
        `SELECT COALESCE(MAX(sanction_id), 0) + 1 as next_id FROM loan_sanction_details`
      )
      const sanctionId = seqResult[0].next_id

      // Insert rejection record
      await client.query(
        `INSERT INTO loan_sanction_details (
          sanction_id, loan_application_id, sanction_date,
          sanction_status, approved_by, remarks, created_at
        ) VALUES ($1, $2, CURRENT_DATE, 'REJECTED', $3, $4, NOW())`,
        [sanctionId, loan_application_id, session.userId, remarks]
      )

      // Update application status
      await client.query(
        `UPDATE loan_applications SET application_status = 'REJECTED', updated_at = NOW() 
         WHERE loan_application_id = $1`,
        [loan_application_id]
      )

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Loan application rejected"
      })

    } else {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Failed to process sanction:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
