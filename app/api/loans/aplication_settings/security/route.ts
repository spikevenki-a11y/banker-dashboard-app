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

    let query = `select distinct lssm.security_id , lssmr.security_name from loan_scheme_security_mapping lssm
      join loan_scheme_security_master lssmr on lssmr.security_id = lssm.security_id
      WHERE lssm.branch_id = $1 AND lssmr.is_active = TRUE
    `
    const params: any[] = [branchId]
    if (schemeId) {
      params.push(schemeId)
      query += ` AND lssm.scheme_id = $${params.length}`
    }
    query += ` ORDER BY lssm.security_id`


    const { rows: security } = await pool.query(query, params)

    return NextResponse.json({ security })
  } catch (error: any) {
    console.error("Failed to fetch loan schemes:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
