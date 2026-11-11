import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { getCurrentGoldGuideline, getGoldGuidelineHistory } from "@/lib/gold-guideline"

// Gold Guidelines Value per Gram for the user's branch.
// GET: current value (null if never set) and the change history.
// POST: set a new value; earlier values are kept as history.

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [current, history] = await Promise.all([
      getCurrentGoldGuideline(pool, session.branch),
      getGoldGuidelineHistory(pool, session.branch),
    ])
    return NextResponse.json({ success: true, current, history })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load gold guidelines value: " + error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const raw = body?.value_per_gram
    const value = raw === "" || raw === null || raw === undefined ? NaN : Number(raw)
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Guidelines value per gram must be greater than zero" }, { status: 400 })
    }
    if (value > 9999999999.99) {
      return NextResponse.json({ error: "Guidelines value per gram is too large" }, { status: 400 })
    }
    if (!/^\d+(\.\d{1,2})?$/.test(String(raw).trim())) {
      return NextResponse.json({ error: "Guidelines value per gram can have at most 2 decimal places" }, { status: 400 })
    }
    const remarks = typeof body?.remarks === "string" ? body.remarks.trim().slice(0, 255) : ""

    const current = await getCurrentGoldGuideline(pool, session.branch)
    if (current && Number(current.value_per_gram) === value) {
      return NextResponse.json({ error: "This is already the current guidelines value" }, { status: 400 })
    }

    await pool.query(
      `INSERT INTO gold_guideline_values (branch_id, value_per_gram, effective_from, remarks, created_by)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5)`,
      [Number(session.branch), value, session.businessDate || null, remarks || null, session.userId]
    )

    const [next, history] = await Promise.all([
      getCurrentGoldGuideline(pool, session.branch),
      getGoldGuidelineHistory(pool, session.branch),
    ])
    return NextResponse.json({ success: true, current: next, history })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save gold guidelines value: " + error.message }, { status: 500 })
  }
}
