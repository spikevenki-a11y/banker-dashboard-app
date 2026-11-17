import type { BranchInfo } from "./use-branch-info"
import { buildReportHeaderHtml } from "@/lib/print/report-header"
import { waitForImages } from "@/lib/print/report-logo"

export function openPrintWindow(
  reportTitle: string,
  dateRange: string,
  branchInfo: BranchInfo | null,
  contentHtml: string,
  autoPrint = true
) {
  const win = window.open("", "_blank", "width=1100,height=750")
  if (!win) return

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
  <div class="rpt-header">${buildReportHeaderHtml(reportTitle, dateRange, branchInfo)}
  </div>
  <div class="rpt-body">
    ${contentHtml}
  </div>
</body>
</html>`)

  win.document.close()
  win.focus()
  // Print only once the header logo has loaded, so it is never blank on paper
  if (autoPrint) waitForImages(win.document).then(() => setTimeout(() => win.print(), 200))
}
