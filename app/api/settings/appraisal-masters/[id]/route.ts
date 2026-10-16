import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// appraisal_master_id is not editable: appraisal_slab and loan_schemes reference it
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid appraisal master id" }, { status: 400 })

  try {
    const { appraisal_name, description, effective_from, effective_to, status, appraiser_amount_receive_account_number } =
      await req.json()

    if (!appraisal_name?.trim()) {
      return NextResponse.json({ error: "Appraisal name is required" }, { status: 400 })
    }
    if (effective_from && effective_to && effective_to < effective_from) {
      return NextResponse.json({ error: "Effective To cannot be before Effective From" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `UPDATE appraisal_master
       SET appraisal_name = $1, description = $2, effective_from = $3, effective_to = $4,
           status = $5, appraiser_amount_receive_account_number = $6
       WHERE id = $7
       RETURNING id`,
      [
        appraisal_name.trim(),
        description?.trim() || null,
        effective_from || null,
        effective_to || null,
        status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        appraiser_amount_receive_account_number?.trim() || null,
        id,
      ]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Appraisal master not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update appraisal master: " + error.message }, { status: 500 })
  }
}
