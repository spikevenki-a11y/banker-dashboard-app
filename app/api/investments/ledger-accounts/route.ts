import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const branchId = session.branch
    console.log("Investment Ledger Accounts GET request for branch:", branchId)

    // Ledger accounts under Investments (parent 22000000)
    const result = await pool.query(
      `SELECT accountcode, accountname
       FROM chart_of_accounts
       WHERE parentaccountcode = 22000000
         AND isledger = '1'
         AND branch_id = $1
       ORDER BY accountcode ASC`,
      [branchId]
    )

    return NextResponse.json({ success: true, accounts: result.rows })
  } catch (error: any) {
    console.error("Investment Ledger Accounts GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
