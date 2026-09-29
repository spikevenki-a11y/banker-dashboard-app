import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { diffAppraiser, historyAction, recordAppraiserHistory } from "@/lib/appraiser-history"

const SNAPSHOT_COLUMNS = `appraiser_code, appraiser_name, license_no,
       TO_CHAR(license_valid_till, 'YYYY-MM-DD') AS license_valid_till,
       mobile_no, email, address, status`

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const appraiserId = Number(id)
  if (!appraiserId) return NextResponse.json({ error: "Invalid appraiser id" }, { status: 400 })

  const client = await pool.connect()
  try {
    const { appraiser_code, appraiser_name, license_no, license_valid_till, mobile_no, email, address, status } =
      await req.json()

    if (!appraiser_code?.trim() || !appraiser_name?.trim()) {
      return NextResponse.json({ error: "Appraiser code and name are required" }, { status: 400 })
    }

    await client.query("BEGIN")

    const { rows: beforeRows } = await client.query(
      `SELECT ${SNAPSHOT_COLUMNS} FROM appraiser_master
       WHERE appraiser_id = $1 AND branch_id = $2
       FOR UPDATE`,
      [appraiserId, session.branch]
    )

    if (beforeRows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Appraiser not found" }, { status: 404 })
    }

    const { rows: afterRows } = await client.query(
      `UPDATE appraiser_master
       SET appraiser_code = $1, appraiser_name = $2, license_no = $3, license_valid_till = $4,
           mobile_no = $5, email = $6, address = $7, status = $8,
           updated_by = $9, updated_at = now()
       WHERE appraiser_id = $10 AND branch_id = $11
       RETURNING ${SNAPSHOT_COLUMNS}`,
      [
        appraiser_code.trim().toUpperCase(),
        appraiser_name.trim(),
        license_no?.trim() || null,
        license_valid_till || null,
        mobile_no?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        session.userId,
        appraiserId,
        session.branch,
      ]
    )

    const changes = diffAppraiser(beforeRows[0], afterRows[0])
    if (Object.keys(changes).length > 0) {
      await recordAppraiserHistory(client, appraiserId, historyAction(changes), changes, session.userId)
    }

    await client.query("COMMIT")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query("ROLLBACK")
    if (error.code === "23505") {
      return NextResponse.json({ error: "Appraiser code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to update appraiser: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
