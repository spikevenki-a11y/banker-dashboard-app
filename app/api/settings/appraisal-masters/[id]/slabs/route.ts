import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { findOverlappingSlab, parseSlabInput, resolveMasterId, SLAB_COLUMNS } from "@/lib/appraisal-slab"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const masterId = await resolveMasterId(pool, id)
    if (masterId === null) return NextResponse.json({ error: "Appraisal master not found" }, { status: 404 })

    const { rows } = await pool.query(
      `SELECT ${SLAB_COLUMNS} FROM appraisal_slab
       WHERE appraisal_master_id = $1
       ORDER BY loan_amount_from, appraisal_slab_id`,
      [masterId]
    )

    return NextResponse.json({ success: true, slabs: rows })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch appraisal slabs: " + error.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const parsed = parseSlabInput(await req.json())
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    // Serialise slab writes so the overlap check and the next slab id stay consistent
    await client.query("LOCK TABLE appraisal_slab IN SHARE ROW EXCLUSIVE MODE")

    const masterId = await resolveMasterId(client, id)
    if (masterId === null) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Appraisal master not found" }, { status: 404 })
    }

    if (parsed.status === "ACTIVE") {
      const overlap = await findOverlappingSlab(client, masterId, parsed, null)
      if (overlap) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: overlap }, { status: 400 })
      }
    }

    const { rows } = await client.query(
      `INSERT INTO appraisal_slab
         (appraisal_slab_id, appraisal_master_id, loan_amount_from, loan_amount_to,
          charge_type, charge_value, minimum_charge, maximum_charge, status, created_by, created_date)
       VALUES ((SELECT COALESCE(MAX(appraisal_slab_id), 0) + 1 FROM appraisal_slab),
               $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING ${SLAB_COLUMNS}`,
      [
        masterId,
        parsed.loan_amount_from,
        parsed.loan_amount_to,
        parsed.charge_type,
        parsed.charge_value,
        parsed.minimum_charge,
        parsed.maximum_charge,
        parsed.status,
        session.userId,
      ]
    )

    await client.query("COMMIT")
    return NextResponse.json({ success: true, slab: rows[0] })
  } catch (error: any) {
    await client.query("ROLLBACK")
    return NextResponse.json({ error: "Failed to add appraisal slab: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
