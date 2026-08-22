import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from 'next/server'
import pool from "@/lib/connection/db"

const UPDATABLE_FIELDS = [
  "account_name",
  "gl_account_code",
  "opening_date",
  "closing_date",
  "opening_balance",
  "current_balance",
  "account_status",
  "description",
]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      
      const session = await getSession()
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      const branchId = session.branch
      const userId = session.userId

    
    const { id } = await params;
    const accountNumber = id
    console.log("Fetching details for account number:", accountNumber)


    // Fetch account details
    const account_details = await pool.query(
      `SELECT * FROM income_accounts 
        WHERE 
         branch_id = $1
         and account_number = $2`,
        [branchId, accountNumber]
    )
    const account_data = account_details.rows[0]
    console.log("Fetched account data:", account_data)
    if (!account_data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    
    // Fetch GL account details
    const gl_account_details = await pool.query(
      `SELECT * FROM chart_of_accounts 
        WHERE 
         branch_id = $1
         and accountcode = $2`,
        [branchId, account_data.gl_account_code]
    )
    const gl_account_data = gl_account_details.rows[0]

    return NextResponse.json({
      ...account_data,
      gl_account: gl_account_data || null,
    })

  } catch (error: any) {
    console.error('Error fetching income account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch income account' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountNumber = params.id
    const body = await request.json()

    const keys = UPDATABLE_FIELDS.filter((field) => field in body)
    if (keys.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ")
    const values = keys.map((key) => body[key])

    const result = await pool.query(
      `UPDATE income_accounts SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE account_number = $${keys.length + 1}
       RETURNING *`,
      [...values, accountNumber]
    )

    const updatedAccount = result.rows[0]
    if (!updatedAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json(updatedAccount)
  } catch (error: any) {
    console.error('Error updating income account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update income account' },
      { status: 500 }
    )
  }
}
