import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

// GET: Fetch loan transactions
export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const loanAccountNo = searchParams.get("loanAccountNo")
    const transactionType = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = `
      SELECT * FROM loan_transaction_details 
      WHERE branch_id = $1
    `
    const params: any[] = [branchId]

    if (loanAccountNo) {
      params.push(loanAccountNo)
      query += ` AND loan_account_no = $${params.length}`
    }

    if (transactionType) {
      params.push(transactionType.toUpperCase())
      query += ` AND transaction_type = $${params.length}`
    }

    query += ` ORDER BY transaction_date DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const { rows: transactions } = await pool.query(query, params)

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM loan_transaction_details WHERE branch_id = $1`
    const countParams: any[] = [branchId]
    
    if (loanAccountNo) {
      countParams.push(loanAccountNo)
      countQuery += ` AND loan_account_no = $${countParams.length}`
    }

    const { rows: countResult } = await pool.query(countQuery, countParams)

    return NextResponse.json({
      transactions,
      total: parseInt(countResult[0]?.total || "0"),
    })
  } catch (error: any) {
    console.error("Failed to fetch loan transactions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
