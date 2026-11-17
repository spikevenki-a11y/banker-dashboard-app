/**
 * Bank logo shown in the top-right corner of every report header
 * (on-screen previews, printed reports and downloaded PDFs).
 *
 * This is the single source of truth for the logo: path, size and markup.
 * Report builders must use these helpers instead of their own <img> tags.
 *
 * If the file is missing, the logo is not swapped for another image. It is
 * replaced by a visible red "logo missing" notice that names the expected
 * path, and the same message is logged to the console.
 * lib/print/report-logo.test.ts also fails when the file is absent.
 */

/** Public URL path of the logo (file: public/images/NCARDB_LOGO.png). */
export const REPORT_LOGO_PATH = "/images/NCARDB_LOGO.png"

/** Intrinsic pixel size of NCARDB_LOGO.png, used to keep the aspect ratio exact. */
export const REPORT_LOGO_NATURAL = { width: 701, height: 801 } as const

/** Printed logo height, the same on every report. Width follows the aspect ratio. */
export const REPORT_LOGO_HEIGHT_MM = 16
export const REPORT_LOGO_WIDTH_MM =
  Math.round(((REPORT_LOGO_HEIGHT_MM * REPORT_LOGO_NATURAL.width) / REPORT_LOGO_NATURAL.height) * 100) / 100

export const REPORT_LOGO_ALT = "NCARDB logo"
export const REPORT_LOGO_MISSING_MESSAGE = `Report logo missing: public${REPORT_LOGO_PATH}`

/**
 * Absolute logo URL. Reports are written into about:blank windows/iframes, so the
 * origin is spelled out. Falls back to the root-relative path outside the browser.
 */
export function reportLogoUrl(): string {
  return typeof window !== "undefined" ? `${window.location.origin}${REPORT_LOGO_PATH}` : REPORT_LOGO_PATH
}

// Inline handler: works in print windows/iframes where no app script runs
const ON_ERROR =
  "var s=document.createElement('span');" +
  "s.textContent=this.getAttribute('data-missing');" +
  "s.style.cssText='display:inline-block;max-width:100%;padding:2px 4px;border:1px dashed #c00;color:#c00;font:700 9px Arial,sans-serif;text-align:center;';" +
  "console.error(s.textContent);" +
  "this.replaceWith(s)"

/**
 * `<img>` markup for the logo.
 * `mm` converts millimetres to a CSS length. The default emits real `mm`. The
 * html2canvas PDF path passes its own px conversion so the logo prints at the
 * same physical size there too.
 */
export function reportLogoImgHtml(opts: { mm?: (n: number) => string; className?: string } = {}): string {
  const mm = opts.mm ?? ((n: number) => `${n}mm`)
  const cls = opts.className ? ` class="${opts.className}"` : ""
  return (
    `<img${cls} src="${reportLogoUrl()}" alt="${REPORT_LOGO_ALT}" data-missing="${REPORT_LOGO_MISSING_MESSAGE}" ` +
    `style="display:block;width:${mm(REPORT_LOGO_WIDTH_MM)};height:${mm(REPORT_LOGO_HEIGHT_MM)};object-fit:contain;" ` +
    `onerror="${ON_ERROR}">`
  )
}

/** Resolves once every <img> under `root` has loaded or failed (max `timeoutMs`). */
export function waitForImages(root: ParentNode, timeoutMs = 5000): Promise<void> {
  const pending = Array.from(root.querySelectorAll("img"))
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true })
          img.addEventListener("error", () => resolve(), { once: true })
        })
    )
  return Promise.race([Promise.all(pending).then(() => undefined), new Promise<void>((r) => setTimeout(r, timeoutMs))])
}
