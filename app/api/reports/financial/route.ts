import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "trial-balance"
    const fromDate = url.searchParams.get("from_date") || ""
    const toDate = url.searchParams.get("to_date") || ""

    const buildDateWhere = (alias: string, params: any[]) => {
      let clause = ""
      if (fromDate) { params.push(fromDate); clause += ` AND ${alias}.business_date >= $${params.length}` }
      if (toDate)   { params.push(toDate);   clause += ` AND ${alias}.business_date <= $${params.length}` }
      return clause
    }

    let rows: any[]
    let summary: any = null

    if (type === "trial-balance") {
      const params: any[] = [branchId]
      const dateWhere = buildDateWhere("gbl", params)
      const result = await pool.query(
        `SELECT gbl.accountcode,
                SUM(gbl.debit_amount)  AS total_debit,
                SUM(gbl.credit_amount) AS total_credit,
                SUM(gbl.debit_amount) - SUM(gbl.credit_amount) AS net_balance
         FROM gl_batch_lines gbl
         JOIN gl_batches gb ON gb.batch_id = gbl.batch_id AND gb.branch_id = gbl.branch_id
         WHERE gbl.branch_id = $1 AND gb.status = 'APPROVED'${dateWhere}
         GROUP BY gbl.accountcode
         ORDER BY gbl.accountcode`,
        params
      )
      rows = result.rows
      summary = {
        total_debit:  rows.reduce((s, r) => s + Number(r.total_debit  || 0), 0),
        total_credit: rows.reduce((s, r) => s + Number(r.total_credit || 0), 0),
      }

    } else if (type === "cash") {
      const params: any[] = [branchId]
      const dateWhere = buildDateWhere("gbl", params)
      const result = await pool.query(
        `SELECT TO_CHAR(gbl.business_date, 'YYYY-MM-DD') AS date,
                gbl.narration, gbl.debit_amount, gbl.credit_amount,
                gbl.voucher_id AS voucher_no, gb.voucher_type, gb.status AS batch_status
         FROM gl_batch_lines gbl
         JOIN gl_batches gb ON gb.batch_id = gbl.batch_id AND gb.branch_id = gbl.branch_id
         WHERE gbl.branch_id = $1 AND gbl.accountcode = 23100000${dateWhere}
         ORDER BY gbl.business_date DESC, gbl.id DESC`,
        params
      )
      rows = result.rows
      const cashIn  = rows.reduce((s, r) => s + Number(r.debit_amount  || 0), 0)
      const cashOut = rows.reduce((s, r) => s + Number(r.credit_amount || 0), 0)
      summary = { cash_in: cashIn, cash_out: cashOut, net: cashIn - cashOut }

    } else if (type === "summary") {
      const params: any[] = [branchId]
      const dateWhere = buildDateWhere("gbl", params)
      const result = await pool.query(
        `SELECT gb.voucher_type,
                COUNT(DISTINCT gb.batch_id) AS batch_count,
                SUM(gbl.debit_amount)  AS total_debit,
                SUM(gbl.credit_amount) AS total_credit
         FROM gl_batch_lines gbl
         JOIN gl_batches gb ON gb.batch_id = gbl.batch_id AND gb.branch_id = gbl.branch_id
         WHERE gbl.branch_id = $1${dateWhere}
         GROUP BY gb.voucher_type
         ORDER BY gb.voucher_type`,
        params
      )
      rows = result.rows
      summary = {
        total_debit:  rows.reduce((s, r) => s + Number(r.total_debit  || 0), 0),
        total_credit: rows.reduce((s, r) => s + Number(r.total_credit || 0), 0),
      }

    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, rows, count: rows.length, summary })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch report: " + error.message }, { status: 500 })
  }
}
