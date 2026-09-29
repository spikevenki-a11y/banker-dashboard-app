import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const appraiserId = Number(id)
  if (!appraiserId) return NextResponse.json({ error: "Invalid appraiser id" }, { status: 400 })

  try {
    const { rows } = await pool.query(
      `SELECT h.history_id, h.action, h.changes,
              h.appraiser_code, h.appraiser_name, h.license_no,
              TO_CHAR(h.license_valid_till, 'YYYY-MM-DD') AS license_valid_till,
              h.mobile_no, h.email, h.address, h.status,
              h.changed_by, COALESCE(u.full_name, h.changed_by) AS changed_by_name,
              h.changed_at
       FROM appraiser_master_history h
       LEFT JOIN users u ON u.id::text = h.changed_by
       WHERE h.appraiser_id = $1 AND h.branch_id = $2
       ORDER BY h.changed_at DESC, h.history_id DESC`,
      [appraiserId, session.branch]
    )

    return NextResponse.json({ success: true, history: rows })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch appraiser history: " + error.message }, { status: 500 })
  }
}
