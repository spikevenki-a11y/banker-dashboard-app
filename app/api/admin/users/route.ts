import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import bcrypt from "bcryptjs"
import { getSession } from "@/lib/auth/session"

const ALLOWED_ROLES = ["admin", "banker", "manager", "auditor"]

// Columns safe to return to the client. Never SELECT * / RETURNING * on the
// users table — it includes the bcrypt password hash.
const SAFE_COLUMNS = "id, empid, full_name, role, is_active, created_at"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const result = await pool.query(
      `SELECT ${SAFE_COLUMNS} FROM users ORDER BY created_at DESC`
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("[admin/users] Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { empid, full_name, role, password } = await request.json()

    if (!empid || typeof empid !== "string" || !empid.trim()) {
      return NextResponse.json({ error: "empid is required" }, { status: 400 })
    }
    if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
      return NextResponse.json({ error: "full_name is required" }, { status: 400 })
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: `role must be one of: ${ALLOWED_ROLES.join(", ")}` }, { status: 400 })
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO users (empid, full_name, role, password, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SAFE_COLUMNS}`,   // never RETURNING * — that includes the password hash
      [empid.trim(), full_name.trim(), role, hashedPassword, true]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("[admin/users] Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id, is_active } = await request.json()

    if (!id || typeof is_active !== "boolean") {
      return NextResponse.json({ error: "id and is_active (boolean) are required" }, { status: 400 })
    }

    if (String(id) === String(session.userId) && is_active === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING ${SAFE_COLUMNS}`,
      [is_active, id]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("[admin/users] Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}