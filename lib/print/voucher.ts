import { formatDate } from "@/lib/date-format"
import { formatAmount } from "@/lib/number-format"
import { escapeHtml } from "./print-html"
import { reportLogoImgHtml } from "./report-logo"

/**
 * Printable voucher (Reports › Print Voucher): one A4 sheet with a Customer copy and
 * an Office copy separated by a "cut here" line. The same HTML is used for the on-screen
 * preview, printing (printHtml) and the PDF download (downloadHtmlAsPdf).
 */

export type VoucherPrintLine = {
  id: string
  accountCode: number | string
  accountName: string
  refAccountId: string
  debitAmount: number
  creditAmount: number
  narration: string
}

export type VoucherPrintData = {
  voucher: { voucherNo: number; voucherType: string; businessDate: string }
  lines: VoucherPrintLine[]
  totals: { totalDebit: number; totalCredit: number }
  branch: { branchName: string }
  member?: {
    membershipNo: string
    name: string
    fatherName: string
    accountNo: string
    postBalance: number | null
  } | null
}

/* ───────── amount in words: "Rupees Fifty-One Thousand One Hundred Fifty Only" ───────── */

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

const twoDigits = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : ""))

function words(n: number): string {
  if (n === 0) return "Zero"
  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const hundred = Math.floor((n % 1000) / 100)
  const rest = n % 100
  if (crore) parts.push(`${crore >= 100 ? words(crore) : twoDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (hundred) parts.push(`${ONES[hundred]} Hundred`)
  if (rest) parts.push(twoDigits(rest))
  return parts.join(" ")
}

export function voucherAmountInWords(value: number): string {
  const abs = Math.abs(Math.round(value * 100)) / 100
  const rupees = Math.floor(abs)
  const paise = Math.round((abs - rupees) * 100)
  return `Rupees ${words(rupees)}${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`
}

/* ───────── helpers ───────── */

const hasRef = (ref: string | null | undefined) => !!ref && ref.trim() !== "" && ref.trim() !== "0"

/** Receipt when cash comes in, Payment when it goes out; anything else is a Transfer voucher. */
export function voucherTitle(d: VoucherPrintData): string {
  if (d.voucher.voucherType !== "CASH") return "TRANSFER VOUCHER"
  const cashLines = d.lines.filter((l) => /cash/i.test(l.accountName) && !hasRef(l.refAccountId))
  const pool = cashLines.length ? cashLines : d.lines.filter((l) => !hasRef(l.refAccountId))
  const cashIn = pool.reduce((s, l) => s + l.debitAmount - l.creditAmount, 0)
  return cashIn >= 0 ? "RECEIPT VOUCHER" : "PAYMENT VOUCHER"
}

function narrationText(d: VoucherPrintData): string {
  const seen = new Set<string>()
  const parts: string[] = []
  for (const l of d.lines) {
    const n = (l.narration ?? "").trim()
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase())
      parts.push(n)
    }
  }
  let text = parts.join("; ")
  if (text && !/[.!?]$/.test(text)) text += "."
  return text
}

/* ───────── builder ───────── */

const STYLES = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 100%; }
  .copy { border: 2px solid #000; }
  .head { display: grid; grid-template-columns: 30mm 1fr 46mm; align-items: center; padding: 3mm 3mm 2mm; border-bottom: 2px solid #000; }
  .head .logo { display: flex; align-items: center; justify-content: center; }
  .head .mid { text-align: center; }
  .head .kind { font-size: 12pt; }
  .head .bank { font-size: 15pt; font-weight: 700; margin-top: 1mm; }
  .head .copy-name { font-size: 8pt; font-weight: 700; margin-top: 1.5mm; letter-spacing: .3px; }
  .head .meta { font-size: 8pt; font-weight: 700; display: grid; grid-template-columns: auto auto; column-gap: 2mm; row-gap: 3mm; justify-content: end; align-items: baseline; align-self: start; padding-top: 1mm; }
  .head .meta b { font-size: 10.5pt; }
  table { width: 100%; border-collapse: collapse; }
  .info td { border: 1px solid #8c8c8c; padding: 1.6mm 1mm; font-size: 10.5pt; }
  .info td.lbl { background: #f2f2f2; font-size: 8pt; font-weight: 700; width: 23%; }
  .info td.val { width: 27%; }
  .info td.num { text-align: right; }
  .info { border-bottom: 2px solid #000; }
  .lines { margin-top: 1.5mm; }
  .lines th { background: #e8eef6; border: 1px solid #8c8c8c; padding: 1.3mm 1mm; font-size: 9pt; font-weight: 700; text-align: center; }
  .lines td { border: 1px solid #8c8c8c; padding: 1.1mm 1mm; font-size: 9pt; }
  .lines td.c { text-align: center; }
  .lines td.r, .lines th.r { text-align: right; }
  .lines tr.total td { background: #e8eef6; font-weight: 700; font-size: 10pt; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 1.4mm 1mm; }
  .narr { font-size: 8pt; padding: 1mm 0.5mm 0; line-height: 1.3; }
  .words { font-size: 8.5pt; font-weight: 700; padding: 3mm 3mm 0; }
  .sigs { display: grid; grid-template-columns: repeat(4, 1fr); padding: 11mm 4mm 0; text-align: center; font-size: 8pt; font-weight: 700; }
  .sigs span { display: inline-block; border-top: 1px solid #000; min-width: 30mm; padding-top: 1.2mm; }
  .note { text-align: center; font-size: 7pt; font-style: italic; color: #444; padding: 1.5mm 0 1.5mm; }
  .cut { text-align: center; font-size: 7pt; color: #666; margin: 3mm 0; white-space: nowrap; overflow: hidden; }
`

function copyHtml(d: VoucherPrintData, copyName: string): string {
  const m = d.member
  const info = m
    ? `<table class="info"><tbody>
        <tr><td class="lbl">Membership No.</td><td class="val">${escapeHtml(m.membershipNo)}</td>
            <td class="lbl">Member Name</td><td class="val">${escapeHtml(m.name || "-")}</td></tr>
        <tr><td class="lbl">Father / Guardian</td><td class="val">${escapeHtml(m.fatherName || "-")}</td>
            <td class="lbl">Post Transaction Balance (₹)</td><td class="val num">${m.postBalance == null ? "-" : formatAmount(m.postBalance)}</td></tr>
      </tbody></table>`
    : ""

  const rows = d.lines
    .map(
      (l, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(l.accountName)}</td>
        <td>${hasRef(l.refAccountId) ? escapeHtml(l.refAccountId) : ""}</td>
        <td class="r">${formatAmount(l.debitAmount)}</td>
        <td class="r">${formatAmount(l.creditAmount)}</td>
      </tr>`
    )
    .join("")

  const narration = narrationText(d)
  const memberRef = m
    ? ` Membership No. ${escapeHtml(m.membershipNo)}${m.accountNo ? `, Account No. ${escapeHtml(m.accountNo)}` : ""}.`
    : ""

  return `<div class="copy">
    <div class="head">
      <div class="logo">${reportLogoImgHtml()}</div>
      <div class="mid">
        <div class="kind">${voucherTitle(d)}</div>
        <div class="bank">${escapeHtml(d.branch.branchName)}</div>
        <div class="copy-name">${copyName}</div>
      </div>
      <div class="meta">
        <span>Voucher No.</span><b>${escapeHtml(d.voucher.voucherNo)}</b>
        <span>Txn. Date</span><b>${formatDate(d.voucher.businessDate)}</b>
      </div>
    </div>
    ${info}
    <table class="lines">
      <thead><tr>
        <th style="width:9%">Sl. No.</th><th>Particulars</th><th style="width:18%">Account No.</th>
        <th style="width:16%">Debit (₹)</th><th style="width:16%">Credit (₹)</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="total">
          <td colspan="3" class="r">TOTAL</td>
          <td class="r">${formatAmount(d.totals.totalDebit)}</td>
          <td class="r">${formatAmount(d.totals.totalCredit)}</td>
        </tr>
      </tbody>
    </table>
    ${narration || memberRef ? `<p class="narr">Narration: ${escapeHtml(narration)}${memberRef}</p>` : ""}
    <p class="words">Amount in Words: ${voucherAmountInWords(Math.max(d.totals.totalDebit, d.totals.totalCredit))}.</p>
    <div class="sigs"><div><span>C.E.O.</span></div><div><span>Clerk</span></div><div><span>Cashier</span></div><div><span>Member</span></div></div>
    <p class="note">Valid only when duly authorised, signed, and sealed by the authorised officer.</p>
  </div>`
}

export function buildVoucherDocument(d: VoucherPrintData): string {
  const cut = "✂ " + "- ".repeat(32) + "cut here " + "- ".repeat(32) + "✂"
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voucher No. ${escapeHtml(d.voucher.voucherNo)}</title>
<style>${STYLES}</style></head>
<body>
  <section class="sheet">
    ${copyHtml(d, "CUSTOMER COPY")}
    <div class="cut">${cut}</div>
    ${copyHtml(d, "OFFICE COPY")}
  </section>
</body></html>`
}
