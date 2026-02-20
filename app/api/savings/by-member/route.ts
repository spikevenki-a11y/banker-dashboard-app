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
    const membershipNo = searchParams.get("membership_no")

    if (!membershipNo) {
      return NextResponse.json({ error: "Membership number is required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `SELECT 
        sa.account_number,
        sa.available_balance,
        sa.clear_balance,
        sa.unclear_balance,
        sa.account_status,
        sa.opening_date,
        sa.interest_rate,
        ss.scheme_name
       FROM savings_accounts sa
       JOIN savings_schemes ss ON sa.scheme_id = ss.scheme_id AND sa.branch_id = ss.branch_id
       WHERE sa.membership_no = $1 AND sa.branch_id = $2
       ORDER BY sa.opening_date DESC`,
      [membershipNo, branchId]
    )

    return NextResponse.json({ success: true, accounts: rows })
  } catch (error: any) {
    console.error("Error fetching member savings accounts:", error)
    return NextResponse.json({ error: "Failed to fetch savings accounts" }, { status: 500 })
  }
}
