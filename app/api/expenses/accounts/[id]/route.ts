import { NextRequest, NextResponse } from 'next/server'
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { id } = await params;
    const accountNumber = id

    // Fetch account details
    const account_details = await pool.query(
      `SELECT * FROM expense_accounts 
        WHERE branch_id = $1 AND account_number = $2`,
      [branchId, accountNumber]
    )
    const account_data = account_details.rows[0]

    if (!account_data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Fetch GL account details
    const gl_account_details = await pool.query(
      `SELECT * FROM chart_of_accounts 
        WHERE branch_id = $1 AND accountcode = $2`,
      [branchId, account_data.gl_account_code]
    )
    const gl_account_data = gl_account_details.rows[0]

    return NextResponse.json({
      ...account_data,
      gl_account: gl_account_data || null,
    })

  } catch (error: any) {
    console.error('Error fetching expense account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expense account' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { id } = await params;
    const accountNumber = id
    const body = await request.json()

    const { account_name, description, account_status } = body

    const result = await pool.query(
      `UPDATE expense_accounts 
       SET account_name = COALESCE($1, account_name),
           description = COALESCE($2, description),
           account_status = COALESCE($3, account_status),
           updated_at = NOW()
       WHERE account_number = $4 AND branch_id = $5
       RETURNING *`,
      [account_name, description, account_status, accountNumber, branchId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error updating expense account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update expense account' },
      { status: 500 }
    )
  }
}
