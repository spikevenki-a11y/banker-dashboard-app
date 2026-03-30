import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const { id } = await params

    const { rows: [account] } = await pool.query(
      `SELECT * FROM reserve_and_fund_master WHERE uuid = $1 AND branch_id = $2`,
      [id, branchId]
    )

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ data: account })
  } catch (error: any) {
    console.error("Reserve & Fund GET Account [id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
