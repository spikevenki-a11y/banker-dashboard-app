import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    // Try branch-specific castes first
    const { rows: branchCastes } = await pool.query(
      `SELECT serial_no, caste_name FROM branch_caste_details
       WHERE branch_id = $1 AND status = 'active'
       ORDER BY serial_no::int`,
      [branchId]
    )

    if (branchCastes.length > 0) {
      return NextResponse.json({ success: true, castes: branchCastes })
    }

    // Fallback to master caste list
    const { rows: masterCastes } = await pool.query(
      `SELECT serial_no, caste_name FROM caste_master
       WHERE status = 'active'
       ORDER BY serial_no::int`
    )

    return NextResponse.json({ success: true, castes: masterCastes })
  } catch (error: any) {
    console.error("Caste GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
