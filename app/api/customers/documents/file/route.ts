export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { canAccessCustomer, downloadCustomerDocument } from "@/lib/customer-documents"

const SAFE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET ?id=<customer_documents.id> — streams a stored photo/signature to an
// authorised user of the customer's branch. Never exposes a public URL.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const id = new URL(req.url).searchParams.get("id") || ""
  if (!UUID.test(id)) return new NextResponse("Invalid id", { status: 400 })

  try {
    const { rows: [doc] } = await pool.query(
      `SELECT customer_code, file_type, storage_path FROM customer_documents WHERE id = $1`,
      [id]
    )
    if (!doc) return new NextResponse("Not found", { status: 404 })

    const access = await canAccessCustomer(doc.customer_code, session, "read")
    if (access !== "ok") return new NextResponse("Not found", { status: 404 })

    const data = await downloadCustomerDocument(doc.storage_path)
    if (!data) return new NextResponse("Not found", { status: 404 })

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": SAFE_IMAGE_TYPES.has(doc.file_type) ? doc.file_type : "application/octet-stream",
        "Content-Length": String(data.length),
        // Each upload gets a new id, so a given id's content never changes
        "Cache-Control": "private, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    })
  } catch (e) {
    console.error("Customer document file error:", e)
    return new NextResponse("Failed to load file", { status: 500 })
  }
}
