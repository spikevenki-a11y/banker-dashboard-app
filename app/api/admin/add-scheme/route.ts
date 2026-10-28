import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { insertLoanSchemeFromMaster } from "@/lib/loan-scheme-import"

/* ── GET: master schemes + already-imported names ─────────────────── */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const module = req.nextUrl.searchParams.get("module")
  if (!module || !["savings", "deposits", "loans"].includes(module)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 })
  }

  try {
    const masterTable =
      module === "savings"  ? "savings_scheme_master"  :
      module === "deposits" ? "deposit_scheme_master"  :
                              "loan_scheme_master"

    const { rows: masters } = await pool.query(
      `SELECT * FROM ${masterTable} ORDER BY scheme_id`
    )

    // Scheme names already imported for this branch so the UI can grey them out
    const opTable =
      module === "savings"  ? "savings_schemes"  :
      module === "deposits" ? "deposit_schemes"  :
                              "loan_schemes"

    const { rows: imported } = await pool.query(
      `SELECT scheme_name FROM ${opTable} WHERE branch_id = $1`,
      [session.branch]
    )
    const importedNames: string[] = imported.map((r: any) => r.scheme_name)

    return NextResponse.json({ success: true, masters, importedNames })
  } catch (error: any) {
    console.error("GET /api/admin/add-scheme:", error)
    return NextResponse.json({ error: "Failed to fetch scheme masters" }, { status: 500 })
  }
}

