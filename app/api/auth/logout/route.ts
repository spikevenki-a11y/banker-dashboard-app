import { destroySession, clearPendingTwoFactorSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function POST() {
  await destroySession()
  await clearPendingTwoFactorSession()

  const res = NextResponse.json({ success: true })
  // Defense in depth: also strip any leftover WebAuthn ceremony cookies.
  res.cookies.delete("webauthn_challenge")
  res.cookies.delete("webauthn_username")
  return res
}
