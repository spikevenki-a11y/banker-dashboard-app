"use client"

import { useCallback, useEffect, useState } from "react"
import { Camera, ImageOff, Loader2, PenTool } from "lucide-react"

// Customer photo & signature: loading, display frames with placeholders,
// and upload. Images are served by /api/customers/documents/file (auth-checked).

export type CustomerDocument = {
  id: string
  document_type: "PHOTO" | "SIGNATURE"
  file_name: string
  file_type: string
  file_size: number
  updated_at: string
}

export type CustomerDocuments = { photo: CustomerDocument | null; signature: CustomerDocument | null }

export const CUSTOMER_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp"
const MAX_SIZE = 2 * 1024 * 1024

/** Client-side pre-check; the server re-validates the actual file contents. */
export function checkCustomerImage(file: File, label: string): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return `${label} must be a JPEG, PNG or WebP image.`
  if (file.size > MAX_SIZE) return `${label} must not exceed 2 MB.`
  return null
}

export async function uploadCustomerDocument(
  customerCode: string,
  type: "PHOTO" | "SIGNATURE",
  file: File
): Promise<{ ok: true; document: CustomerDocument; message: string } | { ok: false; error: string }> {
  const label = type === "PHOTO" ? "Photo" : "Signature"
  const precheck = checkCustomerImage(file, label)
  if (precheck) return { ok: false, error: precheck }
  try {
    const form = new FormData()
    form.append("customer_code", customerCode.trim())
    form.append("document_type", type)
    form.append("file", file)
    const res = await fetch("/api/customers/documents", { method: "POST", credentials: "include", body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || `Failed to upload ${label.toLowerCase()}.` }
    return { ok: true, document: data.document, message: data.message || `${label} updated successfully.` }
  } catch {
    return { ok: false, error: `Failed to upload ${label.toLowerCase()}. Please check your connection.` }
  }
}

/** Loads a customer's current photo & signature. */
export function useCustomerDocuments(customerCode: string | null | undefined) {
  const code = customerCode?.trim() || ""
  const [docs, setDocs] = useState<CustomerDocuments>({ photo: null, signature: null })
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!code) return
      setLoading(true)
      try {
        const res = await fetch(`/api/customers/documents?customer_code=${encodeURIComponent(code)}`, {
          credentials: "include",
        })
        const data = await res.json().catch(() => null)
        if (!signal?.cancelled) {
          setDocs(res.ok && data?.success ? { photo: data.photo, signature: data.signature } : { photo: null, signature: null })
        }
      } catch {
        if (!signal?.cancelled) setDocs({ photo: null, signature: null })
      } finally {
        if (!signal?.cancelled) setLoading(false)
      }
    },
    [code]
  )

  useEffect(() => {
    setDocs({ photo: null, signature: null })
    if (!code) return
    const signal = { cancelled: false }
    load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [code, load])

  /** Updates the local state after a successful upload, without refetching. */
  const setDocument = (doc: CustomerDocument) =>
    setDocs((prev) => ({ ...prev, [doc.document_type === "PHOTO" ? "photo" : "signature"]: doc }))

  return { docs, loading, reload: () => load(), setDocument }
}

export function customerDocumentUrl(doc: CustomerDocument) {
  return `/api/customers/documents/file?id=${encodeURIComponent(doc.id)}`
}

/**
 * Fixed-size frame showing a photo (portrait, 3:4) or signature (wide, 3:1).
 * Images are letterboxed with object-contain so the aspect ratio is never distorted.
 */
export function CustomerImageFrame({
  doc,
  kind,
  loading = false,
  previewUrl,
  className = "",
}: {
  doc: CustomerDocument | null
  kind: "photo" | "signature"
  loading?: boolean
  /** Local preview (e.g. a file just picked), shown instead of the stored image */
  previewUrl?: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [doc?.id, previewUrl])

  const label = kind === "photo" ? "Photo" : "Signature"
  const src = previewUrl || (doc && !failed ? customerDocumentUrl(doc) : "")
  const size = kind === "photo" ? "h-24 w-[4.5rem]" : "h-16 w-48"
  const Icon = kind === "photo" ? Camera : PenTool

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div
        className={`flex ${size} items-center justify-center overflow-hidden rounded-lg border bg-muted/30 ${
          src ? "border-border bg-white" : "border-dashed border-muted-foreground/25"
        }`}
      >
        {loading && !src ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Member ${label.toLowerCase()}`}
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            {failed ? <ImageOff className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            <span className="text-[10px] font-medium">{failed ? "Unavailable" : `No ${label.toLowerCase()}`}</span>
          </div>
        )}
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
