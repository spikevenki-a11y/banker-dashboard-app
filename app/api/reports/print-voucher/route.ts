import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"

type VoucherMember = {
  membershipNo: string
  name: string
  fatherName: string
  accountNo: string
  /** Account balance right after this voucher, or null when it can't be found. */
  postBalance: number | null
}

/**
 * The member a voucher belongs to, found from the first line that refers to an account
 * (gl_batch_lines.ref_account_id): a savings account, a deposit account, a loan
 * (loan_application_id) or, for share vouchers, the membership number itself. The
 * post-transaction balance comes from that account's transaction row for this voucher.
 * Returns null for vouchers with no member account (e.g. pure GL entries).
 */
async function resolveMember(
  refs: string[],
  ctx: { batchId: number | string; voucherNo: number | string; date: string; branchId: unknown }
): Promise<VoucherMember | null> {
  const candidates = [...new Set(refs.map((r) => r.trim()).filter((r) => r && r !== "0"))]

  for (const ref of candidates) {
    try {
      let membershipNo: string | null = null
      let postBalance: number | null = null

      const savings = await pool.query(
        `SELECT sa.membership_no::text AS membership_no,
                (SELECT st.running_balance FROM savings_transactions st
                  WHERE st.account_number = sa.account_number AND st.gl_batch_id::text = $2::text
                  ORDER BY st.created_at DESC LIMIT 1) AS post_balance
           FROM savings_accounts sa
          WHERE sa.account_number = $1
          LIMIT 1`,
        [ref, ctx.batchId]
      )
      if (savings.rows[0]) {
        membershipNo = savings.rows[0].membership_no
        postBalance = savings.rows[0].post_balance
      }

      if (!membershipNo) {
        const deposit = await pool.query(
          `SELECT da.membership_no::text AS membership_no,
                  (SELECT dt.running_balance FROM deposit_transactions dt
                    WHERE dt.accountnumber::text = da.accountnumber::text AND dt.gl_batch_id::text = $2::text
                    ORDER BY dt.created_at DESC LIMIT 1) AS post_balance
             FROM deposit_account da
            WHERE da.accountnumber::text = $1
            LIMIT 1`,
          [ref, ctx.batchId]
        )
        if (deposit.rows[0]) {
          membershipNo = deposit.rows[0].membership_no
          postBalance = deposit.rows[0].post_balance
        }
      }

      if (!membershipNo) {
        const loan = await pool.query(
          `SELECT la.membership_no::text AS membership_no,
                  (SELECT ltd.balance_after_transaction FROM loan_transaction_details ltd
                    WHERE ltd.loan_account_no = $1 AND ltd.branch_id = la.branch_id
                      AND ltd.voucher_no::text = $2::text AND ltd.transaction_date = $3
                    ORDER BY ltd.created_at DESC LIMIT 1) AS post_balance
             FROM loan_applications la
            WHERE la.loan_application_id::text = $1 AND la.branch_id = $4
            LIMIT 1`,
          [ref, ctx.voucherNo, ctx.date, ctx.branchId]
        )
        if (loan.rows[0]) {
          membershipNo = loan.rows[0].membership_no
          postBalance = loan.rows[0].post_balance
        }
      }

      // Share vouchers carry the membership number itself
      const { rows } = await pool.query(
        `SELECT m.membership_no::text AS membership_no, c.full_name, c.father_name
           FROM memberships m
           LEFT JOIN customers c ON c.customer_code = m.customer_code
          WHERE m.membership_no::text = $1
          LIMIT 1`,
        [membershipNo ?? ref]
      )
      if (!rows[0]) continue

      return {
        membershipNo: rows[0].membership_no,
        name: rows[0].full_name || "",
        fatherName: rows[0].father_name || "",
        accountNo: membershipNo ? ref : "",
        postBalance: postBalance == null ? null : parseFloat(postBalance as unknown as string),
      }
    } catch (error) {
      // Member details are a nicety on the voucher; never fail the print because of them
      console.error("Print voucher: failed to resolve member for", ref, error)
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const voucherNo = searchParams.get("voucherNo")
    const date = searchParams.get("date")

    if (!voucherNo || !date) {
      return NextResponse.json(
        { error: "Voucher number and date are required" },
        { status: 400 }
      )
    }

    // Fetch the GL batch (voucher header)
    const { rows: batchRows } = await pool.query(
      `SELECT 
         gb.id,
         gb.batch_id,
         gb.voucher_id,
         gb.voucher_type,
         gb.business_date,
         gb.status,
         gb.maker_id,
         gb.checker_id,
         gb.created_at,
         gb.approved_at,
         su_maker.full_name AS maker_name,
         su_maker.employee_code AS maker_emp_code,
         su_checker.full_name AS checker_name,
         su_checker.employee_code AS checker_emp_code
       FROM gl_batches gb
       LEFT JOIN staff_users su_maker ON su_maker.id = gb.maker_id
       LEFT JOIN staff_users su_checker ON su_checker.id = gb.checker_id
       WHERE gb.voucher_id = $1
         AND gb.business_date = $2
         AND gb.branch_id = $3`,
      [parseInt(voucherNo), date, branchId]
    )

    if (batchRows.length === 0) {
      return NextResponse.json(
        { error: "Voucher not found for the given date and number" },
        { status: 404 }
      )
    }

    const batch = batchRows[0]

    // if (batch.status !== "COMPLETED" && batch.status !== "APPROVED") {
    //   return NextResponse.json(
    //     {
    //       error: `Transaction is not completed. Current status: ${batch.status}`,
    //       status: batch.status,
    //     },
    //     { status: 400 }
    //   )
    // }

    // Fetch all GL batch lines for this voucher
    const { rows: lineRows } = await pool.query(
      `SELECT 
         gbl.id,
         gbl.accountcode,
         gbl.ref_account_id,
         gbl.debit_amount,
         gbl.credit_amount,
         gbl.narration,
         gbl.created_by,
         coa.accountname
       FROM gl_batch_lines gbl
       LEFT JOIN chart_of_accounts coa 
         ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
       WHERE gbl.batch_id = $1
         AND gbl.business_date = $2
         AND gbl.branch_id = $3
       ORDER BY gbl.created_at ASC`,
      [batch.batch_id, date, branchId]
    )

    if (lineRows.length === 0) {
      return NextResponse.json(
        { error: "No transaction lines found for this voucher" },
        { status: 404 }
      )
    }

    // Fetch branch details for the header
    const { rows: branchRows } = await pool.query(
      `SELECT branch_name, bank_name, address, city, state, postal_code, phone_number, email
       FROM branchparameters
       WHERE branch_id = $1`,
      [branchId]
    )

    const branch = branchRows[0] || {}

    const member = await resolveMember(
      lineRows.map((l: any) => String(l.ref_account_id ?? "")),
      { batchId: batch.batch_id, voucherNo: batch.voucher_id, date, branchId }
    )

    // Calculate totals
    const totalDebit = lineRows.reduce(
      (sum: number, l: any) => sum + parseFloat(l.debit_amount || "0"),
      0
    )
    const totalCredit = lineRows.reduce(
      (sum: number, l: any) => sum + parseFloat(l.credit_amount || "0"),
      0
    )

    return NextResponse.json({
      voucher: {
        voucherNo: batch.voucher_id,
        batchId: batch.batch_id,
        voucherType: batch.voucher_type,
        businessDate: batch.business_date,
        status: batch.status,
        createdAt: batch.created_at,
        approvedAt: batch.approved_at,
        makerName: batch.maker_name || "N/A",
        makerEmpCode: batch.maker_emp_code || "",
        checkerName: batch.checker_name || "N/A",
        checkerEmpCode: batch.checker_emp_code || "",
      },
      lines: lineRows.map((l: any) => ({
        id: l.id,
        accountCode: l.accountcode,
        accountName: l.accountname || "Unknown Account",
        refAccountId: l.ref_account_id,
        debitAmount: parseFloat(l.debit_amount || "0"),
        creditAmount: parseFloat(l.credit_amount || "0"),
        narration: l.narration,
      })),
      totals: {
        totalDebit,
        totalCredit,
      },
      member,
      branch: {
        branchName: branch.branch_name || "Branch",
        bankName: branch.bank_name || "Bank",
        address: branch.address || "",
        city: branch.city || "",
        state: branch.state || "",
        postalCode: branch.postal_code || "",
        phone: branch.phone_number || "",
        email: branch.email || "",
      },
    })
  } catch (error: any) {
    console.error("Failed to fetch voucher:", error)
    return NextResponse.json(
      { error: "Failed to fetch voucher details" },
      { status: 500 }
    )
  }
}
