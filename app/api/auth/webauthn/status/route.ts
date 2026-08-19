export const runtime = "nodejs"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { rows: [user] } = await pool.query(
      `SELECT webauthn_enabled FROM users WHERE id = $1`,
      [session.userId]
    )

    return NextResponse.json({ enabled: user?.webauthn_enabled ?? false })
  } catch (err: any) {
    console.error("WebAuthn status error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
