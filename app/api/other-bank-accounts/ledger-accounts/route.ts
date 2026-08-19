import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const branchId = session.branch

    // Ledger accounts under Bank Balances (parent 23200000)
    const result = await pool.query(
      `SELECT accountcode, accountname
       FROM chart_of_accounts
       WHERE parentaccountcode = 23200000
         AND isledger = '1'
         AND branch_id = $1
       ORDER BY accountcode ASC`,
      [branchId]
    )

    return NextResponse.json({ success: true, accounts: result.rows })
  } catch (error: any) {
    console.error("Other Bank Accounts Ledger GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
