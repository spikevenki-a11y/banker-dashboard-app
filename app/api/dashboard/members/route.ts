// import { requirePermission } from "@/lib/security/requirePermission"
import pool from "@/lib/connection/db"
import { NextResponse } from "next/server"

export async function GET() {
//   const session = await requirePermission("MEMBER_VIEW")()

  const { rows } = await pool.query(`
    SELECT * FROM members
    WHERE branch_id = 23080101
    ORDER BY joined_date DESC
    LIMIT 10
  `, 
//   [session.branch]
)

  return NextResponse.json(rows)
}
