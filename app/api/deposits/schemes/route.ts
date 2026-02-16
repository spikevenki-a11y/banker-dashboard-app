import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET() {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { rows } = await pool.query(
      `SELECT scheme_id, scheme_name, scheme_description, deposit_type,
              minimum_deposit, maximum_deposit,
              minimum_period_months, maximum_period_months,
              minimum_period_days, maximum_period_days,
              installment_frequency, minimum_installment_amount, maximum_installment_amount,
              interest_rate, interest_frequency, interest_calculation_method,
              premature_closure_allowed, premature_penal_rate,
              auto_renewal_allowed, tds_applicable,
              deposit_gl_account, interest_payable_gl_account, interest_expense_gl_account,
              scheme_status
       FROM deposit_schemes 
       WHERE branch_id = $1 AND scheme_status = 'ACTIVE'
       ORDER BY scheme_id`,
      [branchId]
    )

    return NextResponse.json({ success: true, schemes: rows })
  } catch (error: any) {
    console.error("Error fetching deposit schemes:", error)
    return NextResponse.json({ error: "Failed to fetch schemes" }, { status: 500 })
  }
}
