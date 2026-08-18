import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const membershipNo = searchParams.get("membership_no")
    const type = searchParams.get("type") // DEPOSIT | WITHDRAWAL
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!membershipNo) {
      return NextResponse.json({ error: "Membership number is required" }, { status: 400 })
    }

    const conditions = ["mst.membership_no = $1", "mst.branch_id = $2"]
    const params: any[] = [membershipNo, branchId]

    if (type === "DEPOSIT") {
      conditions.push("mst.credit_amount > 0")
    } else if (type === "WITHDRAWAL") {
      conditions.push("mst.debit_amount > 0")
    }

    params.push(limit)

    const { rows: transactions } = await pool.query(
      `SELECT mst.*
       FROM member_share_transactions mst
       WHERE ${conditions.join(" AND ")}
       ORDER BY mst.business_date DESC, mst.created_at DESC
       LIMIT $${params.length}`,
      params
    )

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Failed to fetch share transactions:", error)
    return NextResponse.json({ error: "Failed to fetch share transactions" }, { status: 500 })
  }
}
