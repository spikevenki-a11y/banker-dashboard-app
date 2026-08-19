export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSession } from "@/lib/auth/session"
import { verify } from "otplib"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// POST — verify current TOTP, then disable 2FA
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Authentication code is required" }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const { data: user } = await supabase
      .from("users")
      .select("two_factor_secret, two_factor_enabled")
      .eq("id", session.userId)
      .maybeSingle()

    if (!user?.two_factor_enabled || !user?.two_factor_secret) {
      return NextResponse.json({ error: "2FA is not enabled on this account" }, { status: 400 })
    }

    const result = await verify({ token, secret: user.two_factor_secret })
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid authentication code. Please try again." }, { status: 400 })
    }

    const { error } = await supabase
      .from("users")
      .update({ two_factor_enabled: false, two_factor_secret: null })
      .eq("id", session.userId)

    if (error) throw error

    return NextResponse.json({ success: true, message: "Two-factor authentication disabled successfully" })
  } catch (err) {
    console.error("2FA disable error:", err)
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 })
  }
}
