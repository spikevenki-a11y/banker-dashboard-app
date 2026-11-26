export const runtime = "nodejs"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"

/**
 * The signed-in user's last login, for the dashboard footer.
 *
 * Every successful login is recorded in staff_login_audit (app/api/auth/login), so the
 * newest row is the current session; "last login" is the one before it. On a user's
 * first ever login there is no earlier row, so the current login is returned.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { rows } = await pool.query(
      `SELECT login_time
         FROM staff_login_audit
        WHERE staff_id = $1 AND success = true
        ORDER BY login_time DESC
        LIMIT 2`,
      [session.userId]
    )
    const last = rows[1] ?? rows[0]
    return NextResponse.json({ lastLogin: last ? last.login_time : null })
  } catch (error) {
    console.error("Failed to load last login:", error)
    return NextResponse.json({ error: "Failed to load last login" }, { status: 500 })
  }
}
