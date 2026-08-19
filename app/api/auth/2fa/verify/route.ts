export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verify } from "otplib"
import { createSession, getPendingTwoFactorSession, clearPendingTwoFactorSession } from "@/lib/auth/session"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// POST — verify TOTP during login, then upgrade pending session to a full session
export async function POST(request: NextRequest) {
  try {
    const pendingData = await getPendingTwoFactorSession()
    if (!pendingData) {
      return NextResponse.json(
        { error: "No pending authentication. Please log in again." },
        { status: 401 }
      )
    }

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: "Authentication code is required" }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const { data: user } = await supabase
      .from("users")
      .select("two_factor_secret, two_factor_enabled, is_active")
      .eq("id", pendingData.userId)
      .maybeSingle()

    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Account not found or inactive" }, { status: 401 })
    }

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      return NextResponse.json({ error: "2FA not configured for this account" }, { status: 400 })
    }

    const result = await verify({ token, secret: user.two_factor_secret })
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid authentication code. Please try again." }, { status: 400 })
    }

    // Upgrade to a full session, then clear the pending one
    const created = await createSession({
      userId: pendingData.userId,
      fullName: pendingData.fullName,
      role: pendingData.role,
      branch: pendingData.branch,
      branch_name: pendingData.branch_name,
      businessDate: pendingData.businessDate,
    })
    await clearPendingTwoFactorSession()

    if (!created) {
      return NextResponse.json({ error: "Verification failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      redirectUrl: pendingData.role === "admin" ? "/admin" : "/dashboard",
    })
  } catch (err) {
    console.error("2FA verify error:", err)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
