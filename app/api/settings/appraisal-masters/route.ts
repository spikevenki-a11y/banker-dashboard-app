import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // appraisal_master has no branch_id; charge masters are shared across branches
  try {
    const { rows } = await pool.query(
      `SELECT am.id, am.appraisal_master_id, am.appraisal_name, am.description,
              TO_CHAR(am.effective_from, 'YYYY-MM-DD') AS effective_from,
              TO_CHAR(am.effective_to, 'YYYY-MM-DD') AS effective_to,
              am.status, am.created_by, am.created_date,
              am.appraiser_amount_receive_account_number,
              (SELECT COUNT(*)::int FROM appraisal_slab s
                WHERE s.appraisal_master_id = am.appraisal_master_id) AS slab_count
       FROM appraisal_master am
       ORDER BY am.appraisal_master_id`
    )

    return NextResponse.json({ success: true, appraisalMasters: rows })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch appraisal masters: " + error.message }, { status: 500 })
  }
}
