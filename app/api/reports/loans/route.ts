import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "outstanding"
    const fromDate = url.searchParams.get("from_date") || ""
    const toDate = url.searchParams.get("to_date") || ""
    const reportDate = url.searchParams.get("report_date") || ""
    const schemeId = url.searchParams.get("scheme_id") || ""

    const baseFrom = `
      FROM loan_applications la
      LEFT JOIN loan_sanction_details lsd ON lsd.loan_application_id = la.loan_application_id
      LEFT JOIN loan_schemes ls ON ls.scheme_id = la.scheme_id AND ls.branch_id = la.branch_id
      LEFT JOIN memberships m ON m.membership_no::text = la.membership_no::text AND m.branch_id = la.branch_id
      LEFT JOIN customers c ON c.customer_code = m.customer_code
      WHERE la.branch_id = $1
    `

    let rows: any[]
    let summary: any = null

    if (type === "outstanding") {
      const params: any[] = [branchId]
      let outWhere = " AND la.application_status = 'ACTIVE'"
      if (reportDate) {
        params.push(reportDate)
        outWhere += ` AND la.application_date::date <= $${params.length}`
      }
      if (schemeId && schemeId !== "all") {
        params.push(schemeId)
        outWhere += ` AND la.scheme_id::int = $${params.length}`
      }
      const result = await pool.query(
        `SELECT la.loan_application_id, la.membership_no, la.application_status,
                la.applied_loan_amount, COALESCE(la.loan_outstanding, 0) AS loan_outstanding,
                TO_CHAR(la.application_date, 'YYYY-MM-DD') AS application_date,
                lsd.sanctioned_amount, lsd.interest_rate, la.loan_tenure_months,
                lsd.payment_amount AS emi_amount,
                ls.scheme_name, c.full_name, c.mobile_no
         ${baseFrom}${outWhere}
         ORDER BY la.loan_outstanding DESC NULLS LAST`,
        params
      )
      rows = result.rows
      summary = {
        count: rows.length,
        total_sanctioned: rows.reduce((s, r) => s + Number(r.sanctioned_amount || 0), 0),
        total_outstanding: rows.reduce((s, r) => s + Number(r.loan_outstanding || 0), 0),
      }

    } else if (type === "disbursement") {
      const params: any[] = [branchId]
      let dateWhere = ""
      if (fromDate) { params.push(fromDate); dateWhere += ` AND lsd.sanction_date >= $${params.length}` }
      if (toDate)   { params.push(toDate);   dateWhere += ` AND lsd.sanction_date <= $${params.length}` }
      const result = await pool.query(
        `SELECT la.loan_application_id, la.membership_no, la.application_status,
                lsd.sanctioned_amount, lsd.interest_rate, la.loan_tenure_months,
                TO_CHAR(lsd.sanction_date, 'YYYY-MM-DD') AS sanction_date,
                lsd.repayment_type,
                ls.scheme_name, c.full_name, c.mobile_no
         ${baseFrom} AND lsd.sanction_date IS NOT NULL${dateWhere}
         ORDER BY lsd.sanction_date DESC`,
        params
      )
      rows = result.rows
      summary = {
        count: rows.length,
        total_disbursed: rows.reduce((s, r) => s + Number(r.sanctioned_amount || 0), 0),
      }

    } else if (type === "overdue") {
      const result = await pool.query(
        `SELECT la.loan_application_id, la.membership_no, la.application_status,
                la.applied_loan_amount, COALESCE(la.loan_outstanding, 0) AS loan_outstanding,
                TO_CHAR(la.application_date, 'YYYY-MM-DD') AS application_date,
                lsd.sanctioned_amount, lsd.interest_rate,
                ls.scheme_name, c.full_name, c.mobile_no
         ${baseFrom} AND la.application_status IN ('ACTIVE', 'OVERDUE')
         AND EXISTS (
           SELECT 1 FROM loan_repayment_schedule_details sch
           WHERE sch.payment_status = 'OVERDUE'
             AND sch.loan_account_no::text = la.loan_application_id::text
         )
         ORDER BY la.loan_outstanding DESC NULLS LAST`,
        [branchId]
      )
      rows = result.rows
      summary = {
        count: rows.length,
        total_outstanding: rows.reduce((s, r) => s + Number(r.loan_outstanding || 0), 0),
      }

    } else if (type === "closure") {
      const params: any[] = [branchId]
      let dateWhere = ""
      if (fromDate) { params.push(fromDate); dateWhere += ` AND la.application_date >= $${params.length}` }
      if (toDate)   { params.push(toDate);   dateWhere += ` AND la.application_date <= $${params.length}` }
      const result = await pool.query(
        `SELECT la.loan_application_id, la.membership_no, la.application_status,
                la.applied_loan_amount,
                TO_CHAR(la.application_date, 'YYYY-MM-DD') AS application_date,
                lsd.sanctioned_amount, lsd.interest_rate, la.loan_tenure_months,
                ls.scheme_name, c.full_name, c.mobile_no
         ${baseFrom} AND la.application_status = 'CLOSED'${dateWhere}
         ORDER BY la.application_date DESC`,
        params
      )
      rows = result.rows
      summary = {
        count: rows.length,
        total_amount: rows.reduce((s, r) => s + Number(r.sanctioned_amount || 0), 0),
      }

    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, rows, count: rows.length, summary })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch report: " + error.message }, { status: 500 })
  }
}
