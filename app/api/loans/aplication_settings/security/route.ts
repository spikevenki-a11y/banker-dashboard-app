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

    let query = `select lssm.security_id , lssmr.security_name from loan_scheme_security_mapping lssm
      left join loan_scheme_security_master lssmr on lssmr.security_id = lssm.security_id
      WHERE lssm.branch_id = $1
    `
    const params: any[] = [branchId]
    if (schemeId) {
      params.push(schemeId)
      query += ` AND scheme_id = $${params.length}`
    }



    const { rows: security } = await pool.query(query, params)

    return NextResponse.json({ security })
  } catch (error: any) {
    console.error("Failed to fetch loan schemes:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
