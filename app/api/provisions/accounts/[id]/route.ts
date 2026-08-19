import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const branchId = session.branch
    const { id } = await params

    const { rows: [account] } = await pool.query(
      `SELECT * FROM provisions_master WHERE uuid = $1 AND branch_id = $2`,
      [id, branchId]
    )

    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    return NextResponse.json({ data: account })
  } catch (error: any) {
    console.error("Provisions GET Account [id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
