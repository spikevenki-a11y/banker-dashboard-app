import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"

// Nominees registered on a member's savings accounts (nominee_details),
// for display in Member Management → View Member.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const membershipNo = new URL(req.url).searchParams.get("membership_no")?.trim()
  if (!membershipNo || !/^\d+$/.test(membershipNo)) {
    return NextResponse.json({ error: "Valid membership_no is required" }, { status: 400 })
  }

  try {
    const cols = `nd.account_number,
              nd.nominee_name,
              nd.nominee_relation,
              nd.is_member,
              nd.member_id,
              TO_CHAR(nd.nominee_dob, 'YYYY-MM-DD') AS nominee_dob,
              nd.nominee_gender,
              nd.nominee_age,
              nd.nominee_address,
              nd.nominee_phone,
              nd.nominee_percentage::float AS nominee_percentage,
              nd.created_at, nd.id`
    // Nominees registered on the membership itself (account_number = membership_no),
    // on the member's savings accounts, and on their deposit accounts ('DEP' prefix)
    const { rows } = await pool.query(
      `SELECT account_number, account_type, nominee_name, nominee_relation, is_member, member_id,
              nominee_dob, nominee_gender, nominee_age, nominee_address, nominee_phone, nominee_percentage
       FROM (
         SELECT 'Membership' AS account_type, 0 AS sort_group, ${cols}
         FROM nominee_details nd
         WHERE nd.account_number = $1 AND nd.branch_id = $2
         UNION ALL
         SELECT 'Savings' AS account_type, 1 AS sort_group, ${cols}
         FROM nominee_details nd
         JOIN savings_accounts sa ON sa.account_number = nd.account_number
                                 AND CAST(sa.branch_id AS VARCHAR) = nd.branch_id
         WHERE CAST(sa.membership_no AS VARCHAR) = $1 AND CAST(sa.branch_id AS VARCHAR) = $2
         UNION ALL
         -- Deposit nominees are keyed 'DEP' || account number (see depositNomineeAccountKey)
         SELECT 'Deposit' AS account_type, 2 AS sort_group, ${cols}
         FROM nominee_details nd
         JOIN deposit_account da ON nd.account_number = 'DEP' || CAST(da.accountnumber AS VARCHAR)
                                AND CAST(da.branch_id AS VARCHAR) = nd.branch_id
         WHERE CAST(da.membership_no AS VARCHAR) = $1 AND CAST(da.branch_id AS VARCHAR) = $2
       ) x
       ORDER BY sort_group, account_number, created_at ASC, id ASC`,
      [membershipNo, String(session.branch)]
    )
    return NextResponse.json({ success: true, nominees: rows })
  } catch (error) {
    console.error("Error fetching member nominees:", error)
    return NextResponse.json({ error: "Failed to fetch nominees" }, { status: 500 })
  }
}
