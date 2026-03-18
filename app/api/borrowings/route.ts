import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

// GET - Fetch borrowing accounts and transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountNumber = searchParams.get("accountNumber")
    const status = searchParams.get("status")
    const type = searchParams.get("type") // 'accounts' or 'transactions'

    if (type === "transactions" && accountNumber) {
      // Fetch transactions for a specific account
      const transactions = await query(
        `SELECT * FROM borrowing_transactions 
         WHERE account_number = $1 
         ORDER BY transaction_date DESC, created_date DESC`,
        [accountNumber]
      )

      return NextResponse.json({ 
        success: true, 
        transactions: transactions.rows 
      })
    }

    // Fetch all borrowing accounts
    let sql = `
      SELECT 
        bm.*,
        COALESCE(
          (SELECT SUM(drawal_amount) - SUM(repayment_amount) 
           FROM borrowing_transactions 
           WHERE account_number = bm.account_number AND status = 'COMPLETED'),
          0
        ) as outstanding_balance
      FROM borrowing_master bm
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 0

    if (session.user.role !== "admin" && session.user.branch_id) {
      paramCount++
      sql += ` AND bm.branch_id = $${paramCount}`
      params.push(session.user.branch_id)
    }

    if (status && status !== "all") {
      paramCount++
      sql += ` AND bm.status = $${paramCount}`
      params.push(status)
    }

    if (accountNumber) {
      paramCount++
      sql += ` AND bm.account_number ILIKE $${paramCount}`
      params.push(`%${accountNumber}%`)
    }

    sql += ` ORDER BY bm.created_date DESC`

    const result = await query(sql, params)

    return NextResponse.json({ 
      success: true, 
      accounts: result.rows 
    })
  } catch (error: any) {
    console.error("Borrowings GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create borrowing account or transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === "open_account") {
      // Open new borrowing account
      const {
        borrowing_agency,
        type_of_borrowing,
        description,
        amount_sanctioned,
        date_of_sanction,
        purpose,
        rate_of_interest,
        number_of_installments,
        installment_months,
        moratorium_months,
        installment_amount,
        installment_start_date,
        repayment_type,
        repayment_start_date,
        reference_number,
        moratorium_interest
      } = body

      if (!type_of_borrowing || !amount_sanctioned || !date_of_sanction) {
        return NextResponse.json({ 
          error: "Missing required fields: type_of_borrowing, amount_sanctioned, date_of_sanction" 
        }, { status: 400 })
      }

      // Generate account number
      const prefix = type_of_borrowing === "cash_credit" ? "CC" : "BL"
      const countResult = await query(
        `SELECT COUNT(*) as count FROM borrowing_master WHERE type_of_borrowing = $1`,
        [type_of_borrowing]
      )
      const count = parseInt(countResult.rows[0].count) + 1
      const accountNumber = `${prefix}${count.toString().padStart(6, "0")}`

      const result = await query(
        `INSERT INTO borrowing_master (
          account_number, borrowing_agency, branch_id, type_of_borrowing,
          description, amount_sanctioned, ledger_balance, date_of_sanction, purpose,
          rate_of_interest, interest_payable, moratorium_interest,
          number_of_installments, installment_months, moratorium_months,
          installment_amount, installment_start_date, repayment_type,
          repayment_start_date, reference_number, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *`,
        [
          accountNumber,
          borrowing_agency || null,
          session.user.branch_id,
          type_of_borrowing,
          description || null,
          amount_sanctioned,
          0, // Initial ledger balance
          date_of_sanction,
          purpose || null,
          rate_of_interest || 0,
          0, // Initial interest payable
          moratorium_interest || false,
          number_of_installments || null,
          installment_months || null,
          moratorium_months || 0,
          installment_amount || null,
          installment_start_date || null,
          repayment_type || "MONTHLY",
          repayment_start_date || null,
          reference_number || null,
          "ACTIVE",
          session.user.username
        ]
      )

      return NextResponse.json({
        success: true,
        message: "Borrowing account created successfully",
        account: result.rows[0],
        account_number: accountNumber
      })
    }

    if (action === "drawal") {
      // Record a drawal (drawdown)
      const { account_number, drawal_amount, transaction_date, voucher_no } = body

      if (!account_number || !drawal_amount || !transaction_date) {
        return NextResponse.json({ 
          error: "Missing required fields: account_number, drawal_amount, transaction_date" 
        }, { status: 400 })
      }

      // Get account details
      const accountResult = await query(
        `SELECT * FROM borrowing_master WHERE account_number = $1`,
        [account_number]
      )

      if (accountResult.rows.length === 0) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }

      const account = accountResult.rows[0]
      const newBalance = parseFloat(account.ledger_balance || 0) + parseFloat(drawal_amount)

      // Check if drawal exceeds sanctioned amount
      if (newBalance > parseFloat(account.amount_sanctioned)) {
        return NextResponse.json({ 
          error: `Drawal amount exceeds sanctioned limit. Available: ${account.amount_sanctioned - (account.ledger_balance || 0)}` 
        }, { status: 400 })
      }

      // Insert transaction
      const txnResult = await query(
        `INSERT INTO borrowing_transactions (
          branch_id, transaction_date, voucher_no, transaction_type,
          account_number, drawal_amount, ledger_balance_amount, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          session.user.branch_id,
          transaction_date,
          voucher_no || null,
          "drawal",
          account_number,
          drawal_amount,
          newBalance,
          "COMPLETED",
          session.user.username
        ]
      )

      // Update account balance
      await query(
        `UPDATE borrowing_master SET ledger_balance = $1 WHERE account_number = $2`,
        [newBalance, account_number]
      )

      return NextResponse.json({
        success: true,
        message: "Drawal recorded successfully",
        transaction: txnResult.rows[0],
        new_balance: newBalance
      })
    }

    if (action === "repayment") {
      // Record a repayment
      const {
        account_number,
        transaction_date,
        voucher_no,
        repayment_amount,
        principal_amount,
        interest_amount,
        charge_amount,
        iod_amount,
        penal_interest_amount
      } = body

      if (!account_number || !repayment_amount || !transaction_date) {
        return NextResponse.json({ 
          error: "Missing required fields: account_number, repayment_amount, transaction_date" 
        }, { status: 400 })
      }

      // Get account details
      const accountResult = await query(
        `SELECT * FROM borrowing_master WHERE account_number = $1`,
        [account_number]
      )

      if (accountResult.rows.length === 0) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }

      const account = accountResult.rows[0]
      
      // Calculate principal if not provided (after interest deductions)
      const totalDeductions = (parseFloat(interest_amount) || 0) + 
                             (parseFloat(charge_amount) || 0) + 
                             (parseFloat(iod_amount) || 0) + 
                             (parseFloat(penal_interest_amount) || 0)
      const principalPaid = principal_amount || (parseFloat(repayment_amount) - totalDeductions)
      
      const newBalance = parseFloat(account.ledger_balance || 0) - principalPaid

      // Insert transaction
      const txnResult = await query(
        `INSERT INTO borrowing_transactions (
          branch_id, transaction_date, voucher_no, transaction_type,
          account_number, repayment_amount, charge_amount, iod_amount,
          penal_interest_amount, interest_amount, ledger_balance_amount,
          last_interest_paid_date, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          session.user.branch_id,
          transaction_date,
          voucher_no || null,
          "repayment",
          account_number,
          repayment_amount,
          charge_amount || 0,
          iod_amount || 0,
          penal_interest_amount || 0,
          interest_amount || 0,
          newBalance,
          transaction_date,
          "COMPLETED",
          session.user.username
        ]
      )

      // Update account balance and interest paid date
      const newStatus = newBalance <= 0 ? "CLOSED" : "ACTIVE"
      await query(
        `UPDATE borrowing_master 
         SET ledger_balance = $1, status = $2 
         WHERE account_number = $3`,
        [Math.max(0, newBalance), newStatus, account_number]
      )

      return NextResponse.json({
        success: true,
        message: "Repayment recorded successfully",
        transaction: txnResult.rows[0],
        new_balance: Math.max(0, newBalance),
        principal_paid: principalPaid,
        interest_paid: interest_amount || 0,
        account_status: newStatus
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Borrowings POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
