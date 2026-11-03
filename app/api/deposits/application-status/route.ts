import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"

// Fixed Deposits → Application Status: every deposit account of the branch with its
// current status (ref_account_status), searchable and filterable. Read-only.

// deposit_account.deposittype values seen in the data, grouped per type
const TYPE_GROUPS: Record<string, string[]> = {
  TERM: ["TERM", "T"],
  RECURRING: ["RECURING", "RECURRING", "R"],
  PIGMY: ["PIGMY", "P"],
}
const MAX_PAGE_SIZE = 100

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const sp = request.nextUrl.searchParams
    const search = (sp.get("search") || "").trim()
    const status = sp.get("status") || "all" // account_status_id or "all"
    const type = (sp.get("type") || "all").toUpperCase()
    const page = Math.max(1, parseInt(sp.get("page") || "1") || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(sp.get("pageSize") || "20") || 20))

    // Filters shared by the list and the counts (status filter applies to the list only)
    const where: string[] = ["da.branch_id = $1"]
    const params: any[] = [branchId]

    if (type !== "all" && TYPE_GROUPS[type]) {
      params.push(TYPE_GROUPS[type])
      where.push(`UPPER(da.deposittype) = ANY($${params.length}::text[])`)
    }

    if (search) {
      params.push(`%${search}%`)
      const p = `$${params.length}`
      where.push(`(
        CAST(da.accountnumber AS TEXT) ILIKE ${p}
        OR CAST(da.membership_no AS TEXT) ILIKE ${p}
        OR COALESCE(c.full_name, '') ILIKE ${p}
        OR COALESCE(ds.scheme_name, '') ILIKE ${p}
      )`)
    }

    const fromSql = `
      FROM deposit_account da
      LEFT JOIN ref_account_status ras ON ras.account_status_id = da.accountstatus
      LEFT JOIN memberships m ON m.membership_no = da.membership_no AND m.branch_id = da.branch_id
      LEFT JOIN customers c ON c.customer_code = m.customer_code
      LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
      LEFT JOIN term_deposit_details td ON td.accountnumber = da.accountnumber
      LEFT JOIN recurring_deposit_details rd ON rd.accountnumber = da.accountnumber
    `

    // Status counts (for the summary chips) — respect search and type, not the status filter
    const { rows: countRows } = await pool.query(
      `SELECT da.accountstatus AS status_id,
              COALESCE(ras.account_status_name, 'Unknown') AS status_name,
              COUNT(*)::int AS count
       ${fromSql}
       WHERE ${where.join(" AND ")}
       GROUP BY da.accountstatus, ras.account_status_name
       ORDER BY da.accountstatus`,
      params
    )

    const listWhere = [...where]
    const listParams = [...params]
    if (status !== "all") {
      const statusId = parseInt(status)
      if (!Number.isInteger(statusId)) {
        return NextResponse.json({ error: "Invalid status filter" }, { status: 400 })
      }
      listParams.push(statusId)
      listWhere.push(`da.accountstatus = $${listParams.length}`)
    }

    const { rows: [{ total }] } = await pool.query(
      `SELECT COUNT(*)::int AS total ${fromSql} WHERE ${listWhere.join(" AND ")}`,
      listParams
    )

    listParams.push(pageSize, (page - 1) * pageSize)
    const { rows } = await pool.query(
      `SELECT
         da.accountnumber,
         da.deposittype,
         da.membership_no,
         TO_CHAR(da.accountopendate, 'YYYY-MM-DD') AS open_date,
         TO_CHAR(da.accountclosedate, 'YYYY-MM-DD') AS close_date,
         da.rateofinterest,
         da.clearbalance,
         da.accountstatus AS status_id,
         COALESCE(ras.account_status_name, 'Unknown') AS status_name,
         ds.scheme_name,
         c.full_name AS member_name,
         td.depositamount AS td_deposit_amount,
         rd.installment_amount AS rd_installment_amount,
         TO_CHAR(COALESCE(td.maturitydate, rd.maturitydate), 'YYYY-MM-DD') AS maturity_date,
         COALESCE(td.maturityamount, rd.maturityamount) AS maturity_amount
       ${fromSql}
       WHERE ${listWhere.join(" AND ")}
       ORDER BY da.accountopendate DESC NULLS LAST, da.accountnumber DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    )

    const typeOf = (t: string) => {
      const u = String(t || "").toUpperCase()
      return Object.keys(TYPE_GROUPS).find((k) => TYPE_GROUPS[k].includes(u)) || u
    }

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      statusCounts: countRows.map((r: any) => ({
        statusId: r.status_id,
        statusName: r.status_name,
        count: r.count,
      })),
      accounts: rows.map((r: any) => ({
        accountNumber: String(r.accountnumber),
        depositType: typeOf(r.deposittype),
        membershipNo: String(r.membership_no ?? ""),
        memberName: r.member_name || "N/A",
        schemeName: r.scheme_name || "N/A",
        openDate: r.open_date,
        closeDate: r.close_date,
        interestRate: Number(r.rateofinterest) || 0,
        balance: Number(r.clearbalance) || 0,
        // Term: deposit amount; Recurring: installment amount
        amount: r.td_deposit_amount != null
          ? Number(r.td_deposit_amount)
          : r.rd_installment_amount != null ? Number(r.rd_installment_amount) : null,
        maturityDate: r.maturity_date,
        maturityAmount: r.maturity_amount != null ? Number(r.maturity_amount) : null,
        statusId: r.status_id,
        statusName: r.status_name,
      })),
    })
  } catch (error: any) {
    console.error("Failed to load deposit application status:", error)
    return NextResponse.json({ error: "Failed to load deposit accounts: " + error.message }, { status: 500 })
  }
}
