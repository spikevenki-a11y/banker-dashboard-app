import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const result = await pool.query(
      `SELECT * FROM provisions_master WHERE branch_id = $1 ORDER BY account_number DESC`,
      [branchId]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error: any) {
    console.error("Provisions GET Accounts error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
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
    const { account_name, parent_account_number, description } = body

    if (!account_name || !parent_account_number) {
      return NextResponse.json(
        { error: "Missing required fields: account_name, parent_account_number" },
        { status: 400 }
      )
    }

    const { rows: [countRow] } = await pool.query(
      `SELECT COUNT(*) AS count FROM provisions_master WHERE branch_id = $1`,
      [branchId]
    )
    const seq = String(parseInt(countRow.count) + 1).padStart(7, "0")
    const accountNumber = `${branchId}${seq}`

    const result = await pool.query(
      `INSERT INTO provisions_master (
          branch_id, parent_account_number, account_number,
          account_name, account_description, account_opened_date,
          ledger_balance, clear_balance, unclear_balance,
          account_status, account_closed_date, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,0.00,0.00,0.00,'ACTIVE',NULL,$7)
        RETURNING *`,
      [branchId, parent_account_number, accountNumber, account_name, description || null, businessDate, userId]
    )

    return NextResponse.json({ data: result.rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error("Provisions POST Account error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
