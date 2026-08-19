export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"
import { createSession } from "@/lib/auth/session"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const challengeCookie = cookieStore.get("webauthn_challenge")
    const usernameCookie = cookieStore.get("webauthn_username")

    if (!challengeCookie || !usernameCookie) {
      return NextResponse.json({ error: "Session expired. Please try again." }, { status: 401 })
    }

    const body = await request.json()
    const supabase = supabaseAdmin()

    // Load user + branch business day
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, role, branch, is_active, webauthn_enabled")
      .eq("username", usernameCookie.value)
      .maybeSingle()

    if (!user || !user.is_active || !user.webauthn_enabled) {
      return NextResponse.json({ error: "Account not found or fingerprint login disabled" }, { status: 401 })
    }

    // Find the matching credential by ID from the assertion
    const credentialID = body.id
    const { data: storedCred } = await supabase
      .from("user_webauthn_credentials")
      .select("*")
      .eq("user_id", user.id)
      .eq("credential_id", credentialID)
      .maybeSingle()

    if (!storedCred) {
      return NextResponse.json({ error: "Credential not found" }, { status: 401 })
    }

    const host = request.headers.get("host") || "localhost"
    const rpID = host.split(":")[0]
    const proto = request.headers.get("x-forwarded-proto") || "http"
    const expectedOrigin = `${proto}://${host}`

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeCookie.value,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: storedCred.credential_id,                              // base64url string
        publicKey: isoBase64URL.toBuffer(storedCred.public_key),   // base64url → Uint8Array
        counter: storedCred.counter,
        transports: storedCred.transports ?? [],
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: "Fingerprint verification failed" }, { status: 401 })
    }

    // Update counter
    await supabase
      .from("user_webauthn_credentials")
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq("user_id", user.id)
      .eq("credential_id", credentialID)

    // Get branch business date
    const { data: day } = await supabase
      .from("branch_business_day")
      .select("business_date, is_open")
      .eq("branch_id", user.branch)
      .eq("is_open", true)
      .maybeSingle()

    if (!day?.is_open) {
      return NextResponse.json({ error: "Branch day not opened" }, { status: 403 })
    }

    const created = await createSession({
      userId: user.id,
      fullName: user.full_name,
      role: user.role,
      branch: user.branch,
      branch_name: user.branch,
      businessDate: day.business_date,
    })

    if (!created) {
      return NextResponse.json({ error: "Login failed" }, { status: 500 })
    }

    const res = NextResponse.json({
      success: true,
      redirectUrl: user.role === "admin" ? "/admin" : "/dashboard",
    })

    res.cookies.delete("webauthn_challenge")
    res.cookies.delete("webauthn_username")
    return res
  } catch (err: any) {
    console.error("WebAuthn auth-verify error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
