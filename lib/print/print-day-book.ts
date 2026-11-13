"use client"

import { buildDayBookHtml, type DayBookData } from "./day-book"
import { printHtml } from "./print-html"

/** Bank logo shown at the top-left. Put the file at public/images/bank-logo.png */
export const DAY_BOOK_LOGO = "/images/bank-logo.png"

/**
 * Loads the Day Book for a date and either prints it (hidden iframe) or opens
 * it in a new tab as a preview. Throws with the API's message on failure.
 */
export async function printDayBook(date: string, mode: "print" | "preview" = "print"): Promise<void> {
  // Open the tab first so the browser treats it as part of the click (popup blockers)
  const win = mode === "preview" ? window.open("", "_blank") : null

  try {
    const res = await fetch(`/api/reports/day-book?date=${encodeURIComponent(date)}`, { credentials: "include" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to load day book")

    const html = buildDayBookHtml({
      ...(data as DayBookData),
      logoUrl: `${window.location.origin}${DAY_BOOK_LOGO}`,
      generatedOn: new Date(),
    })

    if (win) {
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
