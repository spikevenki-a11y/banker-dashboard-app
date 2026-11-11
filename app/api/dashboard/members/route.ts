import pool from "@/lib/connection/db"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT * FROM members
     WHERE branch_id = $1
     ORDER BY joined_date DESC
     LIMIT 10`,
    [session.branch]
  )

  return NextResponse.json(rows)
}
