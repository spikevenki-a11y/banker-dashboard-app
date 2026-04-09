import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GET — list asset type items for branch
export async function GET(_request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { rows } = await pool.query(
      `SELECT ai.*, ac.category_name, ac.gl_account_code, ac.depreciation_gl_account_code
       FROM asset_items ai
       JOIN asset_categories ac ON ai.category_id = ac.category_id
       WHERE ai.branch_id = $1
       ORDER BY ai.asset_name`,
      [branchId]
    )
    return NextResponse.json({ success: true, items: rows })
  } catch (error: any) {
    console.error("Fixed Assets Items GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — create new asset type
export async function POST(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const body = await request.json()
    const { asset_name, category_id } = body

    if (!asset_name || !category_id) {
      return NextResponse.json(
        { error: "Missing required fields: asset_name, category_id" },
        { status: 400 }
      )
    }

    const { rows: [countRow] } = await pool.query(
      `SELECT COUNT(*) AS count FROM asset_items WHERE branch_id = $1`,
      [branchId]
    )
    const assetId = parseInt(countRow.count) + 1

    const { rows: [item] } = await pool.query(
      `INSERT INTO asset_items (branch_id, asset_id, asset_name, category_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [branchId, assetId, asset_name, category_id]
    )
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error("Fixed Assets Items POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
