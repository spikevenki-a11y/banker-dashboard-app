import { NextResponse } from "next/server"
import { pool } from "@/lib/connection/db"

export async function GET() {
  try {
    // Get interest analysis by category
    
    // Savings interest (paid to depositors - expense)
    const savingsInterestQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(et.debit_amount), 0) as interest_paid
      FROM expense_transactions et
      JOIN expense_accounts ea ON et.account_number = ea.account_number
      WHERE ea.account_name ILIKE '%savings%interest%'
        OR et.description ILIKE '%savings%interest%'
    `)

    // FD interest (paid to depositors - expense)
    const fdInterestQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(et.debit_amount), 0) as interest_paid
      FROM expense_transactions et
      JOIN expense_accounts ea ON et.account_number = ea.account_number
      WHERE ea.account_name ILIKE '%deposit%interest%'
        OR ea.account_name ILIKE '%fd%interest%'
        OR et.description ILIKE '%fd%interest%'
        OR et.description ILIKE '%fixed%deposit%interest%'
    `)

    // Loan interest (earned from borrowers - income)
    const loanInterestQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(it.credit_amount), 0) as interest_earned
      FROM income_transactions it
      JOIN income_accounts ia ON it.account_number = ia.account_number
      WHERE ia.account_name ILIKE '%loan%interest%'
        OR it.description ILIKE '%loan%interest%'
    `)

    // Borrowing interest (paid on borrowings - expense)
    const borrowingInterestQuery = await pool.query(`
      SELECT 
        COALESCE(SUM(interest_amount), 0) as interest_paid
      FROM borrowing_transactions
      WHERE interest_amount > 0
    `)

    // Get all income account totals
    const allIncomeQuery = await pool.query(`
      SELECT 
        ia.account_name,
        COALESCE(SUM(it.credit_amount), 0) as total_income
      FROM income_accounts ia
      LEFT JOIN income_transactions it ON ia.account_number = it.account_number
      WHERE ia.account_status = 'active'
      GROUP BY ia.account_name
      ORDER BY total_income DESC
    `)

    // Get all expense account totals
    const allExpenseQuery = await pool.query(`
      SELECT 
        ea.account_name,
        COALESCE(SUM(et.debit_amount), 0) as total_expense
      FROM expense_accounts ea
      LEFT JOIN expense_transactions et ON ea.account_number = et.account_number
      WHERE ea.account_status = 'active'
      GROUP BY ea.account_name
      ORDER BY total_expense DESC
    `)

    const savingsInterestPaid = parseFloat(savingsInterestQuery.rows[0]?.interest_paid || 0)
    const fdInterestPaid = parseFloat(fdInterestQuery.rows[0]?.interest_paid || 0)
    const loanInterestEarned = parseFloat(loanInterestQuery.rows[0]?.interest_earned || 0)
    const borrowingInterestPaid = parseFloat(borrowingInterestQuery.rows[0]?.interest_paid || 0)

    const totalInterestEarned = loanInterestEarned
    const totalInterestPaid = savingsInterestPaid + fdInterestPaid + borrowingInterestPaid
    const netInterest = totalInterestEarned - totalInterestPaid

    const interestData = [
      {
        category: "Savings Interest",
        earned: 0,
        paid: savingsInterestPaid,
        net: -savingsInterestPaid
      },
      {
        category: "FD Interest",
        earned: 0,
        paid: fdInterestPaid,
        net: -fdInterestPaid
      },
      {
        category: "Loan Interest",
        earned: loanInterestEarned,
        paid: 0,
        net: loanInterestEarned
      },
      {
        category: "Borrowing Interest",
        earned: 0,
        paid: borrowingInterestPaid,
        net: -borrowingInterestPaid
      },
      {
        category: "Total",
        earned: totalInterestEarned,
        paid: totalInterestPaid,
        net: netInterest
      }
    ]

    // Revenue breakdown
    const totalIncome = allIncomeQuery.rows.reduce((sum, row) => sum + parseFloat(row.total_income), 0)
    const revenueBreakdown = allIncomeQuery.rows.map(row => {
      const amount = parseFloat(row.total_income)
      return {
        source: row.account_name,
        amount,
        percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
        trend: "up" // Could be calculated from historical data
      }
    }).filter(item => item.amount > 0)

    // Expense breakdown
    const totalExpense = allExpenseQuery.rows.reduce((sum, row) => sum + parseFloat(row.total_expense), 0)
    const expenseBreakdown = allExpenseQuery.rows.map(row => {
      const amount = parseFloat(row.total_expense)
      return {
        source: row.account_name,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
      }
    }).filter(item => item.amount > 0)

    return NextResponse.json({
      interestData,
      totalInterestEarned,
      totalInterestPaid,
      netInterest,
      interestMargin: totalInterestEarned > 0 ? ((netInterest / totalInterestEarned) * 100).toFixed(1) : 0,
      loanInterestEarned,
      fdInterestPaid,
      savingsInterestPaid,
      borrowingInterestPaid,
      revenueBreakdown,
      expenseBreakdown,
      totalIncome,
      totalExpense,
      netRevenue: totalIncome - totalExpense
    })
  } catch (error) {
    console.error("Error fetching interest analysis:", error)
    return NextResponse.json(
      { error: "Failed to fetch interest analysis" },
      { status: 500 }
    )
  }
}
