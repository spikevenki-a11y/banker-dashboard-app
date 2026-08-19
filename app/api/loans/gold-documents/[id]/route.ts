export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

const BUCKET = "gold-security-docs"

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// DELETE — remove a gold document by its DB id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params

    const { rows: [doc] } = await pool.query(
      `SELECT * FROM loan_gold_documents WHERE id = $1 AND branch_id = $2`,
      [id, session.branch]
    )
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    const supabase = supabaseAdmin()
    await supabase.storage.from(BUCKET).remove([doc.storage_path])

    await pool.query(`DELETE FROM loan_gold_documents WHERE id = $1`, [id])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Gold documents DELETE error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
