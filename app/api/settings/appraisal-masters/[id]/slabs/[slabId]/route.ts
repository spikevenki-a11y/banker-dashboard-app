import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { findOverlappingSlab, isUuid, parseSlabInput, resolveMasterId, SLAB_COLUMNS } from "@/lib/appraisal-slab"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; slabId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, slabId } = await params
  if (!isUuid(slabId)) return NextResponse.json({ error: "Invalid slab id" }, { status: 400 })

  const parsed = parseSlabInput(await req.json())
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("LOCK TABLE appraisal_slab IN SHARE ROW EXCLUSIVE MODE")

    const masterId = await resolveMasterId(client, id)
    if (masterId === null) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Appraisal master not found" }, { status: 404 })
    }

    if (parsed.status === "ACTIVE") {
      const overlap = await findOverlappingSlab(client, masterId, parsed, slabId)
      if (overlap) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: overlap }, { status: 400 })
      }
    }

    const { rows } = await client.query(
      `UPDATE appraisal_slab
       SET loan_amount_from = $1, loan_amount_to = $2, charge_type = $3, charge_value = $4,
           minimum_charge = $5, maximum_charge = $6, status = $7
       WHERE id = $8 AND appraisal_master_id = $9
       RETURNING ${SLAB_COLUMNS}`,
      [
        parsed.loan_amount_from,
        parsed.loan_amount_to,
        parsed.charge_type,
        parsed.charge_value,
        parsed.minimum_charge,
        parsed.maximum_charge,
        parsed.status,
        slabId,
        masterId,
      ]
    )

    if (rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Appraisal slab not found" }, { status: 404 })
    }

    await client.query("COMMIT")
    return NextResponse.json({ success: true, slab: rows[0] })
  } catch (error: any) {
    await client.query("ROLLBACK")
    return NextResponse.json({ error: "Failed to update appraisal slab: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
