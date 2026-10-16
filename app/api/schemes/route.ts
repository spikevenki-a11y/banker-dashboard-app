import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

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
                 minimum_age, maximum_age, is_staff_only,
                collection_frequency,
                created_at, updated_at
         FROM deposit_schemes
         WHERE branch_id = $1
         ORDER BY scheme_id`,
        [branchId]
      )
      rows = result.rows
    } else if (module === "loans") {
      const result = await pool.query(
        `SELECT id, scheme_id, scheme_name, scheme_description, scheme_status,
                loan_type, minimum_loan_amount, maximum_loan_amount,
                minimum_period_months, maximum_period_months,
                repayment_frequency, installment_calculation_method,
                interest_policy_id, interest_rate, interest_calculation_method,
                interest_frequency, compounding_frequency, interest_rounding,
                minimum_interest_payable, penal_interest_rate, penalty_grace_days,
                processing_fee_percent, processing_fee_min, processing_fee_max,
                prepayment_allowed, prepayment_penalty_percent, collateral_required,
                loan_gl_account, interest_income_gl_account, interest_receivable_gl_account,
                penal_interest_gl_account, processing_fee_gl_account,
                minimum_age, maximum_age, is_staff_only,
                appraiser_charge_allowed, appraiser_charge_code,
                appraiser_name, appraiser_amount_receive_account_number,
                created_at, updated_at
         FROM loan_schemes
         WHERE branch_id = $1
         ORDER BY scheme_id`,
        [branchId]
      )
      rows = result.rows
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

    const tableName =
      module === "savings" ? "savings_schemes"
        : module === "deposits" ? "deposit_schemes"
          : module === "loans" ? "loan_schemes"
            : null
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
      ],
      // Name, description, loan type, period, interest configuration and GL accounts are read-only
      loans: [
        "scheme_status",
        "minimum_loan_amount", "maximum_loan_amount",
        "repayment_frequency", "installment_calculation_method",
        "penal_interest_rate", "penalty_grace_days",
        "processing_fee_percent", "processing_fee_min", "processing_fee_max",
        "prepayment_allowed", "prepayment_penalty_percent", "collateral_required",
        "minimum_age", "maximum_age", "is_staff_only",
        "appraiser_charge_allowed", "appraiser_charge_code",
        "appraiser_name", "appraiser_amount_receive_account_number"
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
