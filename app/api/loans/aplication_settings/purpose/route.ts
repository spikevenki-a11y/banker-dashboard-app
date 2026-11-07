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

    // Only active purposes are offered on new applications
    let query = `select distinct lspm.purpose_id , lpm.purpose_name from loan_scheme_purpose_mapping lspm
      join loan_purpose_master lpm on lpm.purpose_id = lspm.purpose_id
      WHERE lspm.branch_id = $1 AND lpm.is_active = TRUE
    `
    const params: any[] = [branchId]
    if (schemeId) {
      params.push(schemeId)
      query += ` AND lspm.scheme_id = $${params.length}`
    }
    query += ` ORDER BY lspm.purpose_id`


    const { rows: schemes } = await pool.query(query, params)

    return NextResponse.json({ schemes })
  } catch (error: any) {
    console.error("Failed to fetch loan schemes:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
