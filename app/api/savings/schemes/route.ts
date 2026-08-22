import { getSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch

    const { rows } = await pool.query(
      `SELECT scheme_id, scheme_name, scheme_description, interest_rate, min_balance, 
              minimum_deposit, maximum_deposit, interest_frequency, 
              interest_calculation_method, scheme_status, minimum_age, maximum_age,
              is_staff_only, savings_gl_account
       FROM savings_schemes 
       WHERE branch_id = $1 AND scheme_status = 'ACTIVE'
       ORDER BY scheme_id`,
      [branchId]
    )

    return NextResponse.json({ schemes: rows })
  } catch (error: any) {
    console.error("Error fetching savings schemes:", error)
    return NextResponse.json({ error: "Failed to fetch schemes" }, { status: 500 })
  }
}
