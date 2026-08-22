export const runtime = "nodejs"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { generateSecret, generateURI } from "otplib"
import QRCode from "qrcode"

const APP_NAME = "Banker Dashboard"

// GET — return current 2FA status for logged-in user
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { rows: [user] } = await pool.query(
      `SELECT two_factor_enabled FROM users WHERE id = $1`,
      [session.userId]
    )

    return NextResponse.json({ enabled: user?.two_factor_enabled ?? false })
  } catch (err) {
    console.error("2FA setup GET error:", err)
    return NextResponse.json({ error: "Failed to get 2FA status" }, { status: 500 })
  }
}

// POST — generate a new TOTP secret + QR code (does NOT save yet)
export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const secret = generateSecret()
    const otpAuthUrl = generateURI({
      label: session.fullName || session.userId,
      issuer: APP_NAME,
      secret,
    })
    const qrCode = await QRCode.toDataURL(otpAuthUrl)

    return NextResponse.json({ secret, qrCode })
  } catch (err) {
    console.error("2FA setup POST error:", err)
    return NextResponse.json({ error: "Failed to generate 2FA secret" }, { status: 500 })
  }
}
