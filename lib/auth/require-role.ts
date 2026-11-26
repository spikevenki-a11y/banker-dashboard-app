import "server-only"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession, type SessionData } from "./session"

export type AuthResult = { session: SessionData } | NextResponse

// Role that is treated as a superuser for permission checks.
const ADMIN_ROLE = "admin"

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// Ensures the caller is logged in and their session role is one of `roles`.
// Returns { session } on success, or a 401/403 response to return as-is:
//
//   const auth = await requireRole("admin")
//   if (auth instanceof NextResponse) return auth
//   const { session } = auth
export async function requireRole(...roles: string[]): Promise<AuthResult> {
  const session = await getSession()
  if (!session) return unauthorized()
  if (!roles.includes(session.role)) return forbidden()
  return { session }
}

// Ensures the caller is logged in and their role grants `permissionCode`
// via role_permissions (keyed by users.role). The role is read from the
// database rather than the session so role changes and deactivation take
// effect immediately. Admins are allowed through without a mapping row.
export async function requirePermission(permissionCode: string): Promise<AuthResult> {
  const session = await getSession()
  if (!session) return unauthorized()

  try {
    const { rows } = await pool.query(
      `SELECT usr.role,
              EXISTS (
                SELECT 1 FROM role_permissions rp
                WHERE rp.role = usr.role AND rp.permission_code = $2
              ) AS granted
       FROM users usr
       WHERE usr.id = $1 AND usr.is_active = true`,
      [session.userId, permissionCode]
    )

    const row = rows[0]
    if (!row) return forbidden()
    if (row.role !== ADMIN_ROLE && !row.granted) return forbidden()
    return { session }
  } catch (error) {
    // Fail closed: a failed permission lookup must never grant access.
    console.error("Permission check failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
