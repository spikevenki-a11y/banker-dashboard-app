import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"

// GET: Fetch all loan schemes
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const schemeId = searchParams.get("schemeId")
    const status = searchParams.get("status")

    let query = `
      SELECT * FROM loan_schemes 
      WHERE branch_id = $1
    `
    const params: any[] = [branchId]

    if (schemeId) {
      params.push(schemeId)
      query += ` AND scheme_id = $${params.length}`
    }

    if (status) {
      params.push(status.toUpperCase())
      query += ` AND scheme_status = $${params.length}`
    }

    query += ` ORDER BY scheme_name ASC`

    const { rows: schemes } = await pool.query(query, params)

    return NextResponse.json({ schemes })
  } catch (error: any) {
    console.error("Failed to fetch loan schemes:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
