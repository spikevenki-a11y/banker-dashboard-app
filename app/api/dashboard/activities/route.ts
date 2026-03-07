import { NextResponse } from "next/server"
import { query } from "@/lib/connection/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || "1"
    const limit = searchParams.get("limit") || "10"

    // Get recent activities from multiple transaction tables
    const activitiesQuery = `
      WITH combined_activities AS (
        -- Savings Transactions
        SELECT 
          st.id,
          st.transaction_date as activity_date,
          st.created_at,
          COALESCE(c.full_name, 'Unknown') as member_name,
          CASE 
            WHEN st.transaction_type = 'DEPOSIT' THEN 'Savings Deposit'
            WHEN st.transaction_type = 'WITHDRAWAL' THEN 'Savings Withdrawal'
            WHEN st.transaction_type = 'TRANSFER' THEN 'Fund Transfer'
            ELSE st.transaction_type
          END as action,
          COALESCE(st.debit_amount, 0) + COALESCE(st.credit_amount, 0) as amount,
          st.status,
          'savings' as module
        FROM savings_transactions st
        LEFT JOIN savings_accounts sa ON st.account_number = sa.account_number
        LEFT JOIN memberships m ON sa.membership_no = m.membership_no
        LEFT JOIN customers c ON m.customer_code = c.customer_code
        WHERE st.branch_id = $1

        UNION ALL

        -- Share Transactions
        SELECT 
          mst.id,
          mst.business_date as activity_date,
          mst.created_at,
          COALESCE(c.full_name, 'Unknown') as member_name,
          CASE 
            WHEN mst.credit_amount > 0 THEN 'Share Deposit'
            WHEN mst.debit_amount > 0 THEN 'Share Withdrawal'
            ELSE 'Share Transaction'
          END as action,
          COALESCE(mst.debit_amount, 0) + COALESCE(mst.credit_amount, 0) as amount,
          mst.status,
          'shares' as module
        FROM member_share_transactions mst
        LEFT JOIN memberships m ON mst.membership_no = m.membership_no
        LEFT JOIN customers c ON m.customer_code = c.customer_code
        WHERE mst.branch_id = $1

        UNION ALL

        -- Loan Transactions
        SELECT 
          ltd.id,
          ltd.transaction_date as activity_date,
          ltd.created_at,
          COALESCE(c.full_name, 'Unknown') as member_name,
          CASE 
            WHEN ltd.transaction_type = 'DISBURSEMENT' THEN 'Loan Disbursement'
            WHEN ltd.transaction_type = 'REPAYMENT' THEN 'Loan Repayment'
            WHEN ltd.transaction_type = 'EMI' THEN 'EMI Payment'
            ELSE ltd.transaction_type
          END as action,
          COALESCE(ltd.debit_amount, 0) + COALESCE(ltd.credit_amount, 0) as amount,
          'completed' as status,
          'loans' as module
        FROM loan_transaction_details ltd
        LEFT JOIN loan_applications la ON ltd.loan_account_no = la.reference_no
        LEFT JOIN memberships m ON la.membership_no = m.membership_no::text
        LEFT JOIN customers c ON m.customer_code = c.customer_code
        WHERE ltd.branch_id = $1

        UNION ALL

        -- New Memberships
        SELECT 
          m.id,
          m.join_date as activity_date,
          m.created_at,
          COALESCE(c.full_name, 'Unknown') as member_name,
          'New Membership' as action,
          0 as amount,
          m.status,
          'membership' as module
        FROM memberships m
        LEFT JOIN customers c ON m.customer_code = c.customer_code
        WHERE m.branch_id = $1
      )
      SELECT 
        id,
        activity_date,
        created_at,
        member_name,
        action,
        amount,
        status,
        module
      FROM combined_activities
      ORDER BY created_at DESC
      LIMIT $2
    `

    const activities = await query(activitiesQuery, [branchId, parseInt(limit)])

    // Format the activities with relative time
    const formattedActivities = activities.rows.map((activity: any) => {
      const now = new Date()
      const activityTime = new Date(activity.created_at)
      const diffMs = now.getTime() - activityTime.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      let timeAgo = ""
      if (diffMins < 1) {
        timeAgo = "Just now"
      } else if (diffMins < 60) {
        timeAgo = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
      } else {
        timeAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
      }

      return {
        id: activity.id,
        member: activity.member_name,
        action: activity.action,
        amount: activity.amount > 0 ? `₹${Number(activity.amount).toLocaleString("en-IN")}` : "-",
        time: timeAgo,
        status: activity.status?.toLowerCase() || "completed",
        module: activity.module,
        date: activity.activity_date,
      }
    })

    return NextResponse.json(formattedActivities)
  } catch (error) {
    console.error("Error fetching dashboard activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
