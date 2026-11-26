export const runtime = "nodejs"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { sum, toPaise, toRupees } from "@/lib/money"
import { NextResponse } from "next/server"

/**
 * Current cash in hand for the signed-in user's branch, shown in the dashboard header.
 *
 * Same accounts and balance as the Day End summary (api/fas/dayend/summary): the
 * "Cash In Hand" account(s) in the chart of accounts and their child accounts, summed
 * from their live balances in exact paise.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { rows } = await pool.query(
      `WITH cash_root AS (
         SELECT accountcode
           FROM chart_of_accounts
          WHERE branch_id = $1
            AND accountname ILIKE '%Cash In Hand%'
       )
       SELECT c.accountbalance
         FROM chart_of_accounts c
        WHERE c.branch_id = $1
          AND (
            c.accountcode IN (SELECT accountcode FROM cash_root)
            OR c.parentaccountcode IN (SELECT accountcode FROM cash_root)
          )`,
      [session.branch]
    )
    if (rows.length === 0) return NextResponse.json({ cashInHand: null })
    return NextResponse.json({ cashInHand: toRupees(sum(rows.map((r: any) => toPaise(r.accountbalance)))) })
  } catch (error) {
    console.error("Failed to load cash in hand:", error)
    return NextResponse.json({ error: "Failed to load cash in hand" }, { status: 500 })
  }
}
