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
    console.log(`Fetching deposit accounts for member ${membershipNo} in branch ${branchId}`)

    const { rows } = await pool.query(
      `SELECT
        da.accountnumber,
        da.deposittype,
        da.clearbalance,
        da.rateofinterest,
        da.accountopendate,
        da.schemeid,
        ds.scheme_name,
        td.depositamount,
        td.periodmonths,
        td.perioddays,
        td.maturitydate    AS td_maturity_date,
        td.maturityamount  AS td_maturity_amount,
        rd.installment_amount,
        rd.maturitydate    AS rd_maturity_date,
        rd.maturityamount  AS rd_maturity_amount
       FROM deposit_account da
       LEFT JOIN deposit_schemes ds
              ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
       LEFT JOIN term_deposit_details td
              ON td.accountnumber = da.accountnumber
       LEFT JOIN recurring_deposit_details rd
              ON rd.accountnumber = da.accountnumber
       WHERE da.membership_no = $1
         AND da.branch_id    = $2
         AND da.accountstatus = 1
          and da.clearbalance != 0
       ORDER BY da.accountopendate DESC`,
      [membershipNo, branchId]
    )

    const typeLabel: Record<string, string> = { TERM: "FD", RECURRING: "RD", PIGMY: "Pigmy" }
    const typeCode: Record<string, string> = { TERM: "FD", RECURRING: "RD", PIGMY: "OTHER" }

    const deposits = rows.map((r) => ({
      accountNumber: String(r.accountnumber),
      depositType: r.deposittype,
      depositTypeLabel: typeLabel[r.deposittype] ?? r.deposittype,
      depositTypeCode: typeCode[r.deposittype] ?? "OTHER",
      schemeName: r.scheme_name ?? "---",
      balance: Number(r.clearbalance),
      depositAmount: r.depositamount ? Number(r.depositamount) : Number(r.clearbalance),
      openDate: r.accountopendate,
      maturityDate: r.td_maturity_date ?? r.rd_maturity_date ?? null,
      maturityAmount: r.td_maturity_amount
        ? Number(r.td_maturity_amount)
        : r.rd_maturity_amount
        ? Number(r.rd_maturity_amount)
        : null,
      interestRate: Number(r.rateofinterest),
      periodMonths: r.periodmonths ?? null,
    }))

    console.log(`Fetched ${deposits.length} deposit accounts for member ${membershipNo} in branch ${branchId}`) 

    return NextResponse.json({ success: true, deposits })
  } catch (error: any) {
    console.error("Error fetching member deposit accounts:", error)
    return NextResponse.json({ error: "Failed to fetch deposit accounts" }, { status: 500 })
  }
}
