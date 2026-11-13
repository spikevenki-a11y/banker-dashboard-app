"use client"

import { buildCashBookHtml, type CashBookData } from "./cash-book"
import { downloadHtmlAsPdf } from "./html-to-pdf"
import { printHtml } from "./print-html"
import { DAY_BOOK_LOGO } from "./print-day-book"

/**
 * Loads the Cash Book for a date (or range, max 31 days) and prints it,
 * opens it in a new tab ("preview"), or saves it as a PDF ("pdf").
 * Throws with the API's message on failure.
 */
export async function printCashBook(
  from: string,
  to: string = from,
  mode: "print" | "preview" | "pdf" = "print"
): Promise<void> {
  // Open the tab first so the browser treats it as part of the click (popup blockers)
  const win = mode === "preview" ? window.open("", "_blank") : null

  try {
    const qs = new URLSearchParams({ from, to: to || from })
    const res = await fetch(`/api/reports/cash-book?${qs}`, { credentials: "include" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to load cash book")

    const html = buildCashBookHtml({
      ...(data as CashBookData),
      logoUrl: `${window.location.origin}${DAY_BOOK_LOGO}`,
      generatedOn: new Date(),
    })

    if (mode === "pdf") {
      await downloadHtmlAsPdf(html, `Cash-Book-${from}${to && to !== from ? `-to-${to}` : ""}.pdf`)
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
