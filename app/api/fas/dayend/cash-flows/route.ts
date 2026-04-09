import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function GET() {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const branchId = u.branch
  const businessDate: string = u.businessDate

  try {
    // ── Resolve Cash In Hand account codes ────────────────────────────────
    const cashCodesRes = await pool.query(
      `WITH cash_root AS (
         SELECT accountcode
         FROM chart_of_accounts
         WHERE branch_id = $1
           AND accountname ILIKE '%Cash In Hand%'
       )
       SELECT accountcode
       FROM chart_of_accounts
       WHERE branch_id = $1
         AND (
           accountcode IN (SELECT accountcode FROM cash_root)
           OR parentaccountcode IN (SELECT accountcode FROM cash_root)
         )`,
      [branchId]
    )
    const cashCodes: number[] = cashCodesRes.rows.map((r: any) => Number(r.accountcode))

    if (cashCodes.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // ── Fetch all cash-side GL lines for today ────────────────────────────
    // Each row = one cash account movement.
    // We also fetch the counter-account lines from the same batch.
    const { rows } = await pool.query(
      `SELECT
         l.id,
         l.batch_id,
         b.voucher_id,
         b.voucher_type,
         b.status        AS batch_status,
         l.business_date,
         l.accountcode   AS cash_accountcode,
         ca.accountname  AS cash_accountname,
         l.debit_amount  AS cash_debit,
         l.credit_amount AS cash_credit,
         l.narration,

         -- Counter-account: opposite side of the same batch
         -- When multiple counter lines exist, aggregate them
         (
           SELECT STRING_AGG(DISTINCT ca2.accountname, ', ')
           FROM gl_batch_lines l2
           JOIN chart_of_accounts ca2
             ON ca2.accountcode = l2.accountcode AND ca2.branch_id = l2.branch_id
           WHERE l2.branch_id = l.branch_id
             AND l2.batch_id  = l.batch_id
             AND l2.accountcode != l.accountcode
         ) AS counter_account_names,

         (
           SELECT COALESCE(SUM(l2.debit_amount), 0)
           FROM gl_batch_lines l2
           WHERE l2.branch_id = l.branch_id
             AND l2.batch_id  = l.batch_id
             AND l2.accountcode != l.accountcode
         ) AS counter_debit,

         (
           SELECT COALESCE(SUM(l2.credit_amount), 0)
           FROM gl_batch_lines l2
           WHERE l2.branch_id = l.branch_id
             AND l2.batch_id  = l.batch_id
             AND l2.accountcode != l.accountcode
         ) AS counter_credit,

         su.full_name   AS maker_name,
         su.employee_code AS maker_emp_code,
         b.approved_at

       FROM gl_batch_lines l
       JOIN gl_batches b
         ON b.branch_id = l.branch_id AND b.batch_id = l.batch_id
       JOIN chart_of_accounts ca
         ON ca.accountcode = l.accountcode AND ca.branch_id = l.branch_id
       LEFT JOIN staff_users su
         ON su.id = b.maker_id
       WHERE l.branch_id     = $1
         AND l.business_date = $2::date
         AND b.voucher_type  = 'CASH'
         AND b.status        = 'COMPLETED'
         AND l.accountcode   = ANY($3::bigint[])
       ORDER BY b.batch_id, l.id`,
      [branchId, businessDate, cashCodes]
    )

    const data = rows.map((r: any) => {
      const isReceipt = Number(r.cash_debit) > 0  // DR Cash = money received
      return {
        id: r.id,
        batchId: Number(r.batch_id),
        voucherId: Number(r.voucher_id),
        voucherType: r.voucher_type,
        businessDate: r.business_date,
        flowType: isReceipt ? "RECEIPT" : "PAYMENT",
        cashAccountCode: Number(r.cash_accountcode),
        cashAccountName: r.cash_accountname,
        amount: isReceipt ? Number(r.cash_debit) : Number(r.cash_credit),
        counterAccountNames: r.counter_account_names || "—",
        narration: r.narration || "—",
        makerName: r.maker_name || "N/A",
        makerEmpCode: r.maker_emp_code || "",
        approvedAt: r.approved_at,
      }
    })

    // ── Totals ────────────────────────────────────────────────────────────
    const totalReceipts = data.filter((d) => d.flowType === "RECEIPT").reduce((s, d) => s + d.amount, 0)
    const totalPayments = data.filter((d) => d.flowType === "PAYMENT").reduce((s, d) => s + d.amount, 0)

    return NextResponse.json({
      success: true,
      businessDate,
      totalReceipts,
      totalPayments,
      data,
    })
  } catch (e) {
    console.error("Cash flows error:", e)
    return NextResponse.json({ error: "Failed to load cash flows" }, { status: 500 })
  }
}
