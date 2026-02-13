import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function GET() {
  const c = (await cookies()).get("banker_session")
  if (!c) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const u = JSON.parse(c.value)
  console.log("User data:", u)
  try {
    let query = `
      SELECT
          m.id,
          c.customer_code,
          c.full_name,
          c.father_name,
          c.date_of_birth,
          c.gender,
          c.mobile_no,
          m.membership_class,
          m.status,
          m.branch_id,
          m.join_date
      FROM memberships m
      INNER JOIN customers c
          ON c.customer_code = m.customer_code

    `
    const values: any[] = []

    // Non-admin → branch restricted
    if (u.role !== "admin") {
      query += ` WHERE m.branch_id = $1`
      values.push(u.branch)
    }

    query += ` ORDER BY m.join_date DESC`
    const { rows } = await pool.query(query, values)

    return NextResponse.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch members" },
      { status: 500 }
    )
  }
}