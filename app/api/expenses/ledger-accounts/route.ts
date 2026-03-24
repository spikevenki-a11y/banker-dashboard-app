import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    // Get ledger accounts for expenses (parent account code for expenses is 33000000)
    const ledger_accounts = await pool.query(
      `SELECT accountcode, accountname FROM chart_of_accounts 
        WHERE parentaccountcode = 33000000
        AND isledger = '1'
        AND branch_id = $1
        ORDER BY accountcode DESC`,
      [branchId]
    )

    return NextResponse.json({ 
      success: true, 
      accounts: ledger_accounts.rows 
    })
  } catch (error: any) {
    console.error("Expenses GET Ledger Accounts error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
