import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    let query = "SELECT * FROM members"
    const params: (string | number)[] = []

    if (session?.role !== "admin" && session?.branch) {
      const branchId =
        typeof session.branch === "string"
          ? Number.parseInt(session.branch)
          : session.branch
      if (!isNaN(branchId)) {
        query += " WHERE branch_id = $1"
        params.push(branchId)
      }
    }

    query += " ORDER BY joined_date DESC"

    const { rows } = await pool.query(query, params)

    return NextResponse.json(rows, { status: 200 })
  } catch (error) {
    console.error("Failed to fetch members:", error)
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    )
  }
}
