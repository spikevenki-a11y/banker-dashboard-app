import "server-only"
import { createClient } from "@supabase/supabase-js"
import pool from "@/lib/connection/db"

// Customer photo & signature (table customer_documents, scripts/074_customer_documents.sql).
// Files are kept in a PRIVATE bucket and only served through
// /api/customers/documents/file after a session + branch check.

export const CUSTOMER_DOCUMENTS_BUCKET = "customer-documents"
export const CUSTOMER_DOCUMENT_MAX_SIZE = 2 * 1024 * 1024 // 2 MB
export const CUSTOMER_DOCUMENT_TYPES = ["PHOTO", "SIGNATURE"] as const
export type CustomerDocumentType = (typeof CUSTOMER_DOCUMENT_TYPES)[number]

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export function isCustomerDocumentType(x: unknown): x is CustomerDocumentType {
  return typeof x === "string" && (CUSTOMER_DOCUMENT_TYPES as readonly string[]).includes(x)
}

function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Detects the real image type from the file's first bytes (ignores the browser-supplied type). */
export function detectImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png"
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp"
  return null
}

/**
 * Whether the session's branch may access this customer: the customer must hold a
 * membership in the branch. A customer with no membership yet (just created, not
 * enrolled) can be viewed by any signed-in user (as the Aadhaar customer lookup
 * already allows, e.g. Register a New Membership), but uploads need MEMBER_CREATE.
 */
export async function canAccessCustomer(
  customerCode: string,
  session: { branch: string; userId: string },
  purpose: "read" | "write"
): Promise<"ok" | "not_found" | "forbidden"> {
  const { rows } = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM customers WHERE customer_code = $1) AS customer_exists,
       EXISTS (SELECT 1 FROM memberships WHERE customer_code = $1 AND branch_id = $2) AS in_branch,
       EXISTS (SELECT 1 FROM memberships WHERE customer_code = $1) AS has_membership`,
    [customerCode, session.branch]
  )
  const r = rows[0]
  if (!r.customer_exists) return "not_found"
  if (r.in_branch) return "ok"
  if (purpose === "read" && !r.has_membership) return "ok"
  if (purpose === "write" && !r.has_membership) {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM users usr
       JOIN role_permissions rp ON rp.role = usr.role
       WHERE usr.id = $1 AND rp.permission_code = 'MEMBER_CREATE'`,
      [session.userId]
    )
    return rowCount ? "ok" : "forbidden"
  }
  return "forbidden"
}

export async function getActiveCustomerDocuments(customerCode: string) {
  const { rows } = await pool.query(
    `SELECT id, document_type, file_name, file_type, file_size,
            TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS updated_at
     FROM customer_documents
     WHERE customer_code = $1 AND is_active`,
    [customerCode]
  )
  const pick = (t: CustomerDocumentType) => rows.find((r) => r.document_type === t) || null
  return { photo: pick("PHOTO"), signature: pick("SIGNATURE") }
}

/**
 * Validates and stores an image, replacing the customer's previous active image
 * of that type (the old row is kept with is_active = false).
 */
export async function saveCustomerDocument(opts: {
  customerCode: string
  type: CustomerDocumentType
  file: File
  branchId: string
  userId: string
}): Promise<{ ok: true; document: any } | { ok: false; status: number; error: string }> {
  const { customerCode, type, file, branchId, userId } = opts
  const label = type === "PHOTO" ? "Photo" : "Signature"

  if (file.size === 0) return { ok: false, status: 400, error: `${label} file is empty.` }
  if (file.size > CUSTOMER_DOCUMENT_MAX_SIZE) {
    return { ok: false, status: 400, error: `${label} must not exceed 2 MB.` }
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const mime = detectImageType(buffer)
  if (!mime || !ALLOWED_MIME[mime]) {
    return { ok: false, status: 400, error: `${label} must be a JPEG, PNG or WebP image.` }
  }

  const code = customerCode.trim()
  const storagePath = `${code}/${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ALLOWED_MIME[mime]}`
  const supabase = supabaseAdmin()

  let { error: uploadError } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: mime, upsert: false })
  if (uploadError && /bucket not found/i.test(uploadError.message)) {
    // First upload ever: create the private bucket, then retry once
    await supabase.storage.createBucket(CUSTOMER_DOCUMENTS_BUCKET, { public: false })
    ;({ error: uploadError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, { contentType: mime, upsert: false }))
  }
  if (uploadError) {
    console.error("Customer document upload error:", uploadError)
    return { ok: false, status: 502, error: `Failed to upload ${label.toLowerCase()}. Please try again.` }
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(
      `UPDATE customer_documents SET is_active = false, updated_at = now()
       WHERE customer_code = $1 AND document_type = $2 AND is_active`,
      [code, type]
    )
    const { rows: [doc] } = await client.query(
      `INSERT INTO customer_documents
         (customer_code, branch_id, document_type, file_name, file_type, file_size, storage_path, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, document_type, file_name, file_type, file_size,
                 TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS updated_at`,
      [code, branchId, type, file.name.slice(0, 200), mime, file.size, storagePath, userId]
    )
    await client.query("COMMIT")
    return { ok: true, document: doc }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {})
    // Don't leave an orphaned file behind
    await supabase.storage.from(CUSTOMER_DOCUMENTS_BUCKET).remove([storagePath]).catch(() => {})
    console.error("Customer document save error:", e)
    return { ok: false, status: 500, error: `Failed to save ${label.toLowerCase()}.` }
  } finally {
    client.release()
  }
}

/** Downloads a stored image for streaming back to an authorised user. */
export async function downloadCustomerDocument(storagePath: string) {
  const { data, error } = await supabaseAdmin().storage.from(CUSTOMER_DOCUMENTS_BUCKET).download(storagePath)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}
