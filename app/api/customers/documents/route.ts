export const runtime = "nodejs"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import {
  canAccessCustomer,
  getActiveCustomerDocuments,
  isCustomerDocumentType,
  saveCustomerDocument,
} from "@/lib/customer-documents"

// GET ?customer_code= — the customer's current photo & signature (metadata only;
// the images themselves are served by /api/customers/documents/file?id=).
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const customerCode = new URL(req.url).searchParams.get("customer_code")?.trim()
  if (!customerCode) return NextResponse.json({ error: "customer_code is required" }, { status: 400 })

  try {
    const access = await canAccessCustomer(customerCode, session, "read")
    if (access === "not_found") return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    if (access === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const docs = await getActiveCustomerDocuments(customerCode)
    return NextResponse.json({ success: true, ...docs })
  } catch (e) {
    console.error("Customer documents GET error:", e)
    return NextResponse.json({ error: "Failed to load photo and signature" }, { status: 500 })
  }
}

// POST multipart: customer_code, document_type (PHOTO | SIGNATURE), file
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 })
  }
  const customerCode = String(form.get("customer_code") || "").trim()
  const type = form.get("document_type")
  const file = form.get("file")

  if (!customerCode) return NextResponse.json({ error: "customer_code is required" }, { status: 400 })
  if (!isCustomerDocumentType(type)) {
    return NextResponse.json({ error: "document_type must be PHOTO or SIGNATURE" }, { status: 400 })
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 })

  try {
    const access = await canAccessCustomer(customerCode, session, "write")
    if (access === "not_found") return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    if (access === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const result = await saveCustomerDocument({
      customerCode,
      type,
      file,
      branchId: session.branch,
      userId: session.userId,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    const label = type === "PHOTO" ? "Photo" : "Signature"
    return NextResponse.json({ success: true, document: result.document, message: `${label} updated successfully.` }, { status: 201 })
  } catch (e) {
    console.error("Customer documents POST error:", e)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
