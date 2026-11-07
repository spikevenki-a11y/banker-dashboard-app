import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

const MAX_NAME_LENGTH = 255

// Optional ?schemeId= limits schemes and mappings to that one scheme
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const schemeParam = new URL(req.url).searchParams.get("schemeId")
    const schemeId = schemeParam ? Number(schemeParam) : null
    if (schemeParam && !Number.isInteger(schemeId)) {
      return NextResponse.json({ error: "Invalid scheme" }, { status: 400 })
    }

    const [schemes, purposes, mappings] = await Promise.all([
      pool.query(
        `SELECT scheme_id, scheme_name, loan_type, scheme_status
         FROM loan_schemes
         WHERE branch_id = $1 AND ($2::int IS NULL OR scheme_id = $2)
         ORDER BY scheme_id`,
        [session.branch, schemeId]
      ),
      pool.query(
        `SELECT purpose_id, purpose_name, is_active
         FROM loan_purpose_master
         ORDER BY purpose_id`
      ),
      pool.query(
        `SELECT DISTINCT scheme_id, purpose_id
         FROM loan_scheme_purpose_mapping
         WHERE branch_id = $1 AND ($2::int IS NULL OR scheme_id = $2)`,
        [session.branch, schemeId]
      ),
    ])

    if (schemeId && schemes.rows.length === 0) {
      return NextResponse.json({ error: "Loan scheme not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      schemes: schemes.rows,
      purposes: purposes.rows,
      mappings: mappings.rows,
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch purpose mapping: " + error.message }, { status: 500 })
  }
}

// Replaces the full set of purposes allowed for one scheme
export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const { scheme_id, purpose_ids } = await req.json()

    const schemeId = Number(scheme_id)
    if (!schemeId) return NextResponse.json({ error: "Invalid scheme" }, { status: 400 })
    if (!Array.isArray(purpose_ids)) {
      return NextResponse.json({ error: "purpose_ids must be a list" }, { status: 400 })
    }
    const purposeIds = [...new Set(purpose_ids.map(Number))]
    if (purposeIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({ error: "Invalid loan purpose" }, { status: 400 })
    }

    const { rowCount: schemeFound } = await client.query(
      `SELECT 1 FROM loan_schemes WHERE branch_id = $1 AND scheme_id = $2`,
      [session.branch, schemeId]
    )
    if (!schemeFound) return NextResponse.json({ error: "Loan scheme not found" }, { status: 404 })

    // New mappings must be active purposes; already-mapped inactive ones may be kept
    if (purposeIds.length > 0) {
      const { rows: valid } = await client.query(
        `SELECT pm.purpose_id FROM loan_purpose_master pm
         WHERE pm.purpose_id = ANY($1::int[])
           AND (pm.is_active = TRUE OR EXISTS (
             SELECT 1 FROM loan_scheme_purpose_mapping m
             WHERE m.branch_id = $2 AND m.scheme_id = $3 AND m.purpose_id = pm.purpose_id
           ))`,
        [purposeIds, session.branch, schemeId]
      )
      if (valid.length !== purposeIds.length) {
        return NextResponse.json({ error: "One or more loan purposes are invalid or inactive" }, { status: 400 })
      }
    }

    await client.query("BEGIN")

    await client.query(
      `DELETE FROM loan_scheme_purpose_mapping
       WHERE branch_id = $1 AND scheme_id = $2
         AND NOT (purpose_id = ANY($3::int[]))`,
      [session.branch, schemeId, purposeIds]
    )

    if (purposeIds.length > 0) {
      await client.query(
        `INSERT INTO loan_scheme_purpose_mapping (branch_id, scheme_id, purpose_id, created_by)
         SELECT $1, $2, p.purpose_id, $4
         FROM unnest($3::int[]) AS p(purpose_id)
         ON CONFLICT (branch_id, scheme_id, purpose_id) DO NOTHING`,
        [session.branch, schemeId, purposeIds, session.userId]
      )
    }

    await client.query("COMMIT")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {})
    return NextResponse.json({ error: "Failed to save purpose mapping: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}

// Adds a new purpose to the master
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const { purpose_name } = await req.json()
    const name = String(purpose_name ?? "").trim().replace(/\s+/g, " ")
    if (!name) return NextResponse.json({ error: "Purpose name is required" }, { status: 400 })
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Purpose name must be at most ${MAX_NAME_LENGTH} characters` }, { status: 400 })
    }

    await client.query("BEGIN")
    // purpose_id is assigned manually; lock so two adds can't pick the same id
    await client.query("LOCK TABLE loan_purpose_master IN SHARE ROW EXCLUSIVE MODE")

    const { rowCount: duplicate } = await client.query(
      `SELECT 1 FROM loan_purpose_master WHERE LOWER(TRIM(purpose_name)) = LOWER($1)`,
      [name]
    )
    if (duplicate) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "A loan purpose with this name already exists" }, { status: 409 })
    }

    const { rows } = await client.query(
      `INSERT INTO loan_purpose_master (purpose_id, purpose_name, is_active, created_by)
       SELECT COALESCE(MAX(purpose_id), 0) + 1, $1, TRUE, $2 FROM loan_purpose_master
       RETURNING purpose_id, purpose_name, is_active`,
      [name, session.userId]
    )

    await client.query("COMMIT")
    return NextResponse.json({ success: true, purpose: rows[0] })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {})
    return NextResponse.json({ error: "Failed to add loan purpose: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}

// Renames a purpose and/or activates or deactivates it
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { purpose_id, purpose_name, is_active } = await req.json()
    const purposeId = Number(purpose_id)
    if (!Number.isInteger(purposeId) || purposeId <= 0) {
      return NextResponse.json({ error: "Invalid loan purpose" }, { status: 400 })
    }

    let name: string | null = null
    if (purpose_name !== undefined) {
      name = String(purpose_name ?? "").trim().replace(/\s+/g, " ")
      if (!name) return NextResponse.json({ error: "Purpose name is required" }, { status: 400 })
      if (name.length > MAX_NAME_LENGTH) {
        return NextResponse.json({ error: `Purpose name must be at most ${MAX_NAME_LENGTH} characters` }, { status: 400 })
      }
      const { rowCount: duplicate } = await pool.query(
        `SELECT 1 FROM loan_purpose_master
         WHERE LOWER(TRIM(purpose_name)) = LOWER($1) AND purpose_id <> $2`,
        [name, purposeId]
      )
      if (duplicate) {
        return NextResponse.json({ error: "A loan purpose with this name already exists" }, { status: 409 })
      }
    }
    if (is_active !== undefined && typeof is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be true or false" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `UPDATE loan_purpose_master
       SET purpose_name = COALESCE($2, purpose_name),
           is_active = COALESCE($3, is_active)
       WHERE purpose_id = $1
       RETURNING purpose_id, purpose_name, is_active`,
      [purposeId, name, is_active ?? null]
    )
    if (rows.length === 0) return NextResponse.json({ error: "Loan purpose not found" }, { status: 404 })

    return NextResponse.json({ success: true, purpose: rows[0] })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update loan purpose: " + error.message }, { status: 500 })
  }
}
