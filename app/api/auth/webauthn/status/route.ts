export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSession } from "@/lib/auth/session"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = supabaseAdmin()

    const { data: user } = await supabase
      .from("users")
      .select("webauthn_enabled")
      .eq("id", session.userId)
      .maybeSingle()

    return NextResponse.json({ enabled: user?.webauthn_enabled ?? false })
  } catch (err: any) {
    console.error("WebAuthn status error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