/* ── POST: copy a master record into the branch scheme table ─────── */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const branchId = session.branch

  try {
    const { module, masterId } = await req.json()

    if (!module || !masterId) {
      return NextResponse.json({ error: "module and masterId are required" }, { status: 400 })
    }
    if (!["savings", "deposits", "loans"].includes(module)) {
      return NextResponse.json({ error: "Invalid module" }, { status: 400 })
    }

    /* fetch the master record */
    const masterTable =
      module === "savings"  ? "savings_scheme_master"  :
      module === "deposits" ? "deposit_scheme_master"  :
                              "loan_scheme_master"

    const { rows: masterRows } = await pool.query(
      `SELECT * FROM ${masterTable} WHERE id = $1`, [masterId]
    )
    if (masterRows.length === 0) {
      return NextResponse.json({ error: "Master record not found" }, { status: 404 })
    }
    const m = masterRows[0]   // all three tables use scheme_name (not master_name)

    let newScheme: any

    /* ── Savings ──────────────────────────────────────────────────── */
    if (module === "savings") {
      // savings_scheme_master already carries interest_code (FK → savings_interest_codes)
      const { rows: idRows } = await pool.query(
        `SELECT COALESCE(MAX(scheme_id), 10000) + 1 AS next_id
           FROM savings_schemes WHERE branch_id = $1`,
        [branchId]
      )
      const { rows } = await pool.query(
        `INSERT INTO savings_schemes (
           branch_id, scheme_id, scheme_name, scheme_description,
           min_balance, interest_code, interest_rate,
           minimum_deposit, maximum_deposit,
           interest_frequency, interest_calculation_method, interest_rounding,
           minimum_balance_for_interest, minimum_interest_payable,
           savings_gl_account, interest_payable_gl_account, interest_paid_gl_account,
           minimum_age, maximum_age, is_staff_only, scheme_status
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
         ) RETURNING *`,
        [
          branchId,
          m.scheme_id,
          m.scheme_name,
          m.scheme_description   || null,
          Number(m.min_balance)  || 0,
          m.interest_code,                               // stored in master (FK-validated)
          Number(m.interest_rate) || 0,
          Number(m.minimum_deposit) || 0,
          Number(m.maximum_deposit) || 0,
          m.interest_frequency          || "QUARTERLY",
          m.interest_calculation_method || "DAILY_BALANCE",
          m.interest_rounding           || "ROUND",
          Number(m.minimum_balance_for_interest) || 0,
          Number(m.minimum_interest_payable)     || 0,
          m.savings_gl_account          || "",           // bigint in master, varchar in op table
          m.interest_payable_gl_account || "",
          m.interest_paid_gl_account    || "",
          Number(m.minimum_age) || 0,
          Number(m.maximum_age) || 0,
          m.is_staff_only  ?? false,
          m.scheme_status  || "ACTIVE",
        ]
      )
      newScheme = rows[0]

    /* ── Deposits ─────────────────────────────────────────────────── */
    } else if (module === "deposits") {
      // deposit_scheme_master uses interest_policy_id; deposit_schemes calls it interest_code
      const { rows: idRows } = await pool.query(
        `SELECT COALESCE(MAX(scheme_id), 22000) + 1 AS next_id
           FROM deposit_schemes WHERE branch_id = $1`,
        [branchId]
      )
      const { rows } = await pool.query(
        `INSERT INTO deposit_schemes (
           branch_id, scheme_id, scheme_name, scheme_description, deposit_type,
           minimum_deposit, maximum_deposit,
           minimum_period_months, maximum_period_months,
           minimum_period_days, maximum_period_days,
           installment_frequency, minimum_installment_amount, maximum_installment_amount,
           penal_rate, collection_frequency, agent_commission_percent,
           interest_policy_id, interest_rate, interest_frequency,
           interest_calculation_method, compounding_frequency, interest_rounding,
           minimum_interest_payable,
           premature_closure_allowed, premature_penal_rate,
           auto_renewal_allowed, tds_applicable,
           deposit_gl_account, interest_payable_gl_account,
           interest_expense_gl_account, penal_interest_gl_account,
           minimum_age, maximum_age, is_staff_only, scheme_status
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
           $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,
           $33,$34,$35,$36
         ) RETURNING *`,
        [
          branchId,
          m.scheme_id,
          m.scheme_name,
          m.scheme_description || null,
          m.deposit_type       || "TERM",
          Number(m.minimum_deposit) || 0,
          Number(m.maximum_deposit) || 0,
          Number(m.minimum_period_months) || 0,
          Number(m.maximum_period_months) || 0,
          Number(m.minimum_period_days)   || 0,
          Number(m.maximum_period_days)   || 0,
          m.installment_frequency || null,
          Number(m.minimum_installment_amount) || 0,
          Number(m.maximum_installment_amount) || 0,
          Number(m.penal_rate)             || 0,
          m.collection_frequency           || null,
          Number(m.agent_commission_percent) || 0,
          m.interest_policy_id             || "",   // deposit_scheme_master → deposit_schemes.interest_code
          Number(m.interest_rate)          || 0,
          m.interest_frequency             || "ON_MATURITY",
          m.interest_calculation_method    || "SIMPLE",
          m.compounding_frequency          || null,
          m.interest_rounding              || "NEAREST",
          Number(m.minimum_interest_payable) || 0,
          m.premature_closure_allowed ?? true,
          Number(m.premature_penal_rate)   || 0,
          m.auto_renewal_allowed ?? false,
          m.tds_applicable       ?? false,
          m.deposit_gl_account             || "",
          m.interest_payable_gl_account    || "",
          m.interest_expense_gl_account    || "",
          m.penal_interest_gl_account      || null,
          Number(m.minimum_age) || 0,
          Number(m.maximum_age) || 0,
          m.is_staff_only ?? false,
          m.scheme_status || "ACTIVE",
        ]
      )
      newScheme = rows[0]

    /* ── Loans ────────────────────────────────────────────────────── */
    } else {
      newScheme = await insertLoanSchemeFromMaster(pool, branchId, m)
    }

    return NextResponse.json({ success: true, scheme: newScheme })
  } catch (error: any) {
    console.error("POST /api/admin/add-scheme:", error)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This scheme has already been imported for your branch." },
        { status: 409 }
      )
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Invalid reference — verify GL accounts and interest codes exist." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message || "Failed to import scheme" }, { status: 500 })
  }
}
