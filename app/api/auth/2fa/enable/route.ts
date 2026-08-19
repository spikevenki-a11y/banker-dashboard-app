export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { verify } from "otplib"

// POST — verify token against provided secret, then save and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { token, secret } = await request.json()

    if (!token || !secret) {
      return NextResponse.json({ error: "Token and secret are required" }, { status: 400 })
    }

    const result = await verify({ token, secret })
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid authentication code. Please try again." }, { status: 400 })
    }

    await pool.query(
      `UPDATE users SET two_factor_enabled = true, two_factor_secret = $1 WHERE id = $2`,
      [secret, session.userId]
    )

    return NextResponse.json({ success: true, message: "Two-factor authentication enabled successfully" })
  } catch (err) {
    console.error("2FA enable error:", err)
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 })
  }
}
