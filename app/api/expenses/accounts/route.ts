import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    // Fetch expense accounts for the branch
    const list_of_accounts = await pool.query(
      `SELECT * FROM expense_accounts 
        WHERE branch_id = $1
        ORDER BY account_number DESC`,
      [branchId]
    )

    return NextResponse.json({ 
      success: true, 
      data: list_of_accounts.rows 
    })
  } catch (error: any) {
    console.error('Error fetching expense accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expense accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const userId = session.userId
    const businessDate = session.businessDate

    const body = await request.json()

    const {
      account_name,
      gl_account_code,
      description
    } = body

    if (!account_name || !gl_account_code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { rows: [countRow] } = await pool.query(
      `SELECT COUNT(*) AS count FROM expense_accounts WHERE branch_id = $1`,
      [branchId]
    )
    const seq = String(parseInt(countRow.count) + 1).padStart(7, "0")
    const accountNumber = `${branchId}${seq}`

    const result = await pool.query(
      `INSERT INTO expense_accounts (
        account_number,
        account_name,
        gl_account_code,
        opening_date,
        closing_date,
        opening_balance,
        current_balance,
        account_status,
        description,
        branch_id,
        created_by
      ) VALUES ($1,$2,$3,$4,NULL,0.00,0.00,'ACTIVE',$5,$6,$7)
      RETURNING *`,
      [accountNumber, account_name, gl_account_code, businessDate, description, branchId, userId]
    )

    const data = result.rows

    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create expense account' },
      { status: 500 }
    )
  }
}
