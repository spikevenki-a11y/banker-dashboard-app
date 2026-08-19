export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

const BUCKET = "gold-security-docs"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// POST — upload a gold security document
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const applicationId = formData.get("loan_application_id") as string | null
    const category = (formData.get("document_category") as string) || "GOLD_PHOTO"

    if (!file || !applicationId) {
      return NextResponse.json({ error: "file and loan_application_id are required" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must not exceed 5 MB" }, { status: 400 })
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP and PDF files are allowed" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const storagePath = `${session.branch}/${applicationId}/${uniqueName}`
    console.log("Uploading file to Supabase storage at path:", storagePath)
    const supabase = supabaseAdmin()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload file: " + uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    const { rows: [doc] } = await pool.query(
      `INSERT INTO loan_gold_documents
         (loan_application_id, branch_id, file_name, file_type, file_size,
          storage_path, public_url, document_category, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        applicationId, session.branch, file.name, file.type, file.size,
        storagePath, urlData.publicUrl, category, session.userId,
      ]
    )

    return NextResponse.json({ success: true, document: doc }, { status: 201 })
  } catch (err: any) {
    console.error("Gold documents POST error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — list gold documents for a loan application
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const applicationId = request.nextUrl.searchParams.get("loan_application_id")
    if (!applicationId) {
      return NextResponse.json({ error: "loan_application_id is required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `SELECT * FROM loan_gold_documents
       WHERE loan_application_id = $1 AND branch_id = $2
       ORDER BY created_at ASC`,
      [applicationId, session.branch]
    )

    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("Gold documents GET error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
