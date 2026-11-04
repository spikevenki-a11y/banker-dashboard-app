import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

// GET ?customer_code= — the customer's memberships in branches other than the
// session's branch. Used by Register a New Membership after the Aadhaar lookup.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const customerCode = new URL(req.url).searchParams.get("customer_code")?.trim()
  if (!customerCode) {
    return NextResponse.json({ error: "customer_code is required" }, { status: 400 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         m.membership_no::text                     AS membership_no,
         m.branch_id::text                         AS branch_id,
         COALESCE(bp.branch_name, 'Branch ' || m.branch_id::text) AS branch_name,
         m.membership_class,
         m.member_type,
         m.status,
         TO_CHAR(m.join_date, 'YYYY-MM-DD')        AS join_date
       FROM memberships m
       LEFT JOIN branchparameters bp ON bp.branch_id = m.branch_id
       WHERE m.customer_code = $1
         AND m.branch_id::text <> $2
       ORDER BY m.join_date DESC NULLS LAST, m.membership_no`,
      [customerCode, String(session.branch)]
    )
    return NextResponse.json({ success: true, memberships: rows })
  } catch (error) {
    console.error("Other-branch memberships lookup error:", error)
    return NextResponse.json({ error: "Failed to load existing memberships" }, { status: 500 })
  }
}
