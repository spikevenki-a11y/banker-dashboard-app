import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { findApplicablePolicy, memberAgeOn, termPeriod } from "@/lib/fd-interest-policy"

// The interest policy that applies to a new fixed deposit:
// GET ?scheme_id=&membership_no=&period_months=&period_days=
// Uses the business date as the opening date. Returns { policy: null } when no
// active policy covers the scheme, date and tenure (the scheme rate then applies).
// Always returns the member's date of birth and age on the opening date.

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const schemeId = Number(url.searchParams.get("scheme_id"))
  const months = Number(url.searchParams.get("period_months")) || 0
  const days = Number(url.searchParams.get("period_days")) || 0
  const membershipNo = url.searchParams.get("membership_no") || ""
  if (!Number.isInteger(schemeId) || schemeId <= 0) {
    return NextResponse.json({ error: "Invalid scheme" }, { status: 400 })
  }
  const openDate = session.businessDate
  if (!openDate) return NextResponse.json({ error: "Business date is not set" }, { status: 400 })
  try {
    let dateOfBirth: string | null = null
    if (membershipNo) {
      const { rows } = await pool.query(
        `SELECT TO_CHAR(c.date_of_birth, 'YYYY-MM-DD') AS dob
           FROM memberships m JOIN customers c ON c.customer_code = m.customer_code
          WHERE CAST(m.membership_no AS VARCHAR) = $1 AND m.branch_id = $2
          LIMIT 1`,
        [membershipNo, session.branch]
      )
      dateOfBirth = rows[0]?.dob ?? null
    }
    const member = { date_of_birth: dateOfBirth, age: memberAgeOn(dateOfBirth, openDate), as_of: openDate }
    if (months < 0 || days < 0 || (months === 0 && days === 0)) {
      return NextResponse.json({ success: true, policy: null, tenure_days: 0, member })
    }
    const { totalDays } = termPeriod(openDate, months, days)
    const policy = await findApplicablePolicy(pool, {
      branchId: session.branch,
      schemeId,
      openDate,
      tenureDays: totalDays,
      dateOfBirth,
    })
    return NextResponse.json({ success: true, policy, tenure_days: totalDays, member })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to find interest policy: " + error.message }, { status: 500 })
  }
}
