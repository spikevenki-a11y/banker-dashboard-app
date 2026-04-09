import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

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
