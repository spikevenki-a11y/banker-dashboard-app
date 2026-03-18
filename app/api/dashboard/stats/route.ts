import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {

    
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const { searchParams } = new URL(request.url)
    // const branchId = searchParams.get("branchId") || "1"

    // Get total members count
      const client = await pool.connect()
    const membersResult = await client.query(
      `SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_members
      FROM memberships WHERE branch_id = $1`,
      [branchId]
    )

    // Get active loans count
    const loansResult = await client.query(
      `SELECT COUNT(*) as active_loans 
      FROM loan_applications 
      WHERE branch_id = $1 AND application_status IN ('APPROVED', 'DISBURSED', 'ACTIVE')`,
      [branchId]
    )

    // Get total deposits (savings + fixed deposits)
    const savingsResult = await client.query(
      `SELECT COALESCE(SUM(clear_balance), 0) as total_savings 
      FROM savings_accounts 
      WHERE branch_id = $1 AND account_status = 'Active'`,
      [branchId]
    )

    const depositsResult = await client.query(
      `SELECT COALESCE(SUM(clearbalance), 0) as total_deposits 
      FROM deposit_account 
      WHERE branch_id = $1 AND accountstatus = 1`,
      [branchId]
    )

    // Get fixed deposits count
    const fdResult = await client.query(
      `SELECT COUNT(*) as fd_count 
      FROM deposit_account 
      WHERE branch_id = $1 AND accountstatus = 1 AND deposittype = 'FD'`,
      [branchId]
    )

    // Get share capital
    const shareResult = await client.query(
      `SELECT COALESCE(SUM(share_balance), 0) as total_shares 
      FROM member_shares 
      WHERE branch_id = $1 AND status = 'Active'`,
      [branchId]
    )

    // Get today's transactions count
    const todayTransactionsResult = await client.query(
      `SELECT 
        (SELECT COUNT(*) FROM savings_transactions WHERE branch_id = $1 AND transaction_date = CURRENT_DATE) +
        (SELECT COUNT(*) FROM member_share_transactions WHERE branch_id = $1 AND business_date = CURRENT_DATE) +
        (SELECT COUNT(*) FROM loan_transaction_details WHERE branch_id = $1 AND transaction_date = CURRENT_DATE) as today_transactions`,
      [branchId]
    )

    // Get pending vouchers count
    const pendingVouchersResult = await client.query(
      `SELECT COUNT(*) as pending_vouchers 
      FROM gl_batches 
      WHERE branch_id = $1 AND status = 'pending'`,
      [branchId]
    )

    const totalMembers = parseInt(membersResult.rows[0]?.total_members || "0")
    const activeMembers = parseInt(membersResult.rows[0]?.active_members || "0")
    const activeLoans = parseInt(loansResult.rows[0]?.active_loans || "0")
    const totalSavings = parseFloat(savingsResult.rows[0]?.total_savings || "0")
    const totalDeposits = parseFloat(depositsResult.rows[0]?.total_deposits || "0")
    const fdCount = parseInt(fdResult.rows[0]?.fd_count || "0")
    const totalShares = parseFloat(shareResult.rows[0]?.total_shares || "0")
    const todayTransactions = parseInt(todayTransactionsResult.rows[0]?.today_transactions || "0")
    const pendingVouchers = parseInt(pendingVouchersResult.rows[0]?.pending_vouchers || "0")

    const totalDepositsAmount = totalSavings + totalDeposits

    return NextResponse.json({
      totalMembers,
      activeMembers,
      activeLoans,
      totalDeposits: totalDepositsAmount,
      fdCount,
      totalShares,
      todayTransactions,
      pendingVouchers,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
