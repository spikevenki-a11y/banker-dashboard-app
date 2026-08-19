import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return Response.json({ message: "Unauthorized" }, { status: 401 })
    }
    const branchId = session.branch

    const { rows } = await pool.query(
      `
      SELECT
        is_depreciation_calculated_based_on_category,
        calculate_depreciation_on_current_year_purchase_asset,
        calculate_depreciation_on_current_year_sold_asset,
        calculate_depreciation_on_current_year_purchase_asset_based_on_purchase_date,
        is_depreciation_calculated_based_on_item,
        is_depreciation_calculated_based_on_bookvalue
      FROM config_assets
      WHERE branch_id = $1
        AND is_active = true
      LIMIT 1
      `,
      [branchId]
    )

    if (!rows.length) {
      return Response.json({ message: "Asset config not found" }, { status: 404 })
    }

    return Response.json({
      success: true,
      data: rows[0],
    })
  } catch (err) {
    console.error("Load asset config error:", err)
    return Response.json({ message: "Failed to load asset config" }, { status: 500 })
  }
}
