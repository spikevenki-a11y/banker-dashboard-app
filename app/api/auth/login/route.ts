export const runtime = "nodejs"
import pool from "@/lib/connection/db"
import { createSession, createPendingTwoFactorSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  console.log("Login request received")
  try {
    const { username, password } = await request.json()
    if (!username || !password)
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })

    const { rows: [user] } = await pool.query(
      `SELECT id, username, password, full_name, role, is_active, branch, two_factor_enabled, two_factor_secret
       FROM users WHERE username = $1`,
      [username]
    )

    if (!user || !user.is_active)
      return NextResponse.json({ error: "Invalid username or inactive account" }, { status: 401 })

    // Branch business day check
    const { rows: [day] } = await pool.query(
      `SELECT business_date, is_open FROM branch_business_day WHERE branch_id = $1 AND is_open = true`,
      [user.branch]
    )

    console.log("---------------------------------------------"+day?.business_date)
    if (!day?.is_open)
      return NextResponse.json({ error: "Branch day not opened" }, { status: 403 })

    // Failed attempt lock check
    const { rows: [fail] } = await pool.query(
      `SELECT * FROM staff_login_failures WHERE staff_id = $1`,
      [user.id]
    )

    if (fail?.locked_until && new Date(fail.locked_until) > new Date())
      return NextResponse.json({ error: "Account locked temporarily" }, { status: 403 })

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      const count = (fail?.failure_count || 0) + 1
      await pool.query(
        `INSERT INTO staff_login_failures (staff_id, failure_count, locked_until)
         VALUES ($1, $2, $3)
         ON CONFLICT (staff_id) DO UPDATE
         SET failure_count = EXCLUDED.failure_count, locked_until = EXCLUDED.locked_until`,
        [user.id, count, count >= 3 ? new Date(Date.now() + 30 * 60000) : null]
      )

      await pool.query(
        `INSERT INTO staff_login_audit (staff_id, branch_id, ip_address, success, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, user.branch, request.headers.get("x-forwarded-for"), false, "Invalid password"]
      )

      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    // Successful login cleanup + audit
    await pool.query(`DELETE FROM staff_login_failures WHERE staff_id = $1`, [user.id])

    await pool.query(
      `INSERT INTO staff_login_audit (staff_id, branch_id, ip_address, success)
       VALUES ($1, $2, $3, $4)`,
      [user.id, user.branch, request.headers.get("x-forwarded-for"), true]
    )

    // If 2FA is enabled, set a short-lived signed pending session and signal the client
    if (user.two_factor_enabled && user.two_factor_secret) {
      await createPendingTwoFactorSession({
        userId: user.id,
        fullName: user.full_name,
        role: user.role,
        branch: user.branch,
        branch_name: user.branch,
        businessDate: day!.business_date,
      })
      return NextResponse.json({ requiresTwoFactor: true })
    }

    const created = await createSession({
      userId: user.id,
      fullName: user.full_name,
      role: user.role,
      branch: user.branch,
      branch_name: user.branch,
      businessDate: day!.business_date,
    })

    if (!created) {
      return NextResponse.json({ error: "Login failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      redirectUrl: user.role === "admin" ? "/admin" : "/dashboard",
    })
  } catch (err) {
    console.error("LOGIN ERROR:", err)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
