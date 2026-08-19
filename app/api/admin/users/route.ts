import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, empid, full_name, role, is_active, created_at
       FROM users
       ORDER BY created_at DESC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("[v0] Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { empid, full_name, role, password } = await request.json()

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO users (empid, full_name, role, password, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [empid, full_name, role, hashedPassword, true]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("[v0] Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, is_active } = await request.json()

    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("[v0] Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
