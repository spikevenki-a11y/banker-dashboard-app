export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { verify } from "otplib"

// POST — verify current TOTP, then disable 2FA
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Authentication code is required" }, { status: 400 })
    }

    const { rows: [user] } = await pool.query(
      `SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1`,
      [session.userId]
    )

    if (!user?.two_factor_enabled || !user?.two_factor_secret) {
      return NextResponse.json({ error: "2FA is not enabled on this account" }, { status: 400 })
    }

    const result = await verify({ token, secret: user.two_factor_secret })
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid authentication code. Please try again." }, { status: 400 })
    }

    await pool.query(
      `UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1`,
      [session.userId]
    )

    return NextResponse.json({ success: true, message: "Two-factor authentication disabled successfully" })
  } catch (err) {
    console.error("2FA disable error:", err)
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 })
  }
}
