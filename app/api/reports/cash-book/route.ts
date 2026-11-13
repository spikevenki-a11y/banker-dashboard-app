import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

/**
 * GET /api/reports/cash-book?from=YYYY-MM-DD&to=YYYY-MM-DD   (to optional)
 *
 * Data for the printed Cash Book: one section per business date that has
 * cash vouchers, each with its own Opening / Closing cash balance.
 *
 * Rules
 *  - Passed CASH vouchers only (gl_batches.voucher_type = 'CASH').
 *  - The cash account's own lines are not listed; every other line of the
 *    voucher is one row. Credit = Receipt, Debit = Payment.
 *  - Opening balance = passed cash GL movement before the date.
 *  - Type: Saving / Deposit / Loan / Share for member accounts, otherwise taken
 *    from the GL's parent head (Inc., Exp., S.Cr, S.Dr, Borr. …) or "Oth.".
 */

const CASH_GL = 23100000
const PASSED = ["COMPLETED", "APPROVED", "PASSED", "POSTED"]
const MAX_DAYS = 31

// Parent heads used by the app's modules → short Type label
const HEAD_TYPE: Record<string, string> = {
  "32000000": "Inc.",   // Income
  "43000000": "Exp.",   // Expenses
  "14000000": "S.Cr",   // Sundry Creditors
  "25000000": "S.Dr",   // Sundry Debtors
  "13000000": "Borr.",  // Borrowings
  "15000000": "R&F",    // Reserve and Fund
  "16000000": "Grant",  // Grants and Subsidies
  "17000000": "Prov.",  // Provisions
  "18000000": "O.Li",   // Other Liabilities
  "22000000": "Inv.",   // Investments
  "26000000": "O.As",   // Other Assets
}
const KIND_TYPE: Record<string, string> = { SAVINGS: "Saving", DEPOSIT: "Deposit", LOAN: "Loan", SHARE: "Share" }

