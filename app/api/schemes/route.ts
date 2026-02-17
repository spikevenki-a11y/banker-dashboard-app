import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

function getSession() {
  return cookies().then((c) => {
    const raw = c.get("banker_session")
    if (!raw) return null
    try {
      return JSON.parse(raw.value)
    } catch {
      return null
    }
  })
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const branchId = session.branch
  const module = req.nextUrl.searchParams.get("module")

  if (!module || !["savings", "deposits", "loans"].includes(module)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 })
  }

  try {
    let rows: any[] = []

    if (module === "savings") {
      const result = await pool.query(
        `SELECT id, scheme_id, scheme_name, scheme_description, scheme_status,
                interest_rate, min_balance, minimum_deposit, maximum_deposit,
                interest_frequency, interest_calculation_method, interest_rounding,
                minimum_balance_for_interest, minimum_interest_payable,
                savings_gl_account, interest_payable_gl_account, interest_paid_gl_account,
                interest_code, minimum_age, maximum_age, is_staff_only,
                created_at, updated_at
         FROM savings_schemes
         WHERE branch_id = $1
         ORDER BY scheme_id`,
        [branchId]
      )
      rows = result.rows
    } else if (module === "deposits") {
      const result = await pool.query(
        `SELECT id, scheme_id, scheme_name, scheme_description, scheme_status,
                deposit_type, minimum_deposit, maximum_deposit,
                minimum_period_months, maximum_period_months,
                minimum_period_days, maximum_period_days,
                installment_frequency, minimum_installment_amount, maximum_installment_amount,
                interest_rate, interest_frequency, interest_calculation_method,
                interest_rounding, compounding_frequency,
                premature_closure_allowed, premature_penal_rate,
                auto_renewal_allowed, tds_applicable,
                deposit_gl_account, interest_payable_gl_account, interest_expense_gl_account,
                penal_interest_gl_account, penal_rate, agent_commission_percent,
                interest_code, minimum_age, maximum_age, is_staff_only,
                collection_frequency,
                created_at, updated_at
         FROM deposit_schemes
         WHERE branch_id = $1
         ORDER BY scheme_id`,
        [branchId]
      )
      rows = result.rows
    } else if (module === "loans") {
      // Loans table may not exist yet, return empty
      rows = []
    }

    return NextResponse.json({ success: true, schemes: rows })
  } catch (error: any) {
    console.error("Error fetching schemes:", error)
    return NextResponse.json({ error: "Failed to fetch schemes" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const branchId = session.branch

  try {
    const body = await req.json()
    const { module, id, updates } = body

    if (!module || !id || !updates) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const tableName = module === "savings" ? "savings_schemes" : module === "deposits" ? "deposit_schemes" : null
    if (!tableName) {
      return NextResponse.json({ error: "Invalid module" }, { status: 400 })
    }

    // Build SET clause from updates object
    const allowedFields: Record<string, string[]> = {
      savings: [
        "scheme_name", "scheme_description", "scheme_status", "interest_rate",
        "min_balance", "minimum_deposit", "maximum_deposit", "interest_frequency",
        "interest_calculation_method", "interest_rounding", "minimum_balance_for_interest",
        "minimum_interest_payable", "savings_gl_account", "interest_payable_gl_account",
        "interest_paid_gl_account", "interest_code", "minimum_age", "maximum_age", "is_staff_only"
      ],
      deposits: [
        "scheme_name", "scheme_description", "scheme_status", "deposit_type",
        "minimum_deposit", "maximum_deposit", "minimum_period_months", "maximum_period_months",
        "minimum_period_days", "maximum_period_days", "installment_frequency",
        "minimum_installment_amount", "maximum_installment_amount",
        "interest_rate", "interest_frequency", "interest_calculation_method",
        "interest_rounding", "compounding_frequency",
        "premature_closure_allowed", "premature_penal_rate",
        "auto_renewal_allowed", "tds_applicable",
        "deposit_gl_account", "interest_payable_gl_account", "interest_expense_gl_account",
        "penal_interest_gl_account", "penal_rate", "agent_commission_percent",
        "interest_code", "minimum_age", "maximum_age", "is_staff_only", "collection_frequency"
      ]
    }

    const fields = allowedFields[module] || []
    const setClauses: string[] = []
    const values: any[] = []
    let paramIdx = 1

    for (const [key, val] of Object.entries(updates)) {
      if (fields.includes(key)) {
        setClauses.push(`${key} = $${paramIdx}`)
        values.push(val)
        paramIdx++
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    setClauses.push(`updated_at = NOW()`)
    values.push(id, branchId)

    const query = `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE id = $${paramIdx} AND branch_id = $${paramIdx + 1} RETURNING *`
    const { rows } = await pool.query(query, values)

    if (rows.length === 0) {
      return NextResponse.json({ error: "Scheme not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, scheme: rows[0] })
  } catch (error: any) {
    console.error("Error updating scheme:", error)
    return NextResponse.json({ error: "Failed to update scheme" }, { status: 500 })
  }
}
