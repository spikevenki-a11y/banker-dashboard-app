"use client"

import { buildDayBookHtml, type DayBookData } from "./day-book"
import { downloadHtmlAsPdf } from "./html-to-pdf"
import { printHtml } from "./print-html"

/**
 * Loads the Day Book for a date and prints it (hidden iframe), opens it in a new
 * tab ("preview"), or saves it as an A4 landscape PDF ("pdf"). All three use the
 * same bank-format document, logo included. Throws with the API's message on failure.
 */
export async function printDayBook(date: string, mode: "print" | "preview" | "pdf" = "print"): Promise<void> {
  // Open the tab first so the browser treats it as part of the click (popup blockers)
  const win = mode === "preview" ? window.open("", "_blank") : null

  try {
    const res = await fetch(`/api/reports/day-book?date=${encodeURIComponent(date)}`, { credentials: "include" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to load day book")

    const html = buildDayBookHtml({
      ...(data as DayBookData),
      generatedOn: new Date(),
    })

    if (mode === "pdf") {
      await downloadHtmlAsPdf(html, `Day-Book-${date}.pdf`)
    } else if (win) {
      win.document.open()
      win.document.write(html)
      win.document.close()
    } else {
      printHtml(html)
    }
  } catch (err) {
    win?.close()
    throw err
  }
}
