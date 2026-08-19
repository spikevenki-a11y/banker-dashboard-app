import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const branchId = session.branch

    const ledger_accounts = await pool.query(
      `SELECT accountcode, accountname FROM chart_of_accounts
        WHERE parentaccountcode = 15000000
        AND branch_id = $1
        ORDER BY accountcode ASC`,
      [branchId]
    )

    return NextResponse.json({
      success: true,
      accounts: ledger_accounts.rows,
    })
  } catch (error: any) {
    console.error("Reserve & Fund GET Ledger Accounts error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
