import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

// GET: Fetch active loan accounts
export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const membershipNo = searchParams.get("membershipNo")
    const loanAccountNo = searchParams.get("loanAccountNo")

    let query = `
      SELECT 
        la.*,
        ls.sanctioned_amount,
        ls.interest_rate,
        ls.loan_tenure_months,
        ls.payment_amount as emi_amount,
        ls.sanction_date AS sanction_date,
        lscheme.scheme_name,
        lscheme.loan_type,
        m.customer_code,
        c.full_name as member_name,
        c.mobile_no,
        ltd.loan_account_no,
        (SELECT COALESCE(SUM(credit_amount), 0) FROM loan_transaction_details WHERE loan_account_no = ltd.loan_account_no AND transaction_type = 'REPAYMENT') as total_paid,
        (SELECT balance_after_transaction FROM loan_transaction_details WHERE loan_account_no = ltd.loan_account_no ORDER BY created_at DESC LIMIT 1) as outstanding_balance,
        (SELECT COUNT(*) FROM loan_repayment_schedule_details WHERE loan_account_no = ltd.loan_account_no AND payment_status = 'PAID') as paid_installments,
        (SELECT COUNT(*) FROM loan_repayment_schedule_details WHERE loan_account_no = ltd.loan_account_no) as total_installments,
        (SELECT COUNT(*) FROM loan_repayment_schedule_details WHERE loan_account_no = ltd.loan_account_no AND payment_status = 'OVERDUE') as overdue_installments
      FROM loan_applications la
      JOIN loan_sanction_details ls ON la.loan_application_id = ls.loan_application_id
      JOIN loan_schemes lscheme ON la.scheme_id = lscheme.scheme_id
      JOIN memberships m ON la.membership_no = CAST(m.membership_no AS VARCHAR)
      JOIN customers c ON m.customer_code = c.customer_code
      LEFT JOIN LATERAL (
        SELECT DISTINCT loan_account_no FROM loan_transaction_details WHERE reference_no = la.reference_no LIMIT 1
      ) ltd ON true
      WHERE la.branch_id = $1 AND la.application_status IN ('ACTIVE', 'CLOSED', 'OVERDUE')
    `
    const params: any[] = [branchId]

    if (status && status !== 'all') {
      params.push(status.toUpperCase())
      query += ` AND la.application_status = $${params.length}`
    }

    if (membershipNo) {
      params.push(membershipNo)
      query += ` AND la.membership_no = $${params.length}`
    }

    if (loanAccountNo) {
      params.push(loanAccountNo)
      query += ` AND ltd.loan_account_no = $${params.length}`
    }

    query += ` ORDER BY la.updated_at DESC`

    const { rows: accounts } = await pool.query(query, params)

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error("Failed to fetch loan accounts:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
