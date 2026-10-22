import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [schemes, securityTypes, mappings] = await Promise.all([
      pool.query(
        `SELECT scheme_id, scheme_name, loan_type, scheme_status
         FROM loan_schemes
         WHERE branch_id = $1
         ORDER BY scheme_id`,
        [session.branch]
      ),
      pool.query(
        `SELECT security_id, security_name, security_code, is_active, requires_valuation
         FROM loan_scheme_security_master
         ORDER BY security_id`
      ),
      pool.query(
        `SELECT DISTINCT scheme_id, security_id
         FROM loan_scheme_security_mapping
         WHERE branch_id = $1`,
        [session.branch]
      ),
    ])

    return NextResponse.json({
      success: true,
      schemes: schemes.rows,
      securityTypes: securityTypes.rows,
      mappings: mappings.rows,
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch configuration: " + error.message }, { status: 500 })
  }
}

// Replaces the full set of security types allowed for one scheme
export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const { scheme_id, security_ids } = await req.json()

    const schemeId = Number(scheme_id)
    if (!schemeId) return NextResponse.json({ error: "Invalid scheme" }, { status: 400 })
    if (!Array.isArray(security_ids)) {
      return NextResponse.json({ error: "security_ids must be a list" }, { status: 400 })
    }
    const securityIds = [...new Set(security_ids.map(Number))]
    if (securityIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({ error: "Invalid security type" }, { status: 400 })
    }

    const { rowCount: schemeFound } = await client.query(
      `SELECT 1 FROM loan_schemes WHERE branch_id = $1 AND scheme_id = $2`,
      [session.branch, schemeId]
    )
    if (!schemeFound) return NextResponse.json({ error: "Loan scheme not found" }, { status: 404 })

    if (securityIds.length > 0) {
      const { rows: valid } = await client.query(
        `SELECT security_id FROM loan_scheme_security_master
         WHERE security_id = ANY($1::int[]) AND is_active = TRUE`,
        [securityIds]
      )
      if (valid.length !== securityIds.length) {
        return NextResponse.json({ error: "One or more security types are invalid or inactive" }, { status: 400 })
      }
    }

    await client.query("BEGIN")

    await client.query(
      `DELETE FROM loan_scheme_security_mapping
       WHERE branch_id = $1 AND scheme_id = $2
         AND NOT (security_id = ANY($3::int[]))`,
      [session.branch, schemeId, securityIds]
    )

    if (securityIds.length > 0) {
      await client.query(
        `INSERT INTO loan_scheme_security_mapping (branch_id, scheme_id, security_id, created_by)
         SELECT $1, $2, s.security_id, $4
         FROM unnest($3::int[]) AS s(security_id)
         WHERE NOT EXISTS (
           SELECT 1 FROM loan_scheme_security_mapping m
           WHERE m.branch_id = $1 AND m.scheme_id = $2 AND m.security_id = s.security_id
         )`,
        [session.branch, schemeId, securityIds, session.userId]
      )
    }

    await client.query("COMMIT")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {})
    return NextResponse.json({ error: "Failed to save configuration: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
