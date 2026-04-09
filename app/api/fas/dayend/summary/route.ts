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
    // ── 1. Resolve Cash In Hand account codes for this branch ─────────────
    //    Covers the "Cash In Hand" parent and all its children.
    const cashCodesRes = await pool.query(
      `WITH cash_root AS (
         SELECT accountcode
         FROM chart_of_accounts
         WHERE branch_id = $1
           AND accountname ILIKE '%Cash In Hand%'
       )
       SELECT c.accountcode, c.accountname, c.accountbalance
       FROM chart_of_accounts c
       WHERE c.branch_id = $1
         AND (
           c.accountcode IN (SELECT accountcode FROM cash_root)
           OR c.parentaccountcode IN (SELECT accountcode FROM cash_root)
         )`,
      [branchId]
    )
    const cashAccountCodes: number[] = cashCodesRes.rows.map((r: any) => Number(r.accountcode))

    // Current cash balance from chart_of_accounts (closing / live balance)
    const currentCashBalance = cashCodesRes.rows.reduce(
      (s: number, r: any) => s + Number(r.accountbalance || 0), 0
    )

    // ── 2. Opening cash balance ────────────────────────────────────────────
    //    = sealed closing balance from day_end_balances for the most recent
    //      prior business date. Falls back to current balance when no seal exists.
    let openingCashBalance = 0
    if (cashAccountCodes.length > 0) {
      const openingRes = await pool.query(
        `SELECT COALESCE(SUM(closing_balance), 0) AS opening_cash
         FROM day_end_balances
         WHERE branch_id  = $1
           AND accountcode = ANY($2::bigint[])
           AND business_date = (
             SELECT MAX(business_date)
             FROM day_end_balances
             WHERE branch_id = $1
               AND business_date < $3::date
           )`,
        [branchId, cashAccountCodes, businessDate]
      )
      const sealed = Number(openingRes.rows[0]?.opening_cash ?? null)
      // If no prior seal exists, derive opening from closing minus today's net
      openingCashBalance = isNaN(sealed) || openingRes.rows[0]?.opening_cash === null
        ? currentCashBalance  // will be same as closing if no txns today
        : sealed
    }

    // ── 3. Cash receipts (debit to cash accounts from COMPLETED CASH batches today) ──
    let cashReceipts = 0
    let cashPayments = 0
    if (cashAccountCodes.length > 0) {
      const flowRes = await pool.query(
        `SELECT
           COALESCE(SUM(l.debit_amount),  0) AS total_receipts,
           COALESCE(SUM(l.credit_amount), 0) AS total_payments
         FROM gl_batch_lines l
         JOIN gl_batches b
           ON b.branch_id = l.branch_id
          AND b.batch_id  = l.batch_id
         WHERE l.branch_id     = $1
           AND l.business_date = $2::date
           AND b.status        = 'COMPLETED'
           AND b.voucher_type  = 'CASH'
           AND l.accountcode   = ANY($3::bigint[])`,
        [branchId, businessDate, cashAccountCodes]
      )
      cashReceipts = Number(flowRes.rows[0]?.total_receipts || 0)
      cashPayments = Number(flowRes.rows[0]?.total_payments || 0)
    }

    const closingCashBalance = openingCashBalance + cashReceipts - cashPayments

    // ── 4. Pending & unbalanced vouchers ──────────────────────────────────
    const pendingVouchersRes = await pool.query(
      `SELECT COUNT(*) AS pending_count
       FROM gl_batches
       WHERE branch_id = $1 AND status = 'PENDING'`,
      [branchId]
    )
    const unbalancedRes = await pool.query(
      `SELECT COUNT(*) AS unbalanced_count
       FROM (
         SELECT b.batch_id
         FROM gl_batches b
         JOIN gl_batch_lines l
           ON l.branch_id = b.branch_id AND l.batch_id = b.batch_id
         WHERE b.branch_id = $1 AND b.status = 'PENDING'
         GROUP BY b.batch_id
         HAVING ABS(SUM(l.debit_amount) - SUM(l.credit_amount)) > 0.005
       ) t`,
      [branchId]
    )

    // ── 5. Today's transaction counts ─────────────────────────────────────
    const txnCountRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE voucher_type = 'CASH') AS cash_txns,
         COUNT(*) FILTER (WHERE voucher_type = 'TRANSFER') AS transfer_txns,
         COUNT(*) AS total_txns
       FROM gl_batches
       WHERE branch_id = $1
         AND business_date = $2::date
         AND status = 'COMPLETED'`,
      [branchId, businessDate]
    )

    // ── 6. Current day-end session ────────────────────────────────────────
    const dayendRes = await pool.query(
      `SELECT id, status, initiated_at, completed_at, error_message, next_business_date
       FROM dayend_log
       WHERE branch_id = $1 AND business_date = $2
       ORDER BY initiated_at DESC
       LIMIT 1`,
      [branchId, businessDate]
    )

    let steps: any[] = []
    if (dayendRes.rows.length > 0) {
      const stepsRes = await pool.query(
        `SELECT step_name, status, records_processed, started_at, completed_at, error_message
         FROM dayend_step_log
         WHERE dayend_id = $1
         ORDER BY id`,
        [dayendRes.rows[0].id]
      )
      steps = stepsRes.rows
    }

    return NextResponse.json({
      success: true,
      businessDate,

      // Cash position
      openingCashBalance,
      cashReceipts,
      cashPayments,
      closingCashBalance,
      currentCashBalance,
      cashAccounts: cashCodesRes.rows.map((r: any) => ({
        code: Number(r.accountcode),
        name: r.accountname,
        balance: Number(r.accountbalance || 0),
      })),

      // Voucher stats
      pendingVouchers: Number(pendingVouchersRes.rows[0]?.pending_count || 0),
      unbalancedVouchers: Number(unbalancedRes.rows[0]?.unbalanced_count || 0),

      // Transaction counts for today
      cashTransactions: Number(txnCountRes.rows[0]?.cash_txns || 0),
      transferTransactions: Number(txnCountRes.rows[0]?.transfer_txns || 0),
      totalTransactions: Number(txnCountRes.rows[0]?.total_txns || 0),

      // Day-end session
      dayend: dayendRes.rows[0]
        ? {
            id: dayendRes.rows[0].id,
            status: dayendRes.rows[0].status,
            initiatedAt: dayendRes.rows[0].initiated_at,
            completedAt: dayendRes.rows[0].completed_at,
            errorMessage: dayendRes.rows[0].error_message,
            nextBusinessDate: dayendRes.rows[0].next_business_date,
          }
        : null,
      steps,
    })
  } catch (e) {
    console.error("Dayend summary error:", e)
    return NextResponse.json({ error: "Failed to load day-end summary" }, { status: 500 })
  }
}
