import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/connection/db"

export async function GET(){

  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const branchId = session.branch
    const userId = session.userId

    

    // Get ledger accounts for income (assuming parent account code for income is 32000000)
    const ledger_accounts = await pool.query(
      `SELECT accountcode,accountname FROM chart_of_accounts 
        WHERE parentaccountcode = 32000000
        and isledger = '1'
        and branch_id = $1
        ORDER BY accountcode DESC`,
        [branchId]
    )

    return NextResponse.json({ 
      success: true, 
      accounts: ledger_accounts.rows 
    })
  } catch (error: any) {
    console.error("Income GET Ledger Accounts error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

}
