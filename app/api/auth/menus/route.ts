import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json([])

  const { rows } = await pool.query(`
    SELECT m.*
    FROM ui_menus m
    JOIN permissions p ON p.permission_code = m.permission_code
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN staff_role_assignments sra ON sra.role_id = rp.role_id
    WHERE sra.staff_id = $1 AND m.is_active = true
    ORDER BY m.sort_order
  `, [session.userId])

  return NextResponse.json(rows)
}
