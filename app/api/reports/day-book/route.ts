import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

/**
 * GET /api/reports/day-book?date=YYYY-MM-DD
 *
 * Data for the printed Day Book (Receipt / Payment × Cash / Transfer).
 *
 * Rules
 *  - Passed vouchers only (same statuses as the on-screen Day Book).
 *  - Cash or Transfer comes from gl_batches.voucher_type.
 *  - The cash account's own lines are not listed; they become the
 *    Opening / Closing balance instead.
 *  - Credit to an account = Receipt, Debit = Payment.
 *  - Lines linked to a member account (savings, deposit, loan, share) are grouped
 *    under the posted GL (e.g. "Jewel Loan", "Interest On Jewel Loan") and show
 *    "Mem. No + Name". Other lines are grouped under their Parent Head
 *    (e.g. "Other Incomes") and show the GL account name.
 */

const CASH_GL = 23100000
const PASSED = ["COMPLETED", "APPROVED", "PASSED", "POSTED"]

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const date = new URL(req.url).searchParams.get("date") || ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Please select a valid date" }, { status: 400 })
  }

  try {
    const branchId = session.branch

    const [{ rows: lines }, { rows: [open] }, { rows: [branch] }] = await Promise.all([
      pool.query(
        `
        WITH RECURSIVE coa_tree AS (
          SELECT accountcode, ARRAY[accountcode] AS sort_path
          FROM chart_of_accounts
          WHERE branch_id = $1 AND COALESCE(parentaccountcode, 0) = 0
          UNION ALL
          SELECT c.accountcode, t.sort_path || c.accountcode
          FROM chart_of_accounts c
          JOIN coa_tree t ON c.parentaccountcode = t.accountcode
          WHERE c.branch_id = $1 AND NOT c.accountcode = ANY(t.sort_path)
        ),
        gl_kind AS (
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
          gb.batch_id,
          gb.voucher_id                       AS voucher_no,
          UPPER(TRIM(gb.voucher_type))        AS voucher_type,
          gbl.accountcode,
          coa.accountname,
          gbl.ref_account_id,
          gbl.narration,
          gbl.debit_amount,
          gbl.credit_amount,
          acc.membership_no,
          cu.full_name                        AS member_name,
          ph.accountcode                      AS parent_head_code,
          ph.accountname                      AS parent_head_name,
          CASE WHEN acc.membership_no IS NOT NULL THEN gbl.accountcode ELSE ph.accountcode END AS group_code,
          CASE WHEN acc.membership_no IS NOT NULL THEN coa.accountname ELSE ph.accountname END AS group_name
        FROM gl_batch_lines gbl
        JOIN gl_batches gb
          ON gb.branch_id = gbl.branch_id AND gb.batch_id = gbl.batch_id
        LEFT JOIN chart_of_accounts coa
          ON coa.branch_id = gbl.branch_id AND coa.accountcode = gbl.accountcode
        LEFT JOIN chart_of_accounts ph
          ON ph.branch_id = gbl.branch_id
         AND ph.accountcode = COALESCE(NULLIF(coa.parentaccountcode, 0), gbl.accountcode)
        LEFT JOIN coa_tree atr ON atr.accountcode = gbl.accountcode
        LEFT JOIN coa_tree pt ON pt.accountcode = ph.accountcode
        -- Member behind the line's account number (ref_account_id), by account type
        LEFT JOIN LATERAL (
          SELECT x.membership_no FROM (
            SELECT sa.membership_no::text AS membership_no, 1 AS pri
              FROM savings_accounts sa
             WHERE sa.branch_id = $1 AND sa.account_number = gbl.ref_account_id::text
               AND EXISTS (SELECT 1 FROM gl_kind k WHERE k.gl = gbl.accountcode::text AND k.kind = 'SAVINGS')
            UNION ALL
            SELECT da.membership_no::text, 2
              FROM deposit_account da
             WHERE da.branch_id = $1 AND da.accountnumber = gbl.ref_account_id
               AND EXISTS (SELECT 1 FROM gl_kind k WHERE k.gl = gbl.accountcode::text AND k.kind = 'DEPOSIT')
            UNION ALL
            SELECT la.membership_no::text, 3
              FROM loan_applications la
             WHERE la.branch_id = $1 AND la.loan_application_id = gbl.ref_account_id
               AND EXISTS (SELECT 1 FROM gl_kind k WHERE k.gl = gbl.accountcode::text AND k.kind = 'LOAN')
            UNION ALL
            -- Shares and other member-level postings store the membership number itself
            SELECT m.membership_no::text, 4
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
          AND gb.business_date::date = $2::date
          AND UPPER(TRIM(gb.status)) = ANY($3::text[])
          AND gbl.accountcode <> $4
        ORDER BY
          (CASE WHEN acc.membership_no IS NOT NULL THEN atr.sort_path ELSE pt.sort_path END) NULLS LAST,
          group_code NULLS LAST,
          gb.voucher_id, gb.batch_id, gbl.accountcode
        `,
        [branchId, date, PASSED, CASH_GL]
      ),
      pool.query(
        `SELECT COALESCE(SUM(gbl.debit_amount - gbl.credit_amount), 0)::float8 AS opening
           FROM gl_batch_lines gbl
           JOIN gl_batches gb ON gb.branch_id = gbl.branch_id AND gb.batch_id = gbl.batch_id
          WHERE gbl.branch_id = $1
            AND gbl.accountcode = $2
            AND gb.business_date::date < $3::date
            AND UPPER(TRIM(gb.status)) = ANY($4::text[])`,
        [branchId, CASH_GL, date, PASSED]
      ),
      pool.query(
        `SELECT bank_name, branch_name, to_jsonb(bp) ->> 'region_office' AS region_office
           FROM branchparameters bp WHERE branch_id = $1`,
        [branchId]
      ),
    ])

    // ── Group lines and split into Receipt/Payment × Cash/Transfer ──
    type Line = {
      voucherNo: number | string
      accountNo: string
      particulars: string
      receiptCash: number
      receiptTransfer: number
      paymentCash: number
      paymentTransfer: number
    }
    type Group = { code: string; name: string; lines: Line[] }

    const groups: Group[] = []
    for (const r of lines) {
      const code = String(r.group_code ?? r.accountcode)
      let g = groups[groups.length - 1]
      if (!g || g.code !== code) {
        g = { code, name: r.group_name || r.accountname || "Unmapped Accounts", lines: [] }
        groups.push(g)
      }
      const isCash = r.voucher_type === "CASH"
      const cr = Number(r.credit_amount || 0)
      const dr = Number(r.debit_amount || 0)
      const hasMember = r.membership_no != null
      g.lines.push({
        voucherNo: r.voucher_no,
        accountNo: Number(r.ref_account_id) ? String(r.ref_account_id) : "",
        particulars: hasMember
          ? [r.membership_no, r.member_name].filter(Boolean).join(" ")
          : r.accountname || r.narration || "",
        receiptCash: isCash ? cr : 0,
        receiptTransfer: isCash ? 0 : cr,
        paymentCash: isCash ? dr : 0,
        paymentTransfer: isCash ? 0 : dr,
      })
    }

    const openingBalance = Number(open?.opening || 0)
    const receiptCash = groups.reduce((s, g) => s + g.lines.reduce((a, l) => a + l.receiptCash, 0), 0)
    const paymentCash = groups.reduce((s, g) => s + g.lines.reduce((a, l) => a + l.paymentCash, 0), 0)

    return NextResponse.json({
      date,
      bankName: branch?.bank_name ?? "",
      branchName: branch?.branch_name ?? "",
      regionOffice: branch?.region_office ?? "",
      generatedBy: session.userId,
      groups,
      openingBalance,
      closingBalance: openingBalance + receiptCash - paymentCash,
    })
  } catch (err: any) {
    console.error("Day book print error:", err)
    return NextResponse.json({ error: err.message || "Failed to load day book" }, { status: 500 })
  }
}
