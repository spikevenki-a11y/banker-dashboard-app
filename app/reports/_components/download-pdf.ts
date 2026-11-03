import type { BranchInfo } from "./use-branch-info"

const CONTAINER_WIDTH_PX  = 1040
const A4_WIDTH_MM         = 210
const A4_HEIGHT_MM        = 297
const MARGIN_MM           = 8
const PRINTABLE_WIDTH_MM  = A4_WIDTH_MM - 2 * MARGIN_MM  // 194 mm

/**
 * html2canvas 1.x cannot parse modern CSS colour functions (oklch/lab) used by the
 * app's Tailwind v4 theme and aborts with "unsupported color function". The PDF
 * markup is fully self-styled, so drop the app stylesheets from html2canvas's
 * cloned document (the live page is untouched).
 */
function stripAppStyles(clonedDoc: Document) {
  clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
    if (!el.closest("#pdf-hdr, #pdf-body")) el.remove()
  })
}

/**
 * Generates and downloads a PDF that mirrors the print-window layout.
 * The bank/branch header is rendered on every page; body content is sliced
 * across pages.  Both header and body are captured as high-DPI canvases so
 * the output is sharp at A4 print resolution.
 */
export type DownloadPdfOptions = {
  // Multiplies every font size and cell padding (default 1 = unchanged)
  fontScale?: number
  // Break pages only between table rows, so no row is cut across two pages
  avoidRowSplit?: boolean
}

