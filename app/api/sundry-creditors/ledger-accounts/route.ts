import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/connection/db"

export async function GET(){

  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const branchId = session.branch
    const userId = session.userId

    

    // Fetch transactions for a specific account
    const ledger_accounts = await pool.query(
      `SELECT accountcode,accountname FROM chart_of_accounts 
        WHERE parentaccountcode = 14000000
        and branch_id = $1
        ORDER BY accountcode DESC`,
        [branchId]
    )

    return NextResponse.json({ 
      success: true, 
      accounts: ledger_accounts.rows 
    })
  } catch (error: any) {
    console.error("Sundry Creditors GET Ledger Accounts error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

}
