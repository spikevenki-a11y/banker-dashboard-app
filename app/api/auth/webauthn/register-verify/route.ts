export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"
import { getSession } from "@/lib/auth/session"
import { verifyRegistrationResponse } from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const cookieStore = await cookies()
    const challengeCookie = cookieStore.get("webauthn_challenge")
    if (!challengeCookie) {
      return NextResponse.json({ error: "Challenge expired. Please try again." }, { status: 400 })
    }

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

    await pool.query(
      `INSERT INTO user_webauthn_credentials
         (user_id, credential_id, public_key, counter, device_type, backed_up, transports)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        session.userId,
        credential.id,                                          // already base64url string
        isoBase64URL.fromBuffer(credential.publicKey),          // Uint8Array → base64url string
        credential.counter,
        credentialDeviceType,
        credentialBackedUp,
        body.response?.transports ?? [],
      ]
    )

    await pool.query(
      `UPDATE users SET webauthn_enabled = true WHERE id = $1`,
      [session.userId]
    )

    const res = NextResponse.json({ success: true, message: "Fingerprint login enabled successfully" })
    res.cookies.delete("webauthn_challenge")
    return res
  } catch (err: any) {
    console.error("WebAuthn register-verify error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
