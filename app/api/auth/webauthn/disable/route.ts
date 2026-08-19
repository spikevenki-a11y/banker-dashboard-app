export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSession } from "@/lib/auth/session"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = supabaseAdmin()

    await supabase
      .from("user_webauthn_credentials")
      .delete()
      .eq("user_id", session.userId)

    await supabase
      .from("users")
      .update({ webauthn_enabled: false })
      .eq("id", session.userId)

    return NextResponse.json({ success: true, message: "Fingerprint login disabled successfully" })
  } catch (err: any) {
    console.error("WebAuthn disable error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
