// Validates a post-login redirect target came from our own app (a relative
// path), never an attacker-supplied absolute/external URL (open redirect).
export function getSafeRedirect(target: string | null | undefined, fallback: string): string {
  if (!target) return fallback
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("://")) {
    return fallback
  }
  return target
}
