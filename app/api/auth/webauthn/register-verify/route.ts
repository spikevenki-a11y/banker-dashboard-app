export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { verifyRegistrationResponse } from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"

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
    const c = cookieStore.get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const challengeCookie = cookieStore.get("webauthn_challenge")
    if (!challengeCookie) {
      return NextResponse.json({ error: "Challenge expired. Please try again." }, { status: 400 })
    }

    const session = JSON.parse(c.value)
    const body = await request.json()

    const host = request.headers.get("host") || "localhost"
    const rpID = host.split(":")[0]
    const proto = request.headers.get("x-forwarded-proto") || "http"
    const expectedOrigin = `${proto}://${host}`

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challengeCookie.value,
      expectedOrigin,
      expectedRPID: rpID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 })
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo

    const supabase = supabaseAdmin()

    await supabase.from("user_webauthn_credentials").insert({
      user_id: session.userId,
      credential_id: credential.id,                              // already base64url string
      public_key: isoBase64URL.fromBuffer(credential.publicKey), // Uint8Array → base64url string
      counter: credential.counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: body.response?.transports ?? [],
    })

    await supabase
      .from("users")
      .update({ webauthn_enabled: true })
      .eq("id", session.userId)

    const res = NextResponse.json({ success: true, message: "Fingerprint login enabled successfully" })
    res.cookies.delete("webauthn_challenge")
    return res
  } catch (err: any) {
    console.error("WebAuthn register-verify error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
