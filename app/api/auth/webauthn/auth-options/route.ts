export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { generateAuthenticationOptions } from "@simplewebauthn/server"

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    const { rows: [user] } = await pool.query(
      `SELECT id, webauthn_enabled, is_active FROM users WHERE username = $1`,
      [username]
    )

    if (!user || !user.is_active) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 404 })
    }
    if (!user.webauthn_enabled) {
      return NextResponse.json({ error: "Fingerprint login is not enabled for this account" }, { status: 400 })
    }

    const { rows: creds } = await pool.query(
      `SELECT credential_id, transports FROM user_webauthn_credentials WHERE user_id = $1`,
      [user.id]
    )

    if (!creds || creds.length === 0) {
      return NextResponse.json({ error: "No registered credentials found" }, { status: 400 })
    }

    const host = request.headers.get("host") || "localhost"
    const rpID = host.split(":")[0]

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: creds.map((cred) => ({
        id: cred.credential_id, // already base64url string in v13
        transports: cred.transports ?? [],
      })),
      userVerification: "preferred",
    })

    const res = NextResponse.json(options)
    res.cookies.set({
      name: "webauthn_challenge",
      value: options.challenge,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 5,
    })
    // Store username temporarily to look up user after auth
    res.cookies.set({
      name: "webauthn_username",
      value: username,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 5,
    })
    return res
  } catch (err: any) {
    console.error("WebAuthn auth-options error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
