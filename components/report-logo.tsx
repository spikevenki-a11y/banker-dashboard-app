"use client"

import { useState } from "react"
import {
  REPORT_LOGO_ALT,
  REPORT_LOGO_HEIGHT_MM,
  REPORT_LOGO_MISSING_MESSAGE,
  REPORT_LOGO_PATH,
  REPORT_LOGO_WIDTH_MM,
} from "@/lib/print/report-logo"

/**
 * React version of the shared report-header logo, for reports previewed
 * in-page whose markup is then copied into a print window. Same file, size and
 * "missing" behaviour as reportLogoImgHtml(). Styles are inline so they survive
 * the copy (Tailwind classes do not apply in the print window).
 */
export function ReportLogo() {
  const [missing, setMissing] = useState(false)

  if (missing) {
    return (
      <span
        style={{
          display: "inline-block",
          maxWidth: "100%",
          padding: "2px 4px",
          border: "1px dashed #c00",
          color: "#c00",
          font: "700 9px Arial, sans-serif",
          textAlign: "center",
        }}
      >
        {REPORT_LOGO_MISSING_MESSAGE}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- copied verbatim into print windows
    <img
      src={REPORT_LOGO_PATH}
      alt={REPORT_LOGO_ALT}
      style={{
        display: "block",
        width: `${REPORT_LOGO_WIDTH_MM}mm`,
        height: `${REPORT_LOGO_HEIGHT_MM}mm`,
        objectFit: "contain",
      }}
      onError={() => {
        console.error(REPORT_LOGO_MISSING_MESSAGE)
        setMissing(true)
      }}
    />
  )
}
