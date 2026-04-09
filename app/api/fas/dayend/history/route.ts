import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function GET() {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const branchId = u.branch

  try {
    const { rows } = await pool.query(
      `SELECT
        dl.id,
        dl.business_date,
        dl.next_business_date,
        dl.status,
        dl.initiated_at,
        dl.completed_at,
        dl.error_message,
        su.full_name   AS initiated_by_name,
        su.employee_code AS initiated_by_emp_code,
        COUNT(dsl.id)  AS total_steps,
        COUNT(CASE WHEN dsl.status = 'DONE'   THEN 1 END) AS done_steps,
        COUNT(CASE WHEN dsl.status = 'FAILED' THEN 1 END) AS failed_steps
       FROM dayend_log dl
       LEFT JOIN staff_users su ON su.id = dl.initiated_by
       LEFT JOIN dayend_step_log dsl ON dsl.dayend_id = dl.id
       WHERE dl.branch_id = $1
       GROUP BY dl.id, su.full_name, su.employee_code
       ORDER BY dl.business_date DESC, dl.initiated_at DESC
       LIMIT 30`,
      [branchId]
    )

    return NextResponse.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        businessDate: r.business_date,
        nextBusinessDate: r.next_business_date,
        status: r.status,
        initiatedAt: r.initiated_at,
        completedAt: r.completed_at,
        errorMessage: r.error_message,
        initiatedByName: r.initiated_by_name || "N/A",
        initiatedByEmpCode: r.initiated_by_emp_code || "",
        totalSteps: Number(r.total_steps),
        doneSteps: Number(r.done_steps),
        failedSteps: Number(r.failed_steps),
      })),
    })
  } catch (e) {
    console.error("Dayend history error:", e)
    return NextResponse.json({ error: "Failed to load day-end history" }, { status: 500 })
  }
}
