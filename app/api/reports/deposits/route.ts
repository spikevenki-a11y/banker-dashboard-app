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

    const baseSelect = `
      SELECT da.accountnumber::text AS account_number,
             da.membership_no::text AS membership_no,
             TO_CHAR(da.accountopendate, 'YYYY-MM-DD') AS open_date,
             TO_CHAR(da.accountclosedate, 'YYYY-MM-DD') AS close_date,
             da.rateofinterest AS interest_rate,
             da.accountstatus,
             da.clearbalance,
             COALESCE(tdd.depositamount, da.clearbalance) AS deposit_amount,
             TO_CHAR(tdd.maturitydate, 'YYYY-MM-DD') AS maturity_date,
             tdd.maturityamount AS maturity_amount,
             tdd.periodmonths AS period_months,
             ds.scheme_name,
             c.full_name, c.mobile_no
      FROM deposit_account da
      LEFT JOIN term_deposit_details tdd ON tdd.accountnumber = da.accountnumber
      LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid::int AND ds.branch_id = da.branch_id
      LEFT JOIN memberships m ON m.membership_no::text = da.membership_no::text AND m.branch_id = da.branch_id
      LEFT JOIN customers c ON c.customer_code = m.customer_code
      WHERE da.branch_id = $1
    `

    let rows: any[]
    let summary: any = null

    if (type === "maturity") {
      const params: any[] = [branchId]
      let dateWhere = ""
      if (fromDate) { params.push(fromDate); dateWhere += ` AND tdd.maturitydate >= $${params.length}` }
      if (toDate)   { params.push(toDate);   dateWhere += ` AND tdd.maturitydate <= $${params.length}` }
      if (!fromDate && !toDate) {
        dateWhere = " AND tdd.maturitydate BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'"
      }
      if (schemeId && schemeId !== "all") {
        params.push(schemeId)
        dateWhere += ` AND da.schemeid::int = $${params.length}`
      }
      const result = await pool.query(
        `${baseSelect} AND da.accountstatus = 1${dateWhere} ORDER BY tdd.maturitydate ASC`,
        params
      )
      rows = result.rows
      summary = {
        count: rows.length,
        total_deposit: rows.reduce((s, r) => s + Number(r.deposit_amount || 0), 0),
        total_maturity: rows.reduce((s, r) => s + Number(r.maturity_amount || 0), 0),
      }

    } else if (type === "outstanding") {
      const params: any[] = [branchId]
      let outWhere = " AND da.accountstatus = 1"
      if (reportDate) {
        params.push(reportDate)
        outWhere += ` AND da.accountopendate::date <= $${params.length}`
        params.push(reportDate)
        outWhere += ` AND (tdd.maturitydate IS NULL OR tdd.maturitydate::date >= $${params.length})`
      }
      if (schemeId && schemeId !== "all") {
        params.push(schemeId)
        outWhere += ` AND da.schemeid::int = $${params.length}`
      }
      const result = await pool.query(
        `${baseSelect}${outWhere} ORDER BY da.accountopendate DESC`,
        params
      )
      rows = result.rows
      summary = {
        count: rows.length,
        total_deposit: rows.reduce((s, r) => s + Number(r.deposit_amount || 0), 0),
        total_maturity: rows.reduce((s, r) => s + Number(r.maturity_amount || 0), 0),
      }

    } else if (type === "closure") {
      const params: any[] = [branchId]
      let dateWhere = ""
      if (fromDate) { params.push(fromDate); dateWhere += ` AND da.accountclosedate >= $${params.length}` }
      if (toDate)   { params.push(toDate);   dateWhere += ` AND da.accountclosedate <= $${params.length}` }
      const result = await pool.query(
        `${baseSelect} AND da.accountstatus IN (6, 9, 10)${dateWhere} ORDER BY da.accountclosedate DESC NULLS LAST`,
        params
      )
      rows = result.rows
      summary = {
        count: rows.length,
        total_deposit: rows.reduce((s, r) => s + Number(r.deposit_amount || 0), 0),
      }

    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, rows, count: rows.length, summary })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch report: " + error.message }, { status: 500 })
  }
}
