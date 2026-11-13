import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { recordAppraiserHistory, validateAccount } from "@/lib/appraiser-history"
import { findIncomeAccount } from "@/lib/appraiser-account"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ?status=ACTIVE limits the list to active appraisers (used by loan application)
  const status = new URL(req.url).searchParams.get("status")

  try {
    const { rows } = await pool.query(
      `SELECT am.appraiser_id, am.appraiser_code, am.appraiser_name, am.license_no,
              TO_CHAR(am.license_valid_till, 'YYYY-MM-DD') AS license_valid_till,
              am.mobile_no, am.email, am.address,
              am.account_number::text AS account_number, am.account_type,
              am.income_account_code::text AS income_account_code,
              coa.accountname AS income_account_name,
              am.status
       FROM appraiser_master am
       LEFT JOIN chart_of_accounts coa
              ON coa.branch_id = am.branch_id AND coa.accountcode = am.income_account_code
       WHERE am.branch_id = $1
         AND ($2::text IS NULL OR am.status = $2)
       ORDER BY am.appraiser_code`,
      [session.branch, status === "ACTIVE" || status === "INACTIVE" ? status : null]
    )

    return NextResponse.json({ success: true, appraisers: rows })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch appraisers: " + error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const {
      appraiser_code, appraiser_name, license_no, license_valid_till, mobile_no, email, address,
      account_number, account_type, income_account_code, status,
    } = await req.json()

    if (!appraiser_code?.trim() || !appraiser_name?.trim()) {
      return NextResponse.json({ error: "Appraiser code and name are required" }, { status: 400 })
    }
    const accountError = validateAccount(account_number, account_type, income_account_code)
    if (accountError) return NextResponse.json({ error: accountError }, { status: 400 })
    const incomeCode = String(income_account_code ?? "").trim() || null
    if (incomeCode) {
      const income = await findIncomeAccount(client, session.branch, incomeCode)
      if (income.error) return NextResponse.json({ error: income.error }, { status: 400 })
    }

    await client.query("BEGIN")

    const { rows } = await client.query(
      `INSERT INTO appraiser_master
         (branch_id, appraiser_code, appraiser_name, license_no, license_valid_till,
          mobile_no, email, address, account_number, account_type, income_account_code, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING appraiser_id`,
      [
        session.branch,
        appraiser_code.trim().toUpperCase(),
        appraiser_name.trim(),
        license_no?.trim() || null,
        license_valid_till || null,
        mobile_no?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        String(account_number ?? "").trim() || null,
        account_type || null,
        incomeCode,
        status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        session.userId,
      ]
    )

    await recordAppraiserHistory(client, rows[0].appraiser_id, "CREATED", null, session.userId)

    await client.query("COMMIT")
    return NextResponse.json({ success: true, appraiser_id: rows[0].appraiser_id })
  } catch (error: any) {
    await client.query("ROLLBACK")
    if (error.code === "23505") {
      return NextResponse.json({ error: "Appraiser code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create appraiser: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
