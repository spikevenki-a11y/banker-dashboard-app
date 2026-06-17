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
      `SELECT locker_type_id AS id, type_name, dimensions, annual_rent,
              no_of_lockers, no_of_rows, no_of_cabinets
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

  const client = await pool.connect()
  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const { type_name, dimensions, annual_rent, no_of_rows, no_of_cabinets } = await req.json()

    if (!type_name?.trim()) {
      return NextResponse.json({ error: "type_name is required" }, { status: 400 })
    }

    const rows = Math.max(0, parseInt(no_of_rows) || 0)
    const cabinets = Math.max(0, parseInt(no_of_cabinets) || 0)
    const totalLockers = rows * cabinets

    await client.query("BEGIN")

    const { rows: typeRows } = await client.query(
      `INSERT INTO locker_types (branch_id, type_name, dimensions, annual_rent, no_of_lockers, no_of_rows, no_of_cabinets)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        branchId,
        type_name.trim(),
        dimensions?.trim() || null,
        Number(annual_rent) || 0,
        totalLockers,
        rows,
        cabinets,
      ]
    )

    const newType = typeRows[0]
    const lockerTypeId = newType.locker_type_id

    let generated = 0
    if (rows > 0 && cabinets > 0) {
      // Derive a 2-character prefix from the type name (e.g. "Small" → "SM")
      const prefix = type_name.trim().replace(/\s+/g, "").substring(0, 2).toUpperCase()

      for (let r = 1; r <= rows; r++) {
        for (let cab = 1; cab <= cabinets; cab++) {
          const lockerNo = `${prefix}-R${String(r).padStart(2, "0")}C${String(cab).padStart(2, "0")}`
          const res = await client.query(
            `INSERT INTO lockers (branch_id, locker_no, locker_type_id, row_no, cabinet_no)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (branch_id, locker_no) DO NOTHING`,
            [branchId, lockerNo, lockerTypeId, r, cab]
          )
          generated += res.rowCount ?? 0
        }
      }
    }

    await client.query("COMMIT")
    return NextResponse.json({ success: true, type: newType, lockers_generated: generated })
  } catch (error: any) {
    await client.query("ROLLBACK")
    return NextResponse.json({ error: "Failed to create locker type: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