const iso = (d: unknown) => {
  if (d instanceof Date) {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }
  return String(d).slice(0, 10)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const from = sp.get("from") || sp.get("date") || ""
  const to = sp.get("to") || from
  const ok = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
  if (!ok(from) || !ok(to)) return NextResponse.json({ error: "Please select a valid date" }, { status: 400 })
  if (to < from) return NextResponse.json({ error: "To date must be on or after From date" }, { status: 400 })
  if ((Date.parse(to) - Date.parse(from)) / 86400000 >= MAX_DAYS) {
    return NextResponse.json({ error: `Please print at most ${MAX_DAYS} days at a time` }, { status: 400 })
  }

  try {
    const branchId = session.branch

    const [{ rows: lines }, { rows: [open] }, { rows: [branch] }] = await Promise.all([
      pool.query(
        `
        WITH gl_kind AS (
          SELECT savings_gl_account::text         AS gl, 'SAVINGS' AS kind FROM savings_schemes WHERE branch_id = $1
          UNION SELECT interest_paid_gl_account::text,    'SAVINGS' FROM savings_schemes WHERE branch_id = $1
          UNION SELECT deposit_gl_account::text,          'DEPOSIT' FROM deposit_schemes WHERE branch_id = $1
          UNION SELECT interest_payable_gl_account::text, 'DEPOSIT' FROM deposit_schemes WHERE branch_id = $1
          UNION SELECT interest_expense_gl_account::text, 'DEPOSIT' FROM deposit_schemes WHERE branch_id = $1
          UNION SELECT loan_gl_account::text,                'LOAN' FROM loan_schemes WHERE branch_id = $1
          UNION SELECT interest_income_gl_account::text,     'LOAN' FROM loan_schemes WHERE branch_id = $1
          UNION SELECT interest_receivable_gl_account::text, 'LOAN' FROM loan_schemes WHERE branch_id = $1
        )
        SELECT
          gb.business_date,
          gb.batch_id,
          gb.voucher_id                AS voucher_no,
          gbl.accountcode,
          coa.accountname,
          coa.accounttypecode,
          COALESCE(NULLIF(coa.parentaccountcode, 0), gbl.accountcode) AS parent_head_code,
          gbl.ref_account_id,
          gbl.narration,
          gbl.debit_amount,
          gbl.credit_amount,
          acc.membership_no,
          acc.kind,
          cu.full_name                 AS member_name
        FROM gl_batch_lines gbl
        JOIN gl_batches gb
          ON gb.branch_id = gbl.branch_id AND gb.batch_id = gbl.batch_id
        LEFT JOIN chart_of_accounts coa
          ON coa.branch_id = gbl.branch_id AND coa.accountcode = gbl.accountcode
        -- Member behind the line's account number (ref_account_id), by account type
        LEFT JOIN LATERAL (
          SELECT x.membership_no, x.kind FROM (
            SELECT sa.membership_no::text AS membership_no, 'SAVINGS' AS kind, 1 AS pri
              FROM savings_accounts sa
             WHERE sa.branch_id = $1 AND sa.account_number = gbl.ref_account_id::text
               AND EXISTS (SELECT 1 FROM gl_kind k WHERE k.gl = gbl.accountcode::text AND k.kind = 'SAVINGS')
            UNION ALL
            SELECT da.membership_no::text, 'DEPOSIT', 2
              FROM deposit_account da
             WHERE da.branch_id = $1 AND da.accountnumber = gbl.ref_account_id
               AND EXISTS (SELECT 1 FROM gl_kind k WHERE k.gl = gbl.accountcode::text AND k.kind = 'DEPOSIT')
            UNION ALL
            SELECT la.membership_no::text, 'LOAN', 3
              FROM loan_applications la
             WHERE la.branch_id = $1 AND la.loan_application_id = gbl.ref_account_id
               AND EXISTS (SELECT 1 FROM gl_kind k WHERE k.gl = gbl.accountcode::text AND k.kind = 'LOAN')
            UNION ALL
            -- Shares and other member-level postings store the membership number itself
            SELECT m.membership_no::text, 'SHARE', 4
              FROM memberships m
             WHERE m.branch_id = $1 AND m.membership_no::text = gbl.ref_account_id::text
               AND NOT EXISTS (SELECT 1 FROM gl_kind k WHERE k.gl = gbl.accountcode::text)
          ) x
          ORDER BY x.pri
          LIMIT 1
        ) acc ON gbl.ref_account_id <> 0
        LEFT JOIN memberships mm
          ON mm.branch_id = $1 AND mm.membership_no::text = acc.membership_no
        LEFT JOIN customers cu ON cu.customer_code = mm.customer_code
        WHERE gbl.branch_id = $1
          AND gb.business_date::date BETWEEN $2::date AND $3::date
          AND UPPER(TRIM(gb.status)) = ANY($4::text[])
          AND UPPER(TRIM(gb.voucher_type)) = 'CASH'
          AND gbl.accountcode <> $5
        ORDER BY gb.business_date, gb.voucher_id, gb.batch_id, gbl.accountcode
        `,
        [branchId, from, to, PASSED, CASH_GL]
      ),
      pool.query(
        `SELECT COALESCE(SUM(gbl.debit_amount - gbl.credit_amount), 0)::float8 AS opening
           FROM gl_batch_lines gbl
           JOIN gl_batches gb ON gb.branch_id = gbl.branch_id AND gb.batch_id = gbl.batch_id
          WHERE gbl.branch_id = $1
            AND gbl.accountcode = $2
            AND gb.business_date::date < $3::date
            AND UPPER(TRIM(gb.status)) = ANY($4::text[])`,
        [branchId, CASH_GL, from, PASSED]
      ),
      pool.query(
        `SELECT bank_name, branch_name, to_jsonb(bp) ->> 'region_office' AS region_office
           FROM branchparameters bp WHERE branch_id = $1`,
        [branchId]
      ),
    ])

    type Line = {
      voucherNo: number | string
      type: string
      accountNo: string
      particulars: string
      receipt: number
      payment: number
    }
    type Day = { date: string; openingBalance: number; closingBalance: number; lines: Line[] }

    const days: Day[] = []
    let balance = Number(open?.opening || 0)

    for (const r of lines) {
      const date = iso(r.business_date)
      let day = days[days.length - 1]
      if (!day || day.date !== date) {
        day = { date, openingBalance: balance, closingBalance: balance, lines: [] }
        days.push(day)
      }
      const receipt = Number(r.credit_amount || 0)
      const payment = Number(r.debit_amount || 0)
      const type =
        (r.kind && KIND_TYPE[r.kind]) ||
        HEAD_TYPE[String(r.parent_head_code)] ||
        (Number(r.accounttypecode) === 3 ? "Inc." : Number(r.accounttypecode) === 4 ? "Exp." : "Oth.")

      day.lines.push({
        voucherNo: r.voucher_no,
        type,
        accountNo: r.membership_no != null && Number(r.ref_account_id) ? String(r.ref_account_id) : "",
        particulars: r.membership_no != null ? r.member_name || r.accountname || "" : r.accountname || r.narration || "",
        receipt,
        payment,
      })
      balance += receipt - payment
      day.closingBalance = balance
    }

    // Nothing in the period: still print the first date with its balance
    if (days.length === 0) days.push({ date: from, openingBalance: balance, closingBalance: balance, lines: [] })

    return NextResponse.json({
      bankName: branch?.bank_name ?? "",
      branchName: branch?.branch_name ?? "",
      regionOffice: branch?.region_office ?? "",
      generatedBy: session.userId,
      days,
    })
  } catch (err: any) {
    console.error("Cash book print error:", err)
    return NextResponse.json({ error: err.message || "Failed to load cash book" }, { status: 500 })
  }
}
