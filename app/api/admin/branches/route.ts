import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const result = await pool.query(
      `SELECT * FROM branchparameters ORDER BY branch_id ASC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("[v0] Error fetching branches:", error)
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { branch_name, branch_code, city, state, phone_number, email, is_head_office } = await request.json()

    const result = await pool.query(
      `INSERT INTO branchparameters
         (branch_name, branch_code, city, state, phone_number, email, is_head_office, bank_name, bank_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        branch_name,
        branch_code,
        city,
        state,
        phone_number,
        email,
        is_head_office,
        "NextZen Bank",
        is_head_office ? "H" : "B",
      ]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("[v0] Error creating branch:", error)
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 })
  }
}