export async function downloadPdf(
  reportTitle: string,
  dateRange: string,
  branchInfo: BranchInfo | null,
  contentHtml: string,
  options: DownloadPdfOptions = {}
): Promise<void> {
  const k = options.fontScale && options.fontScale > 0 ? options.fontScale : 1
  const px = (n: number) => `${Math.round(n * k * 100) / 100}px`

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ])

  const bank    = branchInfo?.bank_name    || ""
  const branch  = branchInfo?.branch_name  || ""
  const address = [branchInfo?.address, branchInfo?.city, branchInfo?.state, branchInfo?.postal_code]
    .filter(Boolean).join(", ")
  const contact = [
    branchInfo?.phone_number ? `Ph: ${branchInfo.phone_number}` : "",
    branchInfo?.email        ? `Email: ${branchInfo.email}`     : "",
  ].filter(Boolean).join("  |  ")

  // Off-screen container — mirrors open-print-window styles exactly
  const wrapper = document.createElement("div")
  wrapper.style.cssText =
    `position:absolute;left:-10000px;top:0;` +
    `width:${CONTAINER_WIDTH_PX}px;background:#fff;` +
    `font-family:Arial,sans-serif;font-size:${px(12)};color:#111;`

  wrapper.innerHTML = `
    <div id="pdf-hdr" style="
        background:#fff;border-bottom:2px solid #111;
        padding:${px(8)} 24px ${px(6)};text-align:center;">
      ${bank    ? `<div style="font-size:${px(17)};font-weight:700;letter-spacing:.3px;">${bank}</div>`       : ""}
      ${branch  ? `<div style="font-size:${px(13)};font-weight:600;margin-top:1px;">${branch}</div>`          : ""}
      ${address ? `<div style="font-size:${px(10.5)};color:#555;margin-top:2px;">${address}</div>`            : ""}
      ${contact ? `<div style="font-size:${px(10.5)};color:#555;">${contact}</div>`                           : ""}
      <div style="margin-top:${px(5)};padding-top:${px(5)};border-top:1px solid #ddd;">
        <div style="font-size:${px(13)};font-weight:700;text-transform:uppercase;letter-spacing:.5px;">
          ${reportTitle}
        </div>
        ${dateRange ? `<div style="font-size:${px(11)};color:#555;margin-top:1px;">${dateRange}</div>` : ""}
      </div>
    </div>
    <div id="pdf-body" style="padding:${px(8)} 20px 20px;">
      <style>
        #pdf-body * { box-sizing:border-box; }
        #pdf-body table { width:100%;border-collapse:collapse;margin-top:${px(8)}; }
        #pdf-body th,#pdf-body td { border:1px solid #ccc;padding:${px(4)} ${px(7)};font-size:${px(10.5)};text-align:left; }
        #pdf-body th { background:#f0f0f0;font-weight:600; }
        #pdf-body tfoot td { font-weight:bold;background:#f0f0f0; }
        #pdf-body .tr { text-align:right; }
        #pdf-body .tc { text-align:center; }
        #pdf-body .text-right { text-align:right; }
        #pdf-body .text-center { text-align:center; }
        #pdf-body .section-hd td { background:#e5e7eb;font-weight:700; }
        #pdf-body .income td { color:#15803d; }
        #pdf-body .expense td { color:#b91c1c; }
        /* Hide Tailwind-specific classes that don't apply inside the canvas */
        #pdf-body .overflow-x-auto { overflow:visible; }
        #pdf-body h1 { font-size:${px(14)};font-weight:700;margin-bottom:2px; }
        #pdf-body h2 { font-size:${px(11)};color:#555;margin-bottom:${px(8)}; }
      </style>
      ${contentHtml}
    </div>
  `

  document.body.appendChild(wrapper)

  try {
    const hdrEl  = wrapper.querySelector<HTMLElement>("#pdf-hdr")!
    const bodyEl = wrapper.querySelector<HTMLElement>("#pdf-body")!

    // Row bottoms (CSS px from the top of the body) — page breaks may only fall here
    const bodyTop = bodyEl.getBoundingClientRect().top
    const rowBreaksPx = options.avoidRowSplit
      ? Array.from(bodyEl.querySelectorAll("tr"))
          .map((tr) => tr.getBoundingClientRect().bottom - bodyTop)
          .sort((a, b) => a - b)
      : []

    const SCALE = 2
    const canvasOpts = { scale: SCALE, backgroundColor: "#ffffff", logging: false, useCORS: true, onclone: stripAppStyles }
    const [hdrCanvas, bodyCanvas] = await Promise.all([
      html2canvas(hdrEl,  canvasOpts),
      html2canvas(bodyEl, canvasOpts),
    ])

    // mm per 1 CSS pixel: container is CONTAINER_WIDTH_PX wide → PRINTABLE_WIDTH_MM mm
    const px2mm = PRINTABLE_WIDTH_MM / CONTAINER_WIDTH_PX

    const hdrHeightMM  = (hdrCanvas.height  / SCALE) * px2mm
    const bodyHeightMM = (bodyCanvas.height / SCALE) * px2mm
    const pageBodyMM   = A4_HEIGHT_MM - 2 * MARGIN_MM - hdrHeightMM

    // Page slices [startMM, endMM] of the body
    const slices: [number, number][] = []
    if (options.avoidRowSplit && rowBreaksPx.length > 0) {
      const breaksMM = rowBreaksPx.map((b) => b * px2mm)
      let start = 0
      while (start < bodyHeightMM - 0.01) {
        const limit = start + pageBodyMM
        if (limit >= bodyHeightMM) {
          slices.push([start, bodyHeightMM])
          break
        }
        // Last row boundary that still fits on this page; fall back to a plain cut for a row taller than a page
        const fit = breaksMM.filter((b) => b > start + 0.01 && b <= limit)
        const end = fit.length > 0 ? fit[fit.length - 1] : limit
        slices.push([start, end])
        start = end
      }
    } else {
      const pages = Math.max(1, Math.ceil(bodyHeightMM / pageBodyMM))
      for (let page = 0; page < pages; page++) {
        slices.push([page * pageBodyMM, Math.min(page * pageBodyMM + pageBodyMM, bodyHeightMM)])
      }
    }
    const totalPages = Math.max(1, slices.length)

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const hdrImgData = hdrCanvas.toDataURL("image/png")

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage()

      // Bank/branch header — repeated on every page
      pdf.addImage(hdrImgData, "PNG", MARGIN_MM, MARGIN_MM, PRINTABLE_WIDTH_MM, hdrHeightMM)

      // Body slice for this page
      const [sliceStartMM, sliceEndMM] = slices[page] ?? [0, bodyHeightMM]
      const sliceMM       = sliceEndMM - sliceStartMM
      const sliceStartPx  = Math.round((sliceStartMM  / px2mm) * SCALE)
      const sliceHeightPx = Math.round((sliceMM       / px2mm) * SCALE)

      const sliceCanvas = document.createElement("canvas")
      sliceCanvas.width  = bodyCanvas.width
      sliceCanvas.height = Math.max(1, sliceHeightPx)
      sliceCanvas
        .getContext("2d")!
        .drawImage(bodyCanvas, 0, sliceStartPx, bodyCanvas.width, sliceHeightPx,
                               0, 0,            bodyCanvas.width, sliceHeightPx)

      pdf.addImage(
        sliceCanvas.toDataURL("image/png"), "PNG",
        MARGIN_MM, MARGIN_MM + hdrHeightMM,
        PRINTABLE_WIDTH_MM, sliceMM
      )
    }

    const fileName = `${reportTitle.replace(/[^a-z0-9]/gi, "_")}.pdf`
    pdf.save(fileName)
  } finally {
    document.body.removeChild(wrapper)
  }
}
