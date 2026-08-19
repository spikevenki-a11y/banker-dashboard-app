export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await pool.query(
      `DELETE FROM user_webauthn_credentials WHERE user_id = $1`,
      [session.userId]
    )

    await pool.query(
      `UPDATE users SET webauthn_enabled = false WHERE id = $1`,
      [session.userId]
    )

    return NextResponse.json({ success: true, message: "Fingerprint login disabled successfully" })
  } catch (err: any) {
    console.error("WebAuthn disable error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
