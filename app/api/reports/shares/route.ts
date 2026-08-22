import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "register"
    const fromDate = url.searchParams.get("from_date") || ""
    const toDate = url.searchParams.get("to_date") || ""

    let rows: any[]
    let summary: any = null

    if (type === "register") {
      const result = await pool.query(
        `SELECT ms.share_amount, ms.status,
                TO_CHAR(ms.share_opened_date, 'YYYY-MM-DD') AS share_opened_date,
                TO_CHAR(ms.closing_date, 'YYYY-MM-DD') AS closing_date,
                m.membership_no, m.member_type, m.status AS member_status,
                c.full_name, c.mobile_no
         FROM member_shares ms
         JOIN memberships m ON m.id = ms.membership_id AND m.branch_id = $1
         JOIN customers c ON c.customer_code = m.customer_code
         ORDER BY ms.share_opened_date DESC`,
        [branchId]
      )
      rows = result.rows
      const active = rows.filter((r) => r.status === "ACTIVE")
      summary = {
        total_members: rows.length,
        active_members: active.length,
        total_share_amount: active.reduce((s, r) => s + Number(r.share_amount || 0), 0),
      }

    } else if (type === "transactions") {
      const params: any[] = [branchId]
      let dateWhere = ""
      if (fromDate) { params.push(fromDate); dateWhere += ` AND mst.business_date >= $${params.length}` }
      if (toDate)   { params.push(toDate);   dateWhere += ` AND mst.business_date <= $${params.length}` }
      const result = await pool.query(
        `SELECT TO_CHAR(mst.business_date, 'YYYY-MM-DD') AS date,
                mst.voucher_type, mst.voucher_no, mst.debit_amount, mst.credit_amount,
                mst.status, mst.narration,
                m.membership_no, c.full_name
         FROM member_share_transactions mst
         JOIN memberships m ON m.id = mst.membership_id AND m.branch_id = mst.branch_id
         JOIN customers c ON c.customer_code = m.customer_code
         WHERE mst.branch_id = $1${dateWhere}
         ORDER BY mst.business_date DESC, mst.created_at DESC`,
        params
      )
      rows = result.rows
      summary = {
        count: rows.length,
        total_debit: rows.reduce((s, r) => s + Number(r.debit_amount || 0), 0),
        total_credit: rows.reduce((s, r) => s + Number(r.credit_amount || 0), 0),
      }

    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, rows, count: rows.length, summary })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch report: " + error.message }, { status: 500 })
  }
}
