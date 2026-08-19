export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSession } from "@/lib/auth/session"
import { generateSecret, generateURI } from "otplib"
import QRCode from "qrcode"

const APP_NAME = "Banker Dashboard"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// GET — return current 2FA status for logged-in user
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = supabaseAdmin()

    const { data: user } = await supabase
      .from("users")
      .select("two_factor_enabled")
      .eq("id", session.userId)
      .maybeSingle()

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
