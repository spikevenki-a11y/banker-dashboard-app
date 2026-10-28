import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { insertLoanSchemeFromMaster } from "@/lib/loan-scheme-import"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Master schemes (left column) and the schemes already mapped to this branch (right column)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [masters, branchSchemes] = await Promise.all([
      pool.query(
        `SELECT id, scheme_id, scheme_name, scheme_description, loan_type, interest_rate,
                minimum_period_months, maximum_period_months, scheme_status
         FROM loan_scheme_master
         ORDER BY scheme_id`
      ),
      pool.query(
        `SELECT id, scheme_id, scheme_name, loan_type, interest_rate,
                minimum_loan_amount, maximum_loan_amount, scheme_status
         FROM loan_schemes
         WHERE branch_id = $1
         ORDER BY scheme_id`,
        [session.branch]
      ),
    ])

    return NextResponse.json({ success: true, masters: masters.rows, branchSchemes: branchSchemes.rows })
  } catch (error: any) {
    console.error("GET /api/settings/loan-schemes:", error)
    return NextResponse.json({ error: "Failed to fetch loan schemes" }, { status: 500 })
  }
}

// Maps the selected master schemes to the current branch.
// Schemes the branch already has are skipped, not duplicated.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let masterIds: string[]
  try {
    const body = await req.json()
    if (!Array.isArray(body?.master_ids)) throw new Error()
    masterIds = [...new Set(body.master_ids.map(String))] as string[]
  } catch {
    return NextResponse.json({ error: "master_ids must be a list" }, { status: 400 })
  }
  if (masterIds.length === 0) return NextResponse.json({ error: "Select at least one scheme" }, { status: 400 })
  if (masterIds.some((id) => !UUID_RE.test(id))) {
    return NextResponse.json({ error: "Invalid scheme selection" }, { status: 400 })
  }

  const branchId = session.branch
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    // Serialise saves per branch so two concurrent saves can't both insert the same scheme
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('loan_schemes'), hashtext($1::text))`, [String(branchId)])

    const { rows: masters } = await client.query(
      `SELECT * FROM loan_scheme_master WHERE id = ANY($1::uuid[]) ORDER BY scheme_id`,
      [masterIds]
    )
    if (masters.length !== masterIds.length) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "One or more selected schemes no longer exist" }, { status: 404 })
    }

    // Existing rows that clash on scheme_id or scheme_name, in this branch or another
    const { rows: existing } = await client.query(
      `SELECT scheme_id, scheme_name, branch_id::text AS branch_id
       FROM loan_schemes
       WHERE scheme_id = ANY($1::int[]) OR scheme_name = ANY($2::text[])`,
      [masters.map((m) => m.scheme_id), masters.map((m) => m.scheme_name)]
    )

    const added: any[] = []
    const skipped: { scheme_name: string; reason: string }[] = []

    for (const m of masters) {
      const clashes = existing.filter((e) => e.scheme_id === m.scheme_id || e.scheme_name === m.scheme_name)
      if (clashes.some((e) => e.branch_id === String(branchId))) {
        skipped.push({ scheme_name: m.scheme_name, reason: "Already assigned to this branch" })
        continue
      }
      if (clashes.length > 0) {
        // loan_schemes has table-wide unique keys on scheme_id and scheme_name
        skipped.push({ scheme_name: m.scheme_name, reason: "Already assigned to another branch" })
        continue
      }
      const row = await insertLoanSchemeFromMaster(client, branchId, m)
      added.push({ scheme_id: row.scheme_id, scheme_name: row.scheme_name })
    }

    await client.query("COMMIT")
    return NextResponse.json({ success: true, added, skipped })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("POST /api/settings/loan-schemes:", error)
    if (error.code === "23505") {
      return NextResponse.json({ error: "This scheme is already assigned." }, { status: 409 })
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Invalid reference — verify GL accounts and interest codes exist." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to save loan schemes" }, { status: 500 })
  } finally {
    client.release()
  }
}
