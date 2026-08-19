import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const typeId = new URL(req.url).searchParams.get("type_id")

    const params: any[] = [branchId]
    let typeFilter = ""
    if (typeId) {
      params.push(Number(typeId))
      typeFilter = ` AND l.locker_type_id = $${params.length}`
    }

    const { rows } = await pool.query(
      `SELECT l.id, l.locker_no, l.status,
              lt.locker_type_id AS type_id, lt.type_name, lt.dimensions, lt.annual_rent
       FROM lockers l
       JOIN locker_types lt ON lt.locker_type_id = l.locker_type_id
       WHERE l.branch_id = $1 AND l.status = 'AVAILABLE'${typeFilter}
       ORDER BY l.locker_no`,
      params
    )

    return NextResponse.json({ success: true, lockers: rows })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch available lockers: " + error.message }, { status: 500 })
  }
}
