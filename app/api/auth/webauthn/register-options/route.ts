export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { generateRegistrationOptions } from "@simplewebauthn/server"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const c = cookieStore.get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const session = JSON.parse(c.value)
    const supabase = supabaseAdmin()

    // Load existing credentials to exclude them from registration
    const { data: existingCreds } = await supabase
      .from("user_webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", session.userId)

    const host = request.headers.get("host") || "localhost"
    const rpID = host.split(":")[0]

    const options = await generateRegistrationOptions({
      rpName: "Banker Dashboard",
      rpID,
      userName: session.fullName || session.userId,
      userID: Buffer.from(session.userId),
      attestationType: "none",
      excludeCredentials: (existingCreds ?? []).map((cred) => ({
        id: cred.credential_id, // already base64url string in v13
        transports: cred.transports ?? [],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    })

    const res = NextResponse.json(options)
    res.cookies.set({
      name: "webauthn_challenge",
      value: options.challenge,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 60 * 5,
    })
    return res
  } catch (err: any) {
    console.error("WebAuthn register-options error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
