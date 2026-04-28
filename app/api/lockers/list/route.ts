import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const url = new URL(req.url)
    const search = url.searchParams.get("search") || ""
    const status = url.searchParams.get("status") || "all"

    const params: any[] = [branchId]
    let whereExtra = ""

    if (status !== "all") {
      params.push(status.toUpperCase())
      whereExtra += ` AND ld.status = $${params.length}`
    }

    if (search) {
      params.push(`%${search}%`)
      const i = params.length
      whereExtra += ` AND (ld.account_number ILIKE $${i} OR ld.membership_no ILIKE $${i} OR c.full_name ILIKE $${i} OR l.locker_no ILIKE $${i})`
    }

    const { rows: deposits } = await pool.query(
      `SELECT
         ld.id,
         ld.account_number,
         ld.membership_no,
         ld.deposit_amount,
         ld.interest_rate,
         ld.period_years,
         ld.status,
         ld.nominee_name,
         ld.nominee_relation,
         TO_CHAR(ld.opening_date, 'YYYY-MM-DD') AS opening_date,
         TO_CHAR(ld.expiry_date,  'YYYY-MM-DD') AS expiry_date,
         c.full_name AS member_name,
         l.id        AS locker_id,
         l.locker_no,
         l.location  AS locker_location,
         lt.type_name AS locker_type,
         lt.annual_rent
       FROM locker_deposits ld
       JOIN memberships m  ON m.membership_no = ld.membership_no AND m.branch_id = ld.branch_id
       JOIN customers   c  ON c.customer_code = m.customer_code
       LEFT JOIN lockers l ON l.id = ld.locker_id
       LEFT JOIN locker_types lt ON lt.locker_type_id = l.locker_type_id
       WHERE ld.branch_id = $1${whereExtra}
       ORDER BY ld.created_at DESC`,
      params
    )

    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*)                                             AS total,
         COUNT(*) FILTER (WHERE status = 'ACTIVE')           AS active,
         COALESCE(SUM(deposit_amount) FILTER (WHERE status = 'ACTIVE'), 0) AS total_deposit,
         COUNT(*) FILTER (WHERE locker_id IS NOT NULL AND status = 'ACTIVE') AS assigned
       FROM locker_deposits WHERE branch_id = $1`,
      [branchId]
    )

    return NextResponse.json({ success: true, deposits, stats: statsRows[0] })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch locker deposits: " + error.message }, { status: 500 })
  }
}
