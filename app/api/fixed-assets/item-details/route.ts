import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GET — individual asset records with optional filters
export async function GET(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category_id")
    const status     = searchParams.get("status")
    const purchaseId = searchParams.get("purchase_id")
    const assetId    = searchParams.get("asset_id")   // INT type id
    const detailId   = searchParams.get("id")          // UUID of asset_items_details row

    // Depreciation history for one asset unit (via its asset_id INT)
    if (detailId && searchParams.get("type") === "dep_history") {
      // Look up the asset_id INT for this unit
      const { rows: [unit] } = await pool.query(
        `SELECT asset_id FROM asset_items_details WHERE id = $1 AND branch_id = $2`,
        [detailId, branchId]
      )
      if (!unit) return NextResponse.json({ success: true, history: [] })

      const { rows } = await pool.query(
        `SELECT * FROM asset_depreciation_details
         WHERE asset_id = $1 AND branch_id = $2
         ORDER BY depreciation_date DESC`,
        [unit.asset_id, branchId]
      )
      return NextResponse.json({ success: true, history: rows })
    }

    let sql = `
      SELECT aid.*,
             ai.asset_name  AS item_name,
             ac.category_name,
             ac.gl_account_code,
             ac.depreciation_gl_account_code,
             adm.method            AS dep_method,
             adm.depreciation_rate AS dep_rate,
             adm.id                AS dep_master_id
      FROM asset_items_details aid
      LEFT JOIN asset_items ai
             ON ai.asset_id = aid.asset_id AND ai.branch_id = aid.branch_id
      LEFT JOIN asset_categories ac ON ac.category_id = aid.category_id
      LEFT JOIN asset_depreciation_master adm ON adm.serial_number = aid.serial_number
                                              AND adm.branch_id = aid.branch_id
      WHERE aid.branch_id = $1`
    const params: any[] = [branchId]
    let p = 1

    if (categoryId) { sql += ` AND aid.category_id = $${++p}`; params.push(categoryId) }
    if (status && status !== "all") { sql += ` AND aid.status = $${++p}`; params.push(status) }
    if (purchaseId) { sql += ` AND aid.purchase_id = $${++p}`; params.push(parseInt(purchaseId)) }
    if (assetId)    { sql += ` AND aid.asset_id = $${++p}`;    params.push(parseInt(assetId)) }

    sql += ` ORDER BY aid.purchase_date DESC, aid.created_at DESC`

    const { rows } = await pool.query(sql, params)
    return NextResponse.json({ success: true, assets: rows })
  } catch (error: any) {
    console.error("Fixed Asset Item Details GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
