import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

// GET: Active income ledger accounts (chart of accounts, type 3) that can receive the
// society's share of an appraiser charge (Settings > Management > Manage Appraiser Details)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { rows } = await pool.query(
      `SELECT accountcode::text AS account_code, accountname AS account_name
       FROM chart_of_accounts
       WHERE branch_id = $1
         AND accounttypecode = 3
         AND isledger = B'1'
         AND isactive = B'1'
       ORDER BY accountcode`,
      [session.branch]
    )

    return NextResponse.json({ success: true, accounts: rows })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch income accounts: " + error.message }, { status: 500 })
  }
}
