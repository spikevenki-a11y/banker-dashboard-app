import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GET — depreciation master (config list) or history
export async function GET(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const type   = searchParams.get("type")
    const assetId = searchParams.get("asset_id")   // INT type id for history filter

    if (type === "history") {
      let sql = `
        SELECT add.*, aid.asset_name, aid.serial_number, ac.category_name
        FROM asset_depreciation_details add
        JOIN asset_items_details aid ON aid.asset_id = add.asset_id
                                    AND aid.branch_id = add.branch_id
        LEFT JOIN asset_categories ac ON ac.category_id = aid.category_id
        WHERE add.branch_id = $1`
      const params: any[] = [branchId]
      if (assetId) { sql += ` AND add.asset_id = $2`; params.push(parseInt(assetId)) }
      sql += ` ORDER BY add.depreciation_date DESC, add.created_at DESC`
      const { rows } = await pool.query(sql, params)
      return NextResponse.json({ success: true, history: rows })
    }

    // Depreciation master list joined with asset unit info via serial_number
    const { rows } = await pool.query(
      `SELECT adm.*,
              aid.id              AS asset_detail_id,
              aid.asset_name,
              aid.asset_id        AS asset_type_id,
              aid.purchase_value,
              aid.net_book_value,
              aid.status          AS asset_status,
              aid.purchase_date,
              aid.last_depreciation_date,
              ac.category_name
       FROM asset_depreciation_master adm
       JOIN asset_items_details aid ON aid.serial_number = adm.serial_number
                                   AND aid.branch_id = adm.branch_id
       LEFT JOIN asset_categories ac ON ac.category_id = aid.category_id
       WHERE adm.branch_id = $1
       ORDER BY aid.asset_name`,
      [branchId]
    )
    return NextResponse.json({ success: true, configs: rows })
  } catch (error: any) {
    console.error("Fixed Assets Depreciation GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — configure (or update) depreciation for an asset unit
export async function POST(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const body = await request.json()
    const { asset_detail_id, method, depreciation_rate } = body
    // asset_detail_id = asset_items_details.id (UUID) — used to look up serial_number

    if (!asset_detail_id || !method || !depreciation_rate) {
      return NextResponse.json(
        { error: "Missing required fields: asset_detail_id, method, depreciation_rate" },
        { status: 400 }
      )
    }
    if (!["SLM", "WDV"].includes(method)) {
      return NextResponse.json({ error: "method must be SLM or WDV" }, { status: 400 })
    }

    // Resolve serial_number from the unit's UUID
    const { rows: [unit] } = await pool.query(
      `SELECT serial_number FROM asset_items_details WHERE id = $1 AND branch_id = $2`,
      [asset_detail_id, branchId]
    )
    if (!unit) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    const serialNumber = unit.serial_number

    // Manual upsert (schema has no UNIQUE constraint on serial_number in dep master)
    const { rows: [existing] } = await pool.query(
      `SELECT id FROM asset_depreciation_master WHERE serial_number = $1 AND branch_id = $2`,
      [serialNumber, branchId]
    )

    let cfg: any
    if (existing) {
      const { rows: [updated] } = await pool.query(
        `UPDATE asset_depreciation_master
         SET method = $1, depreciation_rate = $2
         WHERE serial_number = $3 AND branch_id = $4
         RETURNING *`,
        [method, parseFloat(depreciation_rate), serialNumber, branchId]
      )
      cfg = updated
    } else {
      // Sequential depreciation_id per branch
      const { rows: [countRow] } = await pool.query(
        `SELECT COUNT(*) AS count FROM asset_depreciation_master WHERE branch_id = $1`,
        [branchId]
      )
      const depId = parseInt(countRow.count) + 1

      const { rows: [inserted] } = await pool.query(
        `INSERT INTO asset_depreciation_master
           (branch_id, serial_number, depreciation_id, method, depreciation_rate)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [branchId, serialNumber, depId, method, parseFloat(depreciation_rate)]
      )
      cfg = inserted
    }

    return NextResponse.json({ success: true, config: cfg })
  } catch (error: any) {
    console.error("Fixed Assets Depreciation POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
