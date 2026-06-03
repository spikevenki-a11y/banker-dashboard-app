import type { BranchInfo } from "./use-branch-info"

export function openPrintWindow(
  reportTitle: string,
  dateRange: string,
  branchInfo: BranchInfo | null,
  contentHtml: string,
  autoPrint = true
) {
  const win = window.open("", "_blank", "width=1100,height=750")
  if (!win) return

  const bank    = branchInfo?.bank_name    || ""
  const branch  = branchInfo?.branch_name  || ""
  const address = [branchInfo?.address, branchInfo?.city, branchInfo?.state, branchInfo?.postal_code]
    .filter(Boolean).join(", ")
  const contact = [
    branchInfo?.phone_number ? `Ph: ${branchInfo.phone_number}` : "",
    branchInfo?.email        ? `Email: ${branchInfo.email}`     : "",
  ].filter(Boolean).join("  |  ")

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${reportTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }

    /* ── Fixed header — repeats on every printed page ── */
    .rpt-header {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #fff;
      border-bottom: 2px solid #111;
      padding: 8px 24px 6px;
      text-align: center;
      z-index: 9999;
    }
    .rpt-header .bank-name   { font-size: 17px; font-weight: 700; letter-spacing: .3px; }
    .rpt-header .branch-name { font-size: 13px; font-weight: 600; margin-top: 1px; }
    .rpt-header .address     { font-size: 10.5px; color: #555; margin-top: 2px; }
    .rpt-header .contact     { font-size: 10.5px; color: #555; }
    .rpt-header .report-info {
      margin-top: 5px; padding-top: 5px;
      border-top: 1px solid #ddd;
    }
    .rpt-header .report-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    .rpt-header .date-range   { font-size: 11px; color: #555; margin-top: 1px; }

    /* ── Body pushed below the header ── */
    .rpt-body { padding: 140px 20px 20px; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ccc; padding: 4px 7px; font-size: 10.5px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    tfoot td { font-weight: bold; background: #f0f0f0; }
    .tr { text-align: right; }
    .tc { text-align: center; }
    .section-hd td { background: #e5e7eb; font-weight: 700; }
    .income  td { color: #15803d; }
    .expense td { color: #b91c1c; }

    @page { margin: 8mm 10mm 12mm; }
  </style>
</head>
<body>
  <div class="rpt-header">
    ${bank    ? `<div class="bank-name">${bank}</div>`       : ""}
    ${branch  ? `<div class="branch-name">${branch}</div>`   : ""}
    ${address ? `<div class="address">${address}</div>`      : ""}
    ${contact ? `<div class="contact">${contact}</div>`      : ""}
    <div class="report-info">
      <div class="report-title">${reportTitle}</div>
      ${dateRange ? `<div class="date-range">${dateRange}</div>` : ""}
    </div>
  </div>
  <div class="rpt-body">
    ${contentHtml}
  </div>
</body>
</html>`)

  win.document.close()
  win.focus()
  if (autoPrint) setTimeout(() => win.print(), 500)
}
