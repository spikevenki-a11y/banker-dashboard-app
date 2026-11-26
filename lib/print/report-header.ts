import { reportLogoImgHtml, REPORT_LOGO_WIDTH_MM } from "./report-logo"

/**
 * Common header for the standard reports: bank/branch block centred, bank logo
 * top-right, then the report title row. Both the print/preview window
 * (openPrintWindow) and the PDF download (downloadPdf) render this markup, so
 * the two outputs always match.
 *
 * All styles are inline so the markup also works inside html2canvas, where the
 * app stylesheets are stripped.
 */
export interface ReportHeaderInfo {
  bank_name?: string
  branch_name?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  phone_number?: string
  email?: string
}

export interface ReportHeaderOptions {
  /** Scales a font/padding size given in CSS px (PDF uses a font scale). Default: identity. */
  px?: (n: number) => string
  /** Converts millimetres to a CSS length (PDF canvas ≠ physical mm). Default: real mm. */
  mm?: (n: number) => string
}

export function buildReportHeaderHtml(
  reportTitle: string,
  dateRange: string,
  info: ReportHeaderInfo | null,
  opts: ReportHeaderOptions = {}
): string {
  const px = opts.px ?? ((n: number) => `${n}px`)
  const mm = opts.mm ?? ((n: number) => `${n}mm`)

  const bank    = info?.bank_name   || ""
  const branch  = info?.branch_name || ""
  const address = [info?.address, info?.city, info?.state, info?.postal_code].filter(Boolean).join(", ")
  const contact = [
    info?.phone_number ? `Ph: ${info.phone_number}` : "",
    info?.email        ? `Email: ${info.email}`     : "",
  ].filter(Boolean).join("  |  ")

  // Equal side columns keep the bank name centred on the page; the logo sits in the right one
  const side = mm(REPORT_LOGO_WIDTH_MM)

  return `
    <div style="display:grid;grid-template-columns:${side} minmax(0,1fr) ${side};column-gap:8px;align-items:center;">
      <div></div>
      <div style="text-align:center;">
        ${bank    ? `<div style="font-size:${px(17)};font-weight:700;letter-spacing:.3px;">${bank}</div>` : ""}
        ${branch  ? `<div style="font-size:${px(13)};font-weight:600;margin-top:1px;">${branch}</div>`    : ""}
        ${address ? `<div style="font-size:${px(10.5)};color:#555;margin-top:2px;">${address}</div>`      : ""}
        ${contact ? `<div style="font-size:${px(10.5)};color:#555;">${contact}</div>`                     : ""}
      </div>
      <div style="display:flex;justify-content:flex-end;align-self:start;">${reportLogoImgHtml({ mm })}</div>
    </div>
    <div style="margin-top:${px(5)};padding-top:${px(5)};border-top:1px solid #ddd;text-align:center;">
      <div style="font-size:${px(13)};font-weight:700;text-transform:uppercase;letter-spacing:.5px;">${reportTitle}</div>
      ${dateRange ? `<div style="font-size:${px(11)};color:#555;margin-top:1px;">${dateRange}</div>` : ""}
    </div>`
}
