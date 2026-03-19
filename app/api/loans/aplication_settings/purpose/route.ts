import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

// GET: Fetch all loan schemes
export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const schemeId = searchParams.get("schemeId")

    let query = `select lspm.purpose_id , lpm.purpose_name from loan_scheme_purpose_mapping lspm
      left join loan_purpose_master lpm on lpm.purpose_id = lspm.purpose_id
      WHERE lspm.branch_id = $1
    `
    const params: any[] = [branchId]
    if (schemeId) {
      params.push(schemeId)
      query += ` AND scheme_id = $${params.length}`
    }



    const { rows: schemes } = await pool.query(query, params)

    return NextResponse.json({ schemes })
  } catch (error: any) {
    console.error("Failed to fetch loan schemes:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
