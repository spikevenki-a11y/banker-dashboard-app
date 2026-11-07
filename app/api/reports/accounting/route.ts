import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "general-ledger"
    const today = new Date().toISOString().split("T")[0]
    const fromDate = searchParams.get("from_date") || today
    const toDate = searchParams.get("to_date") || fromDate

    let rows: any[] = []
    let summary: any = null

    switch (type) {

      case "general-ledger": {
        const { rows: data } = await pool.query(`
          SELECT
            gb.business_date,
            gb.voucher_id      AS voucher_no,
            gb.batch_id,
            gb.voucher_type,
            gb.status,
            gbl.accountcode,
            coa.accountname,
            gbl.narration,
            gbl.debit_amount,
            gbl.credit_amount
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          LEFT JOIN chart_of_accounts coa
            ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
          WHERE gbl.branch_id = $1
            AND gb.business_date BETWEEN $2 AND $3
          ORDER BY gbl.accountcode, gb.business_date, gb.batch_id
        `, [branchId, fromDate, toDate])
        rows = data
        const totDR = data.reduce((s: number, r: any) => s + Number(r.debit_amount || 0), 0)
        const totCR = data.reduce((s: number, r: any) => s + Number(r.credit_amount || 0), 0)
        summary = { totalDebit: totDR, totalCredit: totCR, entries: data.length }
        break
      }

      case "trial-balance": {
        const { rows: data } = await pool.query(`
          SELECT
            gbl.accountcode,
            coa.accountname,
            coa.accounttypecode,
            SUM(gbl.debit_amount)  AS total_debit,
            SUM(gbl.credit_amount) AS total_credit,
            GREATEST(SUM(gbl.debit_amount)  - SUM(gbl.credit_amount), 0) AS net_debit,
            GREATEST(SUM(gbl.credit_amount) - SUM(gbl.debit_amount),  0) AS net_credit
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          LEFT JOIN chart_of_accounts coa
            ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
          WHERE gbl.branch_id = $1
            AND gb.business_date BETWEEN $2 AND $3
          GROUP BY gbl.accountcode, coa.accountname, coa.accounttypecode
          ORDER BY gbl.accountcode
        `, [branchId, fromDate, toDate])
        rows = data
        const totDR = data.reduce((s: number, r: any) => s + Number(r.net_debit || 0), 0)
        const totCR = data.reduce((s: number, r: any) => s + Number(r.net_credit || 0), 0)
        summary = { totalDebit: totDR, totalCredit: totCR }
        break
      }

      case "profit-loss": {
        const { rows: data } = await pool.query(`
          SELECT
            coa.accounttypecode,
            CASE WHEN coa.accounttypecode = 3 THEN 'Income' ELSE 'Expense' END AS category,
            gbl.accountcode,
            coa.accountname,
            SUM(gbl.debit_amount)  AS total_debit,
            SUM(gbl.credit_amount) AS total_credit,
            CASE
              WHEN coa.accounttypecode = 3 THEN SUM(gbl.credit_amount) - SUM(gbl.debit_amount)
              ELSE SUM(gbl.debit_amount) - SUM(gbl.credit_amount)
            END AS net_amount
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          JOIN chart_of_accounts coa
            ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
          WHERE gbl.branch_id = $1
            AND gb.business_date BETWEEN $2 AND $3
            AND coa.accounttypecode IN (3, 4)
          GROUP BY coa.accounttypecode, gbl.accountcode, coa.accountname
          ORDER BY coa.accounttypecode DESC, gbl.accountcode
        `, [branchId, fromDate, toDate])
        rows = data
        const income  = data.filter((r: any) => Number(r.accounttypecode) === 3).reduce((s: number, r: any) => s + Number(r.net_amount || 0), 0)
        const expense = data.filter((r: any) => Number(r.accounttypecode) === 4).reduce((s: number, r: any) => s + Number(r.net_amount || 0), 0)
        summary = { totalIncome: income, totalExpense: expense, netProfit: income - expense }
        break
      }

      case "balance-sheet": {
        const { rows: data } = await pool.query(`
          SELECT
            coa.accounttypecode,
            CASE WHEN coa.accounttypecode = 1 THEN 'Liabilities' ELSE 'Assets' END AS category,
            gbl.accountcode,
            coa.accountname,
            SUM(gbl.debit_amount)  AS total_debit,
            SUM(gbl.credit_amount) AS total_credit,
            CASE
              WHEN coa.accounttypecode = 1 THEN SUM(gbl.credit_amount) - SUM(gbl.debit_amount)
              ELSE SUM(gbl.debit_amount) - SUM(gbl.credit_amount)
            END AS net_amount
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          JOIN chart_of_accounts coa
            ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
          WHERE gbl.branch_id = $1
            AND gb.business_date <= $2
            AND coa.accounttypecode IN (1, 2)
          GROUP BY coa.accounttypecode, gbl.accountcode, coa.accountname
          ORDER BY coa.accounttypecode, gbl.accountcode
        `, [branchId, toDate])
        rows = data
        const assets      = data.filter((r: any) => Number(r.accounttypecode) === 2).reduce((s: number, r: any) => s + Number(r.net_amount || 0), 0)
        const liabilities = data.filter((r: any) => Number(r.accounttypecode) === 1).reduce((s: number, r: any) => s + Number(r.net_amount || 0), 0)
        summary = { totalAssets: assets, totalLiabilities: liabilities }
        break
      }

      case "cash-book": {
        const { rows: data } = await pool.query(`
          SELECT
            gb.business_date,
            gb.voucher_id    AS voucher_no,
            gb.voucher_type,
            gb.status,
            gbl.narration,
            gbl.debit_amount,
            gbl.credit_amount,
            SUM(gbl.debit_amount - gbl.credit_amount) OVER (
              ORDER BY gb.business_date, gb.batch_id
              ROWS UNBOUNDED PRECEDING
            ) AS running_balance
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          WHERE gbl.branch_id = $1
            AND gbl.accountcode = 23100000
            AND gb.business_date BETWEEN $2 AND $3
          ORDER BY gb.business_date, gb.batch_id
        `, [branchId, fromDate, toDate])
        rows = data
        const totDR = data.reduce((s: number, r: any) => s + Number(r.debit_amount || 0), 0)
        const totCR = data.reduce((s: number, r: any) => s + Number(r.credit_amount || 0), 0)
        summary = { totalDebit: totDR, totalCredit: totCR, closingBalance: totDR - totCR }
        break
      }

      case "bank-book": {
        const { rows: data } = await pool.query(`
          SELECT
            gb.business_date,
            gbl.accountcode,
            coa.accountname AS bank_account,
            gb.voucher_id   AS voucher_no,
            gb.voucher_type,
            gb.status,
            gbl.narration,
            gbl.debit_amount,
            gbl.credit_amount
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          LEFT JOIN chart_of_accounts coa
            ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
          WHERE gbl.branch_id = $1
            AND gbl.accountcode BETWEEN 23200000 AND 23299999
            AND gb.business_date BETWEEN $2 AND $3
          ORDER BY gb.business_date, gb.batch_id
        `, [branchId, fromDate, toDate])
        rows = data
        const totDR = data.reduce((s: number, r: any) => s + Number(r.debit_amount || 0), 0)
        const totCR = data.reduce((s: number, r: any) => s + Number(r.credit_amount || 0), 0)
        summary = { totalDebit: totDR, totalCredit: totCR, closingBalance: totDR - totCR }
        break
      }

      case "day-book": {
        // Day Book covers one business date only (?date=YYYY-MM-DD; from_date still accepted)
        const dayDate = searchParams.get("date") || searchParams.get("from_date") || today
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) {
          return NextResponse.json({ error: "Please select a valid date" }, { status: 400 })
        }
        // Passed vouchers only: checker approval (FAS → Verify Voucher) sets COMPLETED;
        // APPROVED / PASSED / POSTED are accepted as the same "passed" state.
        // Pending, Rejected, Cancelled, etc. are excluded here, so totals use passed vouchers only.
        //
        // Lines are grouped under their Parent Head (the posted account's parent in the
        // Chart of Accounts), ordered as the COA tree shows them: depth-first, siblings by
        // account code — the same sequence as Settings → Chart of Accounts.
        const { rows: data } = await pool.query(`
          WITH RECURSIVE coa_tree AS (
            SELECT accountcode, ARRAY[accountcode] AS sort_path
            FROM chart_of_accounts
            WHERE branch_id = $1 AND COALESCE(parentaccountcode, 0) = 0
            UNION ALL
            SELECT c.accountcode, t.sort_path || c.accountcode
            FROM chart_of_accounts c
            JOIN coa_tree t ON c.parentaccountcode = t.accountcode
            WHERE c.branch_id = $1 AND NOT c.accountcode = ANY(t.sort_path)
          )
          SELECT
            gb.business_date,
            gb.batch_id,
            gb.voucher_id  AS voucher_no,
            gb.voucher_type,
            gb.status,
            gbl.accountcode,
            coa.accountname,
            ph.accountcode AS parent_head_code,
            ph.accountname AS parent_head_name,
            gbl.narration,
            gbl.debit_amount,
            gbl.credit_amount
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          LEFT JOIN chart_of_accounts coa
            ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
          LEFT JOIN chart_of_accounts ph
            ON ph.branch_id = gbl.branch_id
           AND ph.accountcode = COALESCE(NULLIF(coa.parentaccountcode, 0), gbl.accountcode)
          LEFT JOIN coa_tree pt ON pt.accountcode = ph.accountcode
          WHERE gbl.branch_id = $1
            AND gb.business_date::date = $2::date
            AND UPPER(TRIM(gb.status)) = ANY($3::text[])
          ORDER BY pt.sort_path NULLS LAST, ph.accountcode NULLS LAST,
                   gb.batch_id, gbl.accountcode
        `, [branchId, dayDate, ["COMPLETED", "APPROVED", "PASSED", "POSTED"]])
        rows = data
        const totDR = data.reduce((s: number, r: any) => s + Number(r.debit_amount || 0), 0)
        const totCR = data.reduce((s: number, r: any) => s + Number(r.credit_amount || 0), 0)
        summary = { totalDebit: totDR, totalCredit: totCR, entries: data.length }
        break
      }

      case "journal": {
        const { rows: data } = await pool.query(`
          SELECT
            gb.business_date,
            gb.batch_id,
            gb.voucher_id  AS voucher_no,
            gb.voucher_type,
            gb.status,
            gb.created_at,
            SUM(gbl.debit_amount)  AS total_debit,
            SUM(gbl.credit_amount) AS total_credit,
            MAX(gbl.narration)     AS narration
          FROM gl_batches gb
          JOIN gl_batch_lines gbl
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          WHERE gb.branch_id = $1
            AND gb.business_date BETWEEN $2 AND $3
          GROUP BY gb.business_date, gb.batch_id, gb.voucher_id, gb.voucher_type, gb.status, gb.created_at
          ORDER BY gb.business_date, gb.batch_id
        `, [branchId, fromDate, toDate])
        rows = data
        const totDR = data.reduce((s: number, r: any) => s + Number(r.total_debit || 0), 0)
        const totCR = data.reduce((s: number, r: any) => s + Number(r.total_credit || 0), 0)
        summary = { totalDebit: totDR, totalCredit: totCR, vouchers: data.length }
        break
      }

      case "expense": {
        const { rows: data } = await pool.query(`
          SELECT
            gb.business_date,
            gb.voucher_id  AS voucher_no,
            gb.voucher_type,
            gbl.accountcode,
            coa.accountname,
            gbl.narration,
            gbl.debit_amount,
            gbl.credit_amount
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          JOIN chart_of_accounts coa
            ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
          WHERE gbl.branch_id = $1
            AND gb.business_date BETWEEN $2 AND $3
            AND coa.accounttypecode = 4
          ORDER BY gb.business_date, gbl.accountcode
        `, [branchId, fromDate, toDate])
        rows = data
        const net = data.reduce((s: number, r: any) => s + Number(r.debit_amount || 0) - Number(r.credit_amount || 0), 0)
        summary = { net, entries: data.length }
        break
      }

      case "income": {
        const { rows: data } = await pool.query(`
          SELECT
            gb.business_date,
            gb.voucher_id  AS voucher_no,
            gb.voucher_type,
            gbl.accountcode,
            coa.accountname,
            gbl.narration,
            gbl.debit_amount,
            gbl.credit_amount
          FROM gl_batch_lines gbl
          JOIN gl_batches gb
            ON gbl.branch_id = gb.branch_id AND gbl.batch_id = gb.batch_id
          JOIN chart_of_accounts coa
            ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
          WHERE gbl.branch_id = $1
            AND gb.business_date BETWEEN $2 AND $3
            AND coa.accounttypecode = 3
          ORDER BY gb.business_date, gbl.accountcode
        `, [branchId, fromDate, toDate])
        rows = data
        const net = data.reduce((s: number, r: any) => s + Number(r.credit_amount || 0) - Number(r.debit_amount || 0), 0)
        summary = { net, entries: data.length }
        break
      }

      default:
        return NextResponse.json({ error: "Unknown report type" }, { status: 400 })
    }

    return NextResponse.json({ rows, summary })
  } catch (err: any) {
    console.error("Accounting report error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
