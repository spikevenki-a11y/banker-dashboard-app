import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch

    const { rows } = await pool.query(
      `SELECT bank_name, branch_name, address, city, state, postal_code, phone_number, email
       FROM branchparameters WHERE branch_id = $1`,
      [branchId]
    )

    if (rows.length === 0) return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
