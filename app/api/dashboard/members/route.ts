import pool from "@/lib/connection/db"
import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/require-role"

export async function GET() {
  const auth = await requirePermission("MEMBER_VIEW")
  if (auth instanceof NextResponse) return auth
  const { session } = auth

  const { rows } = await pool.query(
    `SELECT * FROM members
     WHERE branch_id = $1
     ORDER BY joined_date DESC
     LIMIT 10`,
    [session.branch]
  )

  return NextResponse.json(rows)
}
