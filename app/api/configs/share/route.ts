import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) {
      return Response.json({ message: "Unauthorized" }, { status: 401 })
    }

    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { rows } = await pool.query(
      `
      SELECT
        share_face_value,
        a_class_min_share_balance,
        a_class_max_share_balance,
        b_class_share_allowed,
        b_class_min_share_balance,
        b_class_max_share_balance,
        a_class_share_gl_account,
        b_class_share_gl_account
      FROM config_share
      WHERE branch_id = $1
        AND is_active = true
      LIMIT 1
      `,
      [branchId]
    )

    if (!rows.length) {
      return Response.json({ message: "Share config not found" }, { status: 404 })
    }

    return Response.json({
      success: true,
      data: rows[0],
    })
  } catch (err) {
    console.error("Load share config error:", err)
    return Response.json({ message: "Failed to load share config" }, { status: 500 })
  }
}