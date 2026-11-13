import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

// GET /api/loans/applications/print?id=<loan_application_id>
//
// Everything the "Print Application Form" needs for one saved application, read from
// the database: the application, its scheme and purpose, the security (base record +
// the type-specific details, gold items) and, for Personal Surety, the surety record.
// Member profiles (KYC, address) are loaded separately via /api/memberships/view_member.

const pad = (n: number) => String(n).padStart(2, "0")

/** pg returns DATE / TIMESTAMP columns as Date objects; send dates as "YYYY-MM-DD". */
function plain(row: Record<string, any> | null | undefined) {
  if (!row) return null
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Date ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}` : v
  }
  return out
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = Number(request.nextUrl.searchParams.get("id"))
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "A valid loan application id is required" }, { status: 400 })
  }
  const branchId = session.branch

  try {
    const { rows: appRows } = await pool.query(
      `SELECT la.loan_application_id, la.reference_no, la.membership_no,
              TO_CHAR(la.application_date, 'YYYY-MM-DD') AS application_date,
              la.applied_loan_amount, la.application_status, la.loan_purpose,
              COALESCE(lpm.purpose_name, la.loan_purpose) AS loan_purpose_name,
              lsch.scheme_name, lsch.loan_type, lsch.interest_rate AS scheme_interest_rate
       FROM loan_applications la
       LEFT JOIN loan_schemes lsch ON lsch.scheme_id = la.scheme_id AND lsch.branch_id = la.branch_id
       LEFT JOIN loan_purpose_master lpm ON CAST(lpm.purpose_id AS TEXT) = CAST(la.loan_purpose AS TEXT)
       WHERE la.loan_application_id = $1 AND la.branch_id = $2
       LIMIT 1`,
      [id, branchId]
    )
    if (appRows.length === 0) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 })
    }
    const application = appRows[0]

    const { rows: secRows } = await pool.query(
      `SELECT ls.id, ls.security_type_id, ls.security_ref_no, ls.description,
              ls.assessed_value, ls.valuation_date, ls.is_primary_security,
              lssm.security_name, lssm.security_code
       FROM loan_securities ls
       LEFT JOIN loan_scheme_security_master lssm ON lssm.security_id = ls.security_type_id
       WHERE ls.loan_application_id = $1 AND ls.branch_id = $2 AND ls.is_deleted = FALSE
       ORDER BY ls.security_rank ASC NULLS LAST, ls.created_at ASC
       LIMIT 1`,
      [id, branchId]
    )

    let security: Record<string, any> | null = null
    let surety: Record<string, any> | null = null

    if (secRows.length > 0) {
      const base = secRows[0]
      const typeId = Number(base.security_type_id)
      const table =
        typeId === 6 ? "security_gold_details"
        : typeId === 1 || typeId === 2 ? "security_property_details"
        : typeId === 7 ? "security_vehicle_details"
        : typeId === 8 || typeId === 12 ? "security_deposit_details"
        : typeId === 10 ? "security_insurance_details"
        : null

      let detail: Record<string, any> | null = null
      if (table) {
        const { rows } = await pool.query(`SELECT * FROM ${table} WHERE security_id = $1 LIMIT 1`, [base.id])
        detail = plain(rows[0])
      }

      let goldItems: Record<string, any>[] = []
      if (typeId === 6) {
        const { rows } = await pool.query(
          `SELECT item_seq, ornament_name, gold_form, purity_karat, number_of_pieces,
                  gross_weight_grams, stone_weight_grams, net_weight_grams
           FROM security_gold_items WHERE security_id = $1 ORDER BY item_seq ASC`,
          [base.id]
        )
        goldItems = rows
      }

      security = { ...plain(base), detail, gold_items: goldItems }
    }

    // Personal Surety: stored per application without a branch column (application ids
    // are numbered per branch), so also require the surety to be a member of this branch,
    // as the application endpoint does when saving it
    if (Number(security?.security_type_id) === 13) {
      const { rows: suretyRows } = await pool.query(
        `SELECT ps.membership_no, ps.surety_annual_income, ps.surety_eligible_security_amount
         FROM personal_surety_details ps
         JOIN memberships m ON CAST(m.membership_no AS TEXT) = CAST(ps.membership_no AS TEXT) AND m.branch_id = $2
         WHERE ps.loan_application_id = $1
         ORDER BY ps.created_at ASC LIMIT 1`,
        [id, branchId]
      )
      if (suretyRows.length > 0) surety = suretyRows[0]
    }

    return NextResponse.json({ application, security, surety })
  } catch (error: any) {
    console.error("Loan application print data error:", error)
    return NextResponse.json({ error: "Failed to load the application for printing: " + error.message }, { status: 500 })
  }
}

export const runtime = "nodejs"
