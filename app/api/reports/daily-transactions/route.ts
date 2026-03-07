import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "25")
    const transactionType = searchParams.get("transactionType") || "ALL"
    const paymentMethod = searchParams.get("paymentMethod") || "ALL"

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: "From date and to date are required" }, { status: 400 })
    }

    const offset = (page - 1) * pageSize

    // Build where clause for filters
    let typeFilter = ""
    if (transactionType !== "ALL") {
      typeFilter = `AND transaction_type = '${transactionType}'`
    }

    let paymentFilter = ""
    if (paymentMethod !== "ALL") {
      paymentFilter = `AND voucher_type = '${paymentMethod}'`
    }

    // Combined query for all transaction types (savings, shares, loans, deposits)
    const query = `
      WITH all_transactions AS (
        -- Savings Transactions
        SELECT 
          st.id,
          st.voucher_no as transaction_id,
          st.transaction_date as date,
          st.transaction_type,
          st.voucher_type as payment_method,
          COALESCE(st.debit_amount, 0) as debit_amount,
          COALESCE(st.credit_amount, 0) as credit_amount,
          st.status,
          st.narration,
          st.account_number,
          'SAVINGS' as module,
          c.full_name as customer_name,
          st.created_at
        FROM savings_transactions st
        LEFT JOIN savings_accounts sa ON sa.account_number = st.account_number
        LEFT JOIN memberships m ON m.membership_no = sa.membership_no AND m.branch_id = st.branch_id
        LEFT JOIN customers c ON c.customer_code = m.customer_code
        WHERE st.branch_id = $1 
          AND st.transaction_date BETWEEN $2 AND $3
          ${typeFilter}
          ${paymentFilter}

        UNION ALL

        -- Share Transactions
        SELECT 
          mst.id,
          mst.voucher_no as transaction_id,
          mst.business_date as date,
          mst.voucher_type as transaction_type,
          mst.voucher_type as payment_method,
          COALESCE(mst.debit_amount, 0) as debit_amount,
          COALESCE(mst.credit_amount, 0) as credit_amount,
          mst.status,
          mst.narration,
          mst.membership_no::text as account_number,
          'SHARES' as module,
          c.full_name as customer_name,
          mst.created_at
        FROM member_share_transactions mst
        LEFT JOIN memberships m ON m.membership_no = mst.membership_no AND m.branch_id = mst.branch_id
        LEFT JOIN customers c ON c.customer_code = m.customer_code
        WHERE mst.branch_id = $1 
          AND mst.business_date BETWEEN $2 AND $3
          ${paymentMethod !== "ALL" ? `AND mst.voucher_type = '${paymentMethod}'` : ""}

        UNION ALL

        -- Loan Transactions
        SELECT 
          ltd.id,
          ltd.voucher_no as transaction_id,
          ltd.transaction_date as date,
          ltd.transaction_type,
          'TRANSFER' as payment_method,
          COALESCE(ltd.debit_amount, 0) as debit_amount,
          COALESCE(ltd.credit_amount, 0) as credit_amount,
          'APPROVED' as status,
          ltd.remarks as narration,
          ltd.loan_account_no as account_number,
          'LOANS' as module,
          c.full_name as customer_name,
          ltd.created_at
        FROM loan_transaction_details ltd
        LEFT JOIN loan_applications la ON la.loan_application_id::text = REGEXP_REPLACE(ltd.loan_account_no, '[^0-9]', '', 'g')
        LEFT JOIN memberships m ON m.membership_no::text = la.membership_no AND m.branch_id = ltd.branch_id
        LEFT JOIN customers c ON c.customer_code = m.customer_code
        WHERE ltd.branch_id = $1 
          AND ltd.transaction_date BETWEEN $2 AND $3
      )
      SELECT 
        id,
        transaction_id,
        date,
        transaction_type,
        payment_method,
        debit_amount,
        credit_amount,
        status,
        narration,
        account_number,
        module,
        customer_name,
        created_at
      FROM all_transactions
      ORDER BY date DESC, created_at DESC
      LIMIT $4 OFFSET $5
    `

    const countQuery = `
      WITH all_transactions AS (
        SELECT st.id
        FROM savings_transactions st
        WHERE st.branch_id = $1 
          AND st.transaction_date BETWEEN $2 AND $3
          ${typeFilter}
          ${paymentFilter}

        UNION ALL

        SELECT mst.id
        FROM member_share_transactions mst
        WHERE mst.branch_id = $1 
          AND mst.business_date BETWEEN $2 AND $3
          ${paymentMethod !== "ALL" ? `AND mst.voucher_type = '${paymentMethod}'` : ""}

        UNION ALL

        SELECT ltd.id
        FROM loan_transaction_details ltd
        WHERE ltd.branch_id = $1 
          AND ltd.transaction_date BETWEEN $2 AND $3
      )
      SELECT COUNT(*) as total FROM all_transactions
    `

    const totalsQuery = `
      WITH all_transactions AS (
        SELECT 
          COALESCE(st.debit_amount, 0) as debit_amount,
          COALESCE(st.credit_amount, 0) as credit_amount
        FROM savings_transactions st
        WHERE st.branch_id = $1 
          AND st.transaction_date BETWEEN $2 AND $3
          ${typeFilter}
          ${paymentFilter}

        UNION ALL

        SELECT 
          COALESCE(mst.debit_amount, 0) as debit_amount,
          COALESCE(mst.credit_amount, 0) as credit_amount
        FROM member_share_transactions mst
        WHERE mst.branch_id = $1 
          AND mst.business_date BETWEEN $2 AND $3
          ${paymentMethod !== "ALL" ? `AND mst.voucher_type = '${paymentMethod}'` : ""}

        UNION ALL

        SELECT 
          COALESCE(ltd.debit_amount, 0) as debit_amount,
          COALESCE(ltd.credit_amount, 0) as credit_amount
        FROM loan_transaction_details ltd
        WHERE ltd.branch_id = $1 
          AND ltd.transaction_date BETWEEN $2 AND $3
      )
      SELECT 
        COALESCE(SUM(debit_amount), 0) as total_debit,
        COALESCE(SUM(credit_amount), 0) as total_credit,
        COUNT(*) as total_count
      FROM all_transactions
    `

    const [transactionsResult, countResult, totalsResult] = await Promise.all([
      pool.query(query, [branchId, fromDate, toDate, pageSize, offset]),
      pool.query(countQuery, [branchId, fromDate, toDate]),
      pool.query(totalsQuery, [branchId, fromDate, toDate]),
    ])

    const transactions = transactionsResult.rows.map(row => ({
      id: row.id,
      transactionId: row.transaction_id || "N/A",
      date: row.date,
      customerName: row.customer_name || "Unknown",
      accountNumber: row.account_number,
      transactionType: row.transaction_type,
      paymentMethod: row.payment_method || "N/A",
      debitAmount: parseFloat(row.debit_amount) || 0,
      creditAmount: parseFloat(row.credit_amount) || 0,
      status: row.status,
      narration: row.narration,
      module: row.module,
    }))

    const total = parseInt(countResult.rows[0]?.total || "0")
    const totals = {
      totalDebit: parseFloat(totalsResult.rows[0]?.total_debit) || 0,
      totalCredit: parseFloat(totalsResult.rows[0]?.total_credit) || 0,
      totalTransactions: parseInt(totalsResult.rows[0]?.total_count) || 0,
    }

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      totals,
    })
  } catch (error) {
    console.error("Failed to fetch daily transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
