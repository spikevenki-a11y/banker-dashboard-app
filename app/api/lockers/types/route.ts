import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET() {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { rows } = await pool.query(
      `SELECT locker_type_id AS id, type_name, dimensions, annual_rent
       FROM locker_types WHERE branch_id = $1 ORDER BY type_name`,
      [branchId]
    )

    return NextResponse.json({ success: true, types: rows })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch locker types: " + error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const { type_name, dimensions, annual_rent } = await req.json()

    if (!type_name?.trim()) {
      return NextResponse.json({ error: "type_name is required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `INSERT INTO locker_types (branch_id, type_name, dimensions, annual_rent)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [branchId, type_name.trim(), dimensions?.trim() || null, Number(annual_rent) || 0]
    )

    return NextResponse.json({ success: true, type: rows[0] })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create locker type: " + error.message }, { status: 500 })
  }
}
