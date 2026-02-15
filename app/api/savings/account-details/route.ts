import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(req.url)
    const accountNumber = searchParams.get("account_number")

    if (!accountNumber) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `SELECT 
        sa.id,
        sa.account_number,
        sa.membership_no,
        sa.scheme_id,
        sa.opening_date,
        sa.available_balance,
        sa.clear_balance,
        sa.unclear_balance,
        sa.interest_rate,
        sa.last_interest_calculated_date,
        sa.account_status,
        sa.account_closed_date,
        sa.created_at,
        sa.updated_at,
        ss.scheme_name,
        ss.scheme_description,
        ss.interest_frequency,
        ss.interest_calculation_method,
        ss.min_balance,
        ss.minimum_deposit,
        ss.maximum_deposit,
        c.full_name,
        c.father_name,
        c.mobile_no,
        c.date_of_birth,
        c.aadhaar_no,
        c.customer_code,
        c.gender,
        c.email,
        c.address_line1,
        c.village,
        c.district,
        c.state,
        c.pincode,
        m.member_type,
        m.membership_class,
        m.join_date
       FROM savings_accounts sa
       JOIN savings_schemes ss ON sa.scheme_id = ss.scheme_id AND sa.branch_id = ss.branch_id
       JOIN memberships m ON sa.membership_no = m.membership_no AND sa.branch_id = m.branch_id
       JOIN customers c ON m.customer_code = c.customer_code
       WHERE sa.account_number = $1 AND sa.branch_id = $2`,
      [accountNumber, branchId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ account: rows[0] })
  } catch (error: any) {
    console.error("Error fetching account details:", error)
    return NextResponse.json({ error: "Failed to fetch account details" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const body = await req.json()

    const { account_number, account_status } = body

    if (!account_number) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }

    const { rowCount } = await pool.query(
      `UPDATE savings_accounts 
       SET account_status = $1, updated_at = NOW()
       WHERE account_number = $2 AND branch_id = $3`,
      [account_status, account_number, branchId]
    )

    if (rowCount === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Account updated successfully" })
  } catch (error: any) {
    console.error("Error updating account:", error)
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
  }
}
