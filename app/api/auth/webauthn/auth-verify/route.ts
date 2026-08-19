export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"
import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"
import { createSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const challengeCookie = cookieStore.get("webauthn_challenge")
    const usernameCookie = cookieStore.get("webauthn_username")

    if (!challengeCookie || !usernameCookie) {
      return NextResponse.json({ error: "Session expired. Please try again." }, { status: 401 })
    }

    const body = await request.json()

    // Load user + branch business day
    const { rows: [user] } = await pool.query(
      `SELECT id, full_name, role, branch, is_active, webauthn_enabled FROM users WHERE username = $1`,
      [usernameCookie.value]
    )

    if (!user || !user.is_active || !user.webauthn_enabled) {
      return NextResponse.json({ error: "Account not found or fingerprint login disabled" }, { status: 401 })
    }

    // Find the matching credential by ID from the assertion
    const credentialID = body.id
    const { rows: [storedCred] } = await pool.query(
      `SELECT * FROM user_webauthn_credentials WHERE user_id = $1 AND credential_id = $2`,
      [user.id, credentialID]
    )

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
    await pool.query(
      `UPDATE user_webauthn_credentials SET counter = $1 WHERE user_id = $2 AND credential_id = $3`,
      [verification.authenticationInfo.newCounter, user.id, credentialID]
    )

    // Get branch business date
    const { rows: [day] } = await pool.query(
      `SELECT business_date, is_open FROM branch_business_day WHERE branch_id = $1 AND is_open = true`,
      [user.branch]
    )

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
