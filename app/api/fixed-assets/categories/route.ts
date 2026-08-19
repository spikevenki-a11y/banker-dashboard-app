import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { rows } = await pool.query(
      `SELECT * FROM asset_categories ORDER BY category_name`
    )
    return NextResponse.json({ success: true, categories: rows })
  } catch (error: any) {
    console.error("Fixed Assets Categories GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
