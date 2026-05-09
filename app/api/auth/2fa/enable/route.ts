export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { verify } from "otplib"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// POST — verify token against provided secret, then save and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const c = cookieStore.get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const session = JSON.parse(c.value)
    const { token, secret } = await request.json()

    if (!token || !secret) {
      return NextResponse.json({ error: "Token and secret are required" }, { status: 400 })
    }

    const result = await verify({ token, secret })
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid authentication code. Please try again." }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const { error } = await supabase
      .from("users")
      .update({ two_factor_enabled: true, two_factor_secret: secret })
      .eq("id", session.userId)

    if (error) throw error

    return NextResponse.json({ success: true, message: "Two-factor authentication enabled successfully" })
  } catch (err) {
    console.error("2FA enable error:", err)
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 })
  }
}
