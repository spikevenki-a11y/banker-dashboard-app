export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const loanApplicationId = request.nextUrl.searchParams.get("loan_application_id")

    if (!loanApplicationId) {
      return NextResponse.json({ error: "loan_application_id is required" }, { status: 400 })
    }

    // Base security record
    const { rows: secRows } = await pool.query(
      `SELECT ls.*, lssm.security_name, lssm.security_code
       FROM loan_securities ls
       JOIN loan_scheme_security_master lssm ON lssm.security_id = ls.security_type_id
       WHERE ls.loan_application_id = $1 AND ls.branch_id = $2 AND ls.is_deleted = FALSE
       ORDER BY ls.security_rank ASC`,
      [loanApplicationId, branchId]
    )

    if (secRows.length === 0) {
      return NextResponse.json({ security: null })
    }

    const base = secRows[0]
    const securityId = base.id
    const typeId = Number(base.security_type_id)

    let detail: any = null
    let goldItems: any[] = []
    let goldDocuments: any[] = []

    if (typeId === 6) {
      // Gold
      const { rows } = await pool.query(
        `SELECT * FROM security_gold_details WHERE security_id = $1`,
        [securityId]
      )
      detail = rows[0] || null

      const { rows: items } = await pool.query(
        `SELECT * FROM security_gold_items WHERE security_id = $1 ORDER BY item_seq ASC`,
        [securityId]
      )
      goldItems = items

      const { rows: docs } = await pool.query(
        `SELECT * FROM loan_gold_documents
         WHERE loan_application_id = $1 AND branch_id = $2 AND is_active = TRUE
         ORDER BY created_at ASC`,
        [loanApplicationId, branchId]
      )
      goldDocuments = docs
    } else if (typeId === 1 || typeId === 2) {
      // Land / Building (Property)
      const { rows } = await pool.query(
        `SELECT * FROM security_property_details WHERE security_id = $1`,
        [securityId]
      )
      detail = rows[0] || null
    } else if (typeId === 7) {
      // Vehicle
      const { rows } = await pool.query(
        `SELECT * FROM security_vehicle_details WHERE security_id = $1`,
        [securityId]
      )
      detail = rows[0] || null
    } else if (typeId === 8 || typeId === 12) {
      // Deposit / NSC / KVP
      const { rows } = await pool.query(
        `SELECT * FROM security_deposit_details WHERE security_id = $1`,
        [securityId]
      )
      detail = rows[0] || null
    } else if (typeId === 10) {
      // Insurance
      const { rows } = await pool.query(
        `SELECT * FROM security_insurance_details WHERE security_id = $1`,
        [securityId]
      )
      detail = rows[0] || null
    }

    return NextResponse.json({
      security: {
        ...base,
        detail,
        gold_items: goldItems,
        gold_documents: goldDocuments,
      },
    })
  } catch (err: any) {
    console.error("Loan security GET error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
