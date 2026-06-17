import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
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
