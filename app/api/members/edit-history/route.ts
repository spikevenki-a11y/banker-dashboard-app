import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { isMemberEditSection } from "@/lib/member-profile-validation"

// GET ?membership_no=&section= — Edit Member history for a member of the
// session's branch, newest first. Read-only: there is intentionally no
// PUT / PATCH / DELETE here, and the table itself rejects updates and deletes.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = new URL(req.url).searchParams
  const membershipNo = params.get("membership_no")?.trim()
  const section = params.get("section")?.trim() || ""
  if (!membershipNo || !/^\d+$/.test(membershipNo)) {
    return NextResponse.json({ error: "Valid membership_no is required" }, { status: 400 })
  }
  if (section && !isMemberEditSection(section)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, change_id, section, field_name, old_value, new_value,
              changed_by_name, changed_at
       FROM member_edit_history
       WHERE branch_id = $1 AND membership_no = $2
         AND ($3 = '' OR section = $3)
       ORDER BY changed_at DESC, field_name
       LIMIT 1000`,
      [String(session.branch), membershipNo, section]
    )
    return NextResponse.json({ success: true, history: rows })
  } catch (error: any) {
    if (error?.code === "42P01") {
      return NextResponse.json({ success: true, history: [], not_configured: true })
    }
    console.error("Member edit history GET error:", error)
    return NextResponse.json({ error: "Failed to load edit history" }, { status: 500 })
  }
}
