import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  REPORT_LOGO_HEIGHT_MM,
  REPORT_LOGO_MISSING_MESSAGE,
  REPORT_LOGO_NATURAL,
  REPORT_LOGO_PATH,
  REPORT_LOGO_WIDTH_MM,
  reportLogoImgHtml,
} from "./report-logo"
import { buildReportHeaderHtml } from "./report-header"
import { buildDayBookHtml } from "./day-book"
import { buildCashBookHtml } from "./cash-book"

const file = join(process.cwd(), "public", REPORT_LOGO_PATH)

describe("report logo asset", () => {
  it("exists at public/images/NCARDB_LOGO.png", () => {
    expect(existsSync(file), `${REPORT_LOGO_MISSING_MESSAGE}. Every report header needs this file.`).toBe(true)
  })

  it("matches the recorded pixel size, so the printed aspect ratio is exact", () => {
    const png = readFileSync(file)
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG")
    expect({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) }).toEqual(REPORT_LOGO_NATURAL)
    expect(REPORT_LOGO_WIDTH_MM / REPORT_LOGO_HEIGHT_MM).toBeCloseTo(
      REPORT_LOGO_NATURAL.width / REPORT_LOGO_NATURAL.height,
      3
    )
  })
})

describe("report headers", () => {
  const img = reportLogoImgHtml()

  it("logo markup uses the shared file and size, and reports a missing file", () => {
    expect(img).toContain(REPORT_LOGO_PATH)
    expect(img).toContain(`height:${REPORT_LOGO_HEIGHT_MM}mm`)
    expect(img).toContain(`data-missing="${REPORT_LOGO_MISSING_MESSAGE}"`)
    expect(img).toContain("onerror=")
  })

  it("standard report header places the logo after (right of) the bank block", () => {
    const html = buildReportHeaderHtml("Member Report", "01-04-2026 to 31-03-2027", { bank_name: "Test Bank" })
    expect(html.indexOf(REPORT_LOGO_PATH)).toBeGreaterThan(html.indexOf("Test Bank"))
    expect(html).toContain("justify-content:flex-end")
    expect(html).toContain("Member Report")
  })

  it("day book (landscape) and cash book (portrait) include the logo at the right", () => {
    const day = buildDayBookHtml({ date: "2026-11-17", bankName: "Test Bank", groups: [], openingBalance: 0 })
    const cash = buildCashBookHtml({
      bankName: "Test Bank",
      days: [{ date: "2026-11-17", openingBalance: 0, lines: [] }],
    } as unknown as Parameters<typeof buildCashBookHtml>[0])
    // Day Book is one landscape sheet, so its PDF download keeps landscape orientation
    expect(day).toContain('<section class="sheet landscape">')
    for (const html of [day, cash]) {
      expect(html).toContain(REPORT_LOGO_PATH)
      expect(html.indexOf(REPORT_LOGO_PATH)).toBeGreaterThan(html.indexOf('class="titles"'))
    }
  })
})
