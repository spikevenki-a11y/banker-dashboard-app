/**
 * Prints a complete HTML document through a hidden iframe, so the app layout,
 * sidebar and dialogs never appear on paper. Same approach as the FD
 * "Interest Payable Chart" print, pulled out so any page can reuse it.
 *
 * Waits for web fonts (e.g. Noto Sans Tamil) before opening the print dialog,
 * otherwise Tamil text can print in a fallback font or as boxes.
 */
export function escapeHtml(v: unknown): string {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!
  )
}

export function printHtml(html: string): void {
  if (typeof document === "undefined") return

  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => setTimeout(() => iframe.remove(), 500)
  win.addEventListener("afterprint", cleanup, { once: true })

  const go = () => {
    win.focus()
    win.print()
    // Fallback for browsers that don't fire afterprint on iframes
    setTimeout(() => iframe.isConnected && iframe.remove(), 60000)
  }

  // Wait for the stylesheet + web fonts (max 4s so a slow network never blocks printing)
  const loaded = new Promise<void>((resolve) => {
    if (doc.readyState === "complete") resolve()
    else win.addEventListener("load", () => resolve(), { once: true })
  })
  const ready = loaded.then(() => (doc as Document & { fonts?: FontFaceSet }).fonts?.ready)
  const timeout = new Promise((r) => setTimeout(r, 4000))
  Promise.race([ready, timeout]).then(() => setTimeout(go, 50))
}
