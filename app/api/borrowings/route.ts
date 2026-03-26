import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GET - Fetch borrowing accounts and transactions
export async function GET(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const accountNumber = searchParams.get("accountNumber")
    const status = searchParams.get("status")
    const type = searchParams.get("type") // 'accounts' or 'transactions'

    if (type === "transactions" && accountNumber) {
      // Fetch transactions for a specific account
      const transactions = await pool.query(
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

    if (session.role !== "admin" && branchId) {
      paramCount++
      sql += ` AND bm.branch_id = $${paramCount}`
      params.push(branchId)
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

    const result = await pool.query(sql, params)

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
    
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const userId = session.userId

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
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM borrowing_master WHERE type_of_borrowing = $1`,
        [type_of_borrowing]
      )
      const count = parseInt(countResult.rows[0].count) + 1
      const accountNumber = `${branchId}${"070"}${count.toString().padStart(6, "0")}`

      const result = await pool.query(
        `INSERT INTO borrowing_master (
          account_number, borrowing_head, branch_id, type_of_borrowing,
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
          branchId,
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
          userId
        ]
      )

      return NextResponse.json({
        success: true,
        message: "Borrowing account created successfully",
        account: result.rows[0],
        account_number: accountNumber
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Borrowings POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
