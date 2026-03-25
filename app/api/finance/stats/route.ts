import { NextResponse } from "next/server"
import { pool } from "@/lib/connection/db"

export async function GET() {
  try {
    // Get total deposits (savings + fixed deposits)
    const depositsQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(sa.clear_balance), 0) as savings_total,
        COALESCE((SELECT SUM(da.clearbalance) FROM deposit_account da WHERE da.accountstatus = 1), 0) as fd_total
      FROM savings_accounts sa 
      WHERE sa.account_status = 'active'
    `)

    const savingsTotal = parseFloat(depositsQuery.rows[0]?.savings_total || 0)
    const fdTotal = parseFloat(depositsQuery.rows[0]?.fd_total || 0)
    const totalDeposits = savingsTotal + fdTotal

    // Get total outstanding loans
    const loansQuery = await pool.query(`
      SELECT COALESCE(SUM(loan_outstanding), 0) as total_loans
      FROM loan_applications
      WHERE application_status IN ('disbursed', 'active')
    `)
    const totalLoans = parseFloat(loansQuery.rows[0]?.total_loans || 0)

    // Get interest earned (from income accounts - loan interest, etc.)
    const interestEarnedQuery = await pool.query(`
      SELECT COALESCE(SUM(credit_amount), 0) as interest_earned
      FROM income_transactions
      WHERE description ILIKE '%interest%'
    `)
    const interestEarned = parseFloat(interestEarnedQuery.rows[0]?.interest_earned || 0)

    // Get interest paid (from expense accounts - FD interest, savings interest, etc.)
    const interestPaidQuery = await pool.query(`
      SELECT COALESCE(SUM(debit_amount), 0) as interest_paid
      FROM expense_transactions
      WHERE description ILIKE '%interest%'
    `)
    const interestPaid = parseFloat(interestPaidQuery.rows[0]?.interest_paid || 0)

    // Get income by category
    const incomeByCategory = await pool.query(`
      SELECT 
        ia.account_name,
        ia.current_balance,
        COALESCE(SUM(it.credit_amount), 0) as total_income
      FROM income_accounts ia
      LEFT JOIN income_transactions it ON ia.account_number = it.account_number
      WHERE ia.account_status = 'active'
      GROUP BY ia.account_number, ia.account_name, ia.current_balance
      ORDER BY total_income DESC
    `)

    // Get expenses by category
    const expensesByCategory = await pool.query(`
      SELECT 
        ea.account_name,
        ea.current_balance,
        COALESCE(SUM(et.debit_amount), 0) as total_expense
      FROM expense_accounts ea
      LEFT JOIN expense_transactions et ON ea.account_number = et.account_number
      WHERE ea.account_status = 'active'
      GROUP BY ea.account_number, ea.account_name, ea.current_balance
      ORDER BY total_expense DESC
    `)

    // Get monthly trends (last 12 months)
    const monthlyTrends = await pool.query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE - interval '11 months'),
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) as month
      ),
      monthly_deposits AS (
        SELECT 
          date_trunc('month', transaction_date) as month,
          SUM(credit_amount) as deposits
        FROM savings_transactions
        WHERE transaction_date >= CURRENT_DATE - interval '12 months'
        GROUP BY date_trunc('month', transaction_date)
      ),
      monthly_income AS (
        SELECT 
          date_trunc('month', transaction_date) as month,
          SUM(credit_amount) as income
        FROM income_transactions
        WHERE transaction_date >= CURRENT_DATE - interval '12 months'
        GROUP BY date_trunc('month', transaction_date)
      ),
      monthly_expenses AS (
        SELECT 
          date_trunc('month', transaction_date) as month,
          SUM(debit_amount) as expenses
        FROM expense_transactions
        WHERE transaction_date >= CURRENT_DATE - interval '12 months'
        GROUP BY date_trunc('month', transaction_date)
      )
      SELECT 
        to_char(m.month, 'Mon') as month_name,
        COALESCE(md.deposits, 0) as deposits,
        COALESCE(mi.income, 0) as income,
        COALESCE(me.expenses, 0) as expenses
      FROM months m
      LEFT JOIN monthly_deposits md ON m.month = md.month
      LEFT JOIN monthly_income mi ON m.month = mi.month
      LEFT JOIN monthly_expenses me ON m.month = me.month
      ORDER BY m.month
    `)

    // Get loan disbursements for monthly trend
    const loanDisbursements = await pool.query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE - interval '11 months'),
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) as month
      )
      SELECT 
        to_char(m.month, 'Mon') as month_name,
        COALESCE(SUM(ltd.debit_amount), 0) as loans_disbursed
      FROM months m
      LEFT JOIN loan_transaction_details ltd ON date_trunc('month', ltd.transaction_date) = m.month
        AND ltd.transaction_type = 'disbursement'
      GROUP BY m.month
      ORDER BY m.month
    `)

    // Portfolio distribution
    const portfolioQuery = await pool.query(`
      SELECT 
        'Savings Accounts' as name, 
        COALESCE(SUM(clear_balance), 0)::numeric as value,
        'hsl(var(--chart-1))' as color
      FROM savings_accounts WHERE account_status = 'active'
      UNION ALL
      SELECT 
        'Fixed Deposits' as name, 
        COALESCE(SUM(clearbalance), 0)::numeric as value,
        'hsl(var(--chart-2))' as color
      FROM deposit_account WHERE accountstatus = 1
      UNION ALL
      SELECT 
        'Active Loans' as name, 
        COALESCE(SUM(loan_outstanding), 0)::numeric as value,
        'hsl(var(--chart-3))' as color
      FROM loan_applications WHERE application_status IN ('disbursed', 'active')
    `)

    // Get today's transactions summary
    const todayTransactions = await pool.query(`
      SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(credit_amount), 0) as total_credits,
        COALESCE(SUM(debit_amount), 0) as total_debits
      FROM gl_batch_lines
      WHERE business_date = CURRENT_DATE
    `)

    // Combine monthly trends
    const monthlyData = monthlyTrends.rows.map((row, index) => ({
      month: row.month_name,
      deposits: parseFloat(row.deposits),
      loans: parseFloat(loanDisbursements.rows[index]?.loans_disbursed || 0),
      income: parseFloat(row.income),
      expenses: parseFloat(row.expenses),
      revenue: parseFloat(row.income) - parseFloat(row.expenses)
    }))

    return NextResponse.json({
      stats: {
        totalDeposits,
        savingsTotal,
        fdTotal,
        totalLoans,
        interestEarned,
        interestPaid,
        netInterestIncome: interestEarned - interestPaid,
        interestMargin: interestEarned > 0 ? ((interestEarned - interestPaid) / interestEarned * 100).toFixed(1) : 0
      },
      monthlyData,
      portfolioData: portfolioQuery.rows.map(row => ({
        name: row.name,
        value: parseFloat(row.value),
        color: row.color
      })).filter(item => item.value > 0),
      incomeByCategory: incomeByCategory.rows.map(row => ({
        name: row.account_name,
        balance: parseFloat(row.current_balance),
        total: parseFloat(row.total_income)
      })),
      expensesByCategory: expensesByCategory.rows.map(row => ({
        name: row.account_name,
        balance: parseFloat(row.current_balance),
        total: parseFloat(row.total_expense)
      })),
      todaysSummary: {
        transactionCount: parseInt(todayTransactions.rows[0]?.transaction_count || 0),
        totalCredits: parseFloat(todayTransactions.rows[0]?.total_credits || 0),
        totalDebits: parseFloat(todayTransactions.rows[0]?.total_debits || 0)
      }
    })
  } catch (error) {
    console.error("Error fetching finance stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch finance statistics" },
      { status: 500 }
    )
  }
}
