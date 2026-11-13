"use client"

/**
 * Saves a print-ready HTML document (the same one printHtml prints) as an A4 PDF.
 *
 * The document is rendered in a hidden iframe; every `<section class="sheet">` starts
 * on a new PDF page (portrait, or landscape for `.sheet.landscape`), exactly like the
 * page breaks in print. A sheet taller than one page continues on the next page,
 * breaking only between rows, paragraphs and list items so no text line is cut, and
 * never inside a `.keep` block.
 */

const MARGIN_MM = 12
const A4 = { w: 210, h: 297 }
const PX_PER_MM = 96 / 25.4
const SCALE = 2 // canvas resolution multiplier (sharp text at A4)
// html2canvas measures some text (justified Tamil lines) slightly wider than the browser
// lays it out; capture a strip of the right margin too so line ends are never cut off
const OVERFLOW_MM = 4

// Elements whose bottom edge is a safe place to start a new page
const BREAK_AFTER = "tr, p, li, h2, h3, table, .meta, .sigs, .office-sigs, .head-box, .title, .title-en, .opt"

function waitForLoad(win: Window, doc: Document): Promise<void> {
  const loaded = new Promise<void>((resolve) => {
    if (doc.readyState === "complete") resolve()
    else win.addEventListener("load", () => resolve(), { once: true })
  })
  const fonts = loaded.then(() => (doc as Document & { fonts?: FontFaceSet }).fonts?.ready).then(() => undefined)
  const timeout = new Promise<void>((r) => setTimeout(r, 5000))
  return Promise.race([fonts, timeout])
}

/** Candidate page-break offsets (CSS px from the sheet top), sorted. */
function breakOffsets(sheet: HTMLElement): number[] {
  const top = sheet.getBoundingClientRect().top
  const out = new Set<number>()
  sheet.querySelectorAll<HTMLElement>(BREAK_AFTER).forEach((el) => {
    if (el.closest(".keep") && !el.classList.contains("keep")) return
    out.add(Math.round(el.getBoundingClientRect().bottom - top))
  })
  sheet.querySelectorAll<HTMLElement>(".keep").forEach((el) => {
    const r = el.getBoundingClientRect()
    out.add(Math.round(r.top - top))
    out.add(Math.round(r.bottom - top))
  })
  return [...out].sort((a, b) => a - b)
}

export async function downloadHtmlAsPdf(html: string, fileName: string): Promise<void> {
  if (typeof document === "undefined") return

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")])

  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  // Rendered (not display:none) but off-screen, wide enough for a landscape sheet
  iframe.style.cssText = "position:fixed;left:-12000px;top:0;width:1200px;height:1200px;border:0;background:#fff"
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    if (!doc || !win) throw new Error("Unable to prepare the PDF")

    doc.open()
    doc.write(html)
    doc.close()

    // On screen there are no @page margins: give each sheet the printable width instead
    const style = doc.createElement("style")
    style.textContent = `
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      .sheet { box-sizing: content-box !important; width: ${A4.w - 2 * MARGIN_MM}mm; padding-right: ${OVERFLOW_MM}mm !important; margin: 0 0 40px; background: #fff; }
      .sheet.landscape { width: ${A4.h - 2 * MARGIN_MM}mm; }`
    doc.head.appendChild(style)

    await waitForLoad(win, doc)

    const sheets = Array.from(doc.querySelectorAll<HTMLElement>("section.sheet"))
    const targets = sheets.length > 0 ? sheets : [doc.body]

    let pdf: InstanceType<typeof jsPDF> | null = null

    for (const sheet of targets) {
      const landscape = sheet.classList.contains("landscape")
      const orientation = landscape ? "landscape" : "portrait"
      const pageW = landscape ? A4.h : A4.w
      const pageH = landscape ? A4.w : A4.h
      const contentWmm = pageW - 2 * MARGIN_MM
      const captureWmm = contentWmm + OVERFLOW_MM // layout width + the overflow strip
      const contentHmm = pageH - 2 * MARGIN_MM

      const canvas = await html2canvas(sheet, {
        scale: SCALE,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        windowWidth: 1200,
      })

      // CSS px ↔ mm for this sheet (rendered width = printable width + overflow strip)
      const cssW = sheet.getBoundingClientRect().width || captureWmm * PX_PER_MM
      const mmPerCss = captureWmm / cssW
      const totalCss = canvas.height / SCALE
      const pageCss = contentHmm / mmPerCss
      const breaks = breakOffsets(sheet)

      let start = 0
      while (start < totalCss - 1) {
        let end = Math.min(start + pageCss, totalCss)
        if (end < totalCss) {
          // Latest safe break on this page, but not so early that the page is mostly empty
          const safe = breaks.filter((b) => b > start + pageCss * 0.3 && b <= start + pageCss)
          if (safe.length > 0) end = safe[safe.length - 1]
        }

        const sliceHpx = Math.max(1, Math.round((end - start) * SCALE))
        const slice = document.createElement("canvas")
        slice.width = canvas.width
        slice.height = sliceHpx
        const ctx = slice.getContext("2d")!
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, slice.width, slice.height)
        ctx.drawImage(canvas, 0, Math.round(start * SCALE), canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx)

        if (!pdf) pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true })
        else pdf.addPage("a4", orientation)
        pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN_MM, MARGIN_MM, captureWmm, (end - start) * mmPerCss)

        start = end
      }
    }

    if (!pdf) throw new Error("Nothing to save")
    pdf.save(fileName)
  } finally {
    iframe.remove()
  }
}
