import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"

// Member's assets & liabilities, from the MEMBER's point of view:
//   assets      = what the member holds with the bank (savings, deposits, share capital)
//   liabilities = what the member owes the bank (loans outstanding)
// Used by Members → View Member and the member popups on other screens.

// deposit_account.deposittype values seen in the data → display type
const DEPOSIT_TYPES: Record<string, string> = {
  TERM: "Term Deposit",
  T: "Term Deposit",
  RECURING: "Recurring Deposit",
  RECURRING: "Recurring Deposit",
  R: "Recurring Deposit",
  PIGMY: "Pigmy Deposit",
  P: "Pigmy Deposit",
}

// Accounts that no longer hold money / owe money are left out of the totals
const CLOSED_STATUSES = ["CLOSED", "PREMATURE CLOSURE", "PREMATURE CLOSED", "REJECTED", "INACTIVE"]
const isOpen = (status: string) => !CLOSED_STATUSES.includes(String(status || "").toUpperCase())

const round2 = (n: number) => Math.round(n * 100) / 100

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch

    const { searchParams } = new URL(req.url)
    const membershipNo = (searchParams.get("membership_no") || "").trim()

    if (!membershipNo) {
      return NextResponse.json({ error: "Membership number is required" }, { status: 400 })
    }

    const [savingsResult, depositsResult, sharesResult, loansResult] = await Promise.all([
      // 1. Savings accounts
      pool.query(
        `SELECT
           sa.account_number,
           sa.available_balance,
           sa.account_status,
           TO_CHAR(sa.opening_date, 'YYYY-MM-DD') AS opening_date,
           TO_CHAR(sa.account_closed_date, 'YYYY-MM-DD') AS close_date,
           sa.interest_rate,
           ss.scheme_name
         FROM savings_accounts sa
         LEFT JOIN savings_schemes ss ON sa.scheme_id = ss.scheme_id AND sa.branch_id = ss.branch_id
         WHERE CAST(sa.membership_no AS TEXT) = $1 AND sa.branch_id = $2
         ORDER BY sa.opening_date DESC`,
        [membershipNo, branchId]
      ),

      // 2. Deposit accounts — Term, Recurring, Pigmy
      pool.query(
        `SELECT
           da.accountnumber,
           da.deposittype,
           da.clearbalance,
           da.accountstatus,
           ras.account_status_name,
           TO_CHAR(da.accountopendate, 'YYYY-MM-DD') AS opening_date,
           TO_CHAR(da.accountclosedate, 'YYYY-MM-DD') AS close_date,
           da.rateofinterest,
           ds.scheme_name,
           td.depositamount AS td_deposit_amount,
           TO_CHAR(td.maturitydate, 'YYYY-MM-DD') AS td_maturity_date,
           td.maturityamount AS td_maturity_amount,
           rd.installment_amount AS rd_installment_amount,
           TO_CHAR(rd.maturitydate, 'YYYY-MM-DD') AS rd_maturity_date,
           rd.maturityamount AS rd_maturity_amount,
           rd.numberofinstallments AS rd_total_installments,
           rd.numberofinstalmentspaid AS rd_paid_installments,
           pd.minimum_daily_amount AS pd_daily_amount
         FROM deposit_account da
         LEFT JOIN ref_account_status ras ON ras.account_status_id = da.accountstatus
         LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
         LEFT JOIN term_deposit_details td ON td.accountnumber = da.accountnumber
         LEFT JOIN recurring_deposit_details rd ON rd.accountnumber = da.accountnumber
         LEFT JOIN pigmy_deposit_details pd ON pd.accountnumber = da.accountnumber
         WHERE CAST(da.membership_no AS TEXT) = $1 AND da.branch_id = $2
         ORDER BY da.accountopendate DESC NULLS LAST`,
        [membershipNo, branchId]
      ),

      // 3. Share capital
      pool.query(
        `SELECT
           ms.membership_no,
           ms.share_balance,
           ms.status,
           TO_CHAR(ms.share_opened_date, 'YYYY-MM-DD') AS opening_date,
           TO_CHAR(ms.closing_date, 'YYYY-MM-DD') AS close_date
         FROM member_shares ms
         WHERE CAST(ms.membership_no AS TEXT) = $1 AND ms.branch_id = $2`,
        [membershipNo, branchId]
      ),

      // 4. Loans — disbursed loans (active, overdue or closed)
      pool.query(
        `SELECT
           la.loan_application_id,
           la.reference_no,
           la.application_status,
           la.loan_outstanding,
           lsch.scheme_name,
           lsch.loan_type,
           lsd.sanctioned_amount,
           lsd.interest_rate,
           lsd.loan_tenure_months,
           lsd.payment_amount AS emi_amount,
           TO_CHAR(lsd.sanction_date, 'YYYY-MM-DD') AS sanction_date,
           disb.disbursed_on,
           sched.overdue_installments,
           sched.next_due_date
         FROM loan_applications la
         LEFT JOIN loan_sanction_details lsd
           ON lsd.loan_application_id = la.loan_application_id AND lsd.branch_id = la.branch_id
         LEFT JOIN LATERAL (
           SELECT scheme_name, loan_type FROM loan_schemes s
           WHERE s.scheme_id = la.scheme_id
           ORDER BY (s.branch_id = la.branch_id) DESC
           LIMIT 1
         ) lsch ON true
         LEFT JOIN LATERAL (
           SELECT TO_CHAR(MIN(transaction_date), 'YYYY-MM-DD') AS disbursed_on
           FROM loan_transaction_details
           WHERE CAST(loan_account_no AS TEXT) = CAST(la.loan_application_id AS TEXT)
             AND branch_id = la.branch_id AND transaction_type = 'DISBURSEMENT'
         ) disb ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*) FILTER (WHERE payment_status = 'OVERDUE')::int AS overdue_installments,
                  TO_CHAR(MIN(due_date) FILTER (WHERE payment_status IN ('PENDING', 'OVERDUE')), 'YYYY-MM-DD') AS next_due_date
           FROM loan_repayment_schedule_details
           WHERE CAST(loan_account_no AS TEXT) = CAST(la.loan_application_id AS TEXT)
         ) sched ON true
         WHERE CAST(la.membership_no AS TEXT) = $1 AND la.branch_id = $2
           AND UPPER(la.application_status) IN ('ACTIVE', 'OVERDUE', 'CLOSED')
         ORDER BY la.loan_application_id DESC`,
        [membershipNo, branchId]
      ),
    ])

    // ── Assets ────────────────────────────────────────────────
    const assets: any[] = []

    savingsResult.rows.forEach((row) => {
      assets.push({
        account_type: "Savings",
        account_number: String(row.account_number),
        scheme_name: row.scheme_name || "Savings Account",
        balance: Number(row.available_balance || 0),
        status: String(row.account_status || "ACTIVE").toUpperCase(),
        opening_date: row.opening_date,
        close_date: row.close_date,
        interest_rate: Number(row.interest_rate || 0),
        extra: null,
      })
    })

    depositsResult.rows.forEach((row) => {
      const code = String(row.deposittype || "").toUpperCase()
      const type = DEPOSIT_TYPES[code] || row.deposittype
      let extra: any = null
      if (type === "Term Deposit") {
        extra = {
          deposit_amount: Number(row.td_deposit_amount || 0),
          maturity_date: row.td_maturity_date,
          maturity_amount: Number(row.td_maturity_amount || 0),
        }
      } else if (type === "Recurring Deposit") {
        extra = {
          installment_amount: Number(row.rd_installment_amount || 0),
          maturity_date: row.rd_maturity_date,
          maturity_amount: Number(row.rd_maturity_amount || 0),
          total_installments: row.rd_total_installments,
          paid_installments: row.rd_paid_installments,
        }
      } else if (type === "Pigmy Deposit") {
        extra = { daily_amount: Number(row.pd_daily_amount || 0) }
      }

      assets.push({
        account_type: type,
        account_number: String(row.accountnumber),
        scheme_name: row.scheme_name || type,
        balance: Number(row.clearbalance || 0),
        status: String(row.account_status_name || "ACTIVE").toUpperCase(),
        opening_date: row.opening_date,
        close_date: row.close_date,
        interest_rate: Number(row.rateofinterest || 0),
        extra,
      })
    })

    sharesResult.rows.forEach((row) => {
      assets.push({
        account_type: "Share Capital",
        account_number: `SH-${row.membership_no}`,
        scheme_name: "Member Shares",
        balance: Number(row.share_balance || 0),
        status: String(row.status || "ACTIVE").toUpperCase(),
        opening_date: row.opening_date,
        close_date: row.close_date,
        interest_rate: 0,
        extra: null,
      })
    })

    // ── Liabilities (loans) ───────────────────────────────────
    const liabilities: any[] = loansResult.rows.map((row) => {
      const status = String(row.application_status || "").toUpperCase()
      const outstanding = status === "CLOSED" ? 0 : Math.max(0, Number(row.loan_outstanding || 0))
      return {
        account_type: "Loan",
        account_number: String(row.loan_application_id),
        scheme_name: row.scheme_name || row.loan_type || "Loan",
        balance: outstanding,
        status,
        opening_date: row.disbursed_on || row.sanction_date,
        close_date: null,
        interest_rate: Number(row.interest_rate || 0),
        extra: {
          reference_no: row.reference_no,
          loan_type: row.loan_type,
          sanctioned_amount: Number(row.sanctioned_amount || 0),
          emi_amount: Number(row.emi_amount || 0),
          tenure_months: row.loan_tenure_months,
          overdue_installments: row.overdue_installments || 0,
          next_due_date: row.next_due_date,
        },
      }
    })

    // ── Summary (open accounts only) ──────────────────────────
    const totalAssets = round2(assets.filter((a) => isOpen(a.status)).reduce((s, a) => s + a.balance, 0))
    const totalLiabilities = round2(liabilities.filter((l) => isOpen(l.status)).reduce((s, l) => s + l.balance, 0))

    return NextResponse.json({
      success: true,
      assets,
      liabilities,
      summary: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: round2(totalAssets - totalLiabilities),
        total_accounts: assets.length + liabilities.length,
      },
    })
  } catch (error: any) {
    console.error("Error fetching member accounts:", error)
    return NextResponse.json({ error: "Failed to fetch member accounts" }, { status: 500 })
  }
}
