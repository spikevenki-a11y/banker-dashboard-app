import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const businessDate = session.businessDate
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "outstanding"
    const fromDate = url.searchParams.get("from_date") || ""
    const toDate = url.searchParams.get("to_date") || ""
    const accountNumber = url.searchParams.get("account_number") || ""

    let rows: any[]
    let summary: any = null

    if (type === "outstanding") {
      const result = await pool.query(
        `SELECT sa.account_number, sa.available_balance, sa.account_status,
                TO_CHAR(sa.opening_date, 'YYYY-MM-DD') AS opening_date,
                ss.scheme_name, ss.interest_rate AS scheme_rate,
                m.membership_no, c.full_name, c.mobile_no
         FROM savings_accounts sa
         JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
         JOIN memberships m ON m.membership_no::text = sa.membership_no::text AND m.branch_id = sa.branch_id
         JOIN customers c ON c.customer_code = m.customer_code
         WHERE sa.branch_id = $1 AND sa.account_status = 'ACTIVE'
         ORDER BY sa.available_balance DESC`,
        [branchId]
      )
      rows = result.rows
      const totalBalance = rows.reduce((s, r) => s + Number(r.available_balance || 0), 0)
      summary = { total_accounts: rows.length, total_balance: totalBalance }

    } else if (type === "statement") {
      if (!accountNumber) {
        return NextResponse.json({ error: "account_number is required for statement" }, { status: 400 })
      }
      // Account info
      const accResult = await pool.query(
        `SELECT sa.account_number, sa.available_balance, sa.account_status,
                TO_CHAR(sa.opening_date, 'YYYY-MM-DD') AS opening_date,
                ss.scheme_name, ss.interest_rate,
                m.membership_no, c.full_name, c.mobile_no
         FROM savings_accounts sa
         JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
         JOIN memberships m ON m.membership_no::text = sa.membership_no::text AND m.branch_id = sa.branch_id
         JOIN customers c ON c.customer_code = m.customer_code
         WHERE sa.account_number = $1 AND sa.branch_id = $2`,
        [accountNumber, branchId]
      )
      if (accResult.rows.length === 0) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }

      const params: any[] = [accountNumber, branchId]
      let dateWhere = ""
      if (fromDate) { params.push(fromDate); dateWhere += ` AND transaction_date >= $${params.length}` }
      if (toDate)   { params.push(toDate);   dateWhere += ` AND transaction_date <= $${params.length}` }

      const txnResult = await pool.query(
        `SELECT TO_CHAR(transaction_date, 'YYYY-MM-DD') AS date,
                transaction_type, voucher_type, voucher_no,
                debit_amount, credit_amount, running_balance, narration, status
         FROM savings_transactions
         WHERE account_number = $1 AND branch_id = $2${dateWhere}
         ORDER BY transaction_date DESC, created_at DESC`,
        params
      )
      rows = txnResult.rows
      summary = {
        account: accResult.rows[0],
        total_debit: rows.reduce((s, r) => s + Number(r.debit_amount || 0), 0),
        total_credit: rows.reduce((s, r) => s + Number(r.credit_amount || 0), 0),
      }

    } else if (type === "deposits") {
      const params: any[] = [branchId]
      let dateWhere = ""
      if (fromDate) { params.push(fromDate); dateWhere += ` AND transaction_date >= $${params.length}` }
      if (toDate)   { params.push(toDate);   dateWhere += ` AND transaction_date <= $${params.length}` }
      const result = await pool.query(
        `SELECT TO_CHAR(transaction_date, 'YYYY-MM-DD') AS date,
                COUNT(*) AS count, SUM(credit_amount) AS total_amount
         FROM savings_transactions
         WHERE branch_id = $1 AND transaction_type = 'DEPOSIT' AND status != 'REVERSED'${dateWhere}
         GROUP BY transaction_date ORDER BY transaction_date DESC`,
        params
      )
      rows = result.rows
      summary = {
        total_days: rows.length,
        total_transactions: rows.reduce((s, r) => s + Number(r.count), 0),
        total_amount: rows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      }

    } else if (type === "withdrawals") {
      const params: any[] = [branchId]
      let dateWhere = ""
      if (fromDate) { params.push(fromDate); dateWhere += ` AND transaction_date >= $${params.length}` }
      if (toDate)   { params.push(toDate);   dateWhere += ` AND transaction_date <= $${params.length}` }
      const result = await pool.query(
        `SELECT TO_CHAR(transaction_date, 'YYYY-MM-DD') AS date,
                COUNT(*) AS count, SUM(debit_amount) AS total_amount
         FROM savings_transactions
         WHERE branch_id = $1 AND transaction_type = 'WITHDRAWAL' AND status != 'REVERSED'${dateWhere}
         GROUP BY transaction_date ORDER BY transaction_date DESC`,
        params
      )
      rows = result.rows
      summary = {
        total_days: rows.length,
        total_transactions: rows.reduce((s, r) => s + Number(r.count), 0),
        total_amount: rows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      }

    } else if (type === "dormant") {
      const result = await pool.query(
        `SELECT sa.account_number, sa.available_balance, sa.account_status,
                TO_CHAR(sa.opening_date, 'YYYY-MM-DD') AS opening_date,
                TO_CHAR(MAX(st.transaction_date), 'YYYY-MM-DD') AS last_transaction_date,
                ($2 - MAX(st.transaction_date)) AS days_inactive,
                ss.scheme_name, m.membership_no, c.full_name, c.mobile_no
         FROM savings_accounts sa
         JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
         JOIN memberships m ON m.membership_no::text = sa.membership_no::text AND m.branch_id = sa.branch_id
         JOIN customers c ON c.customer_code = m.customer_code
         LEFT JOIN savings_transactions st ON st.account_number = sa.account_number AND st.branch_id = sa.branch_id
         WHERE sa.branch_id = $1 AND sa.account_status = 'ACTIVE'
         GROUP BY sa.account_number, sa.available_balance, sa.account_status, sa.opening_date,
                  ss.scheme_name, m.membership_no, c.full_name, c.mobile_no
         HAVING MAX(st.transaction_date) IS NULL
             OR MAX(st.transaction_date) < $2 - INTERVAL '180 days'
         ORDER BY days_inactive DESC NULLS FIRST`,
        [branchId, businessDate]
      )
      rows = result.rows
      summary = { total_dormant: rows.length }

    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, rows, count: rows.length, summary })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch report: " + error.message }, { status: 500 })
  }
}
