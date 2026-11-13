/**
 * Day Book — printed format
 * (Voucher No | Account Number | Particulars | Receipt Cash/Transfer/Total | Payment Cash/Transfer/Total)
 *
 * A4 landscape. Column headings repeat on every page; "Page x of n" and
 * "Generated On / By" print in the footer band of every page.
 */
import { escapeHtml as esc } from "./print-html"

export type DayBookLine = {
  voucherNo: number | string
  accountNo?: string
  particulars: string
  receiptCash: number
  receiptTransfer: number
  paymentCash: number
  paymentTransfer: number
}

export type DayBookGroup = { code?: string; name: string; lines: DayBookLine[] }

export type DayBookData = {
  date: string // YYYY-MM-DD
  bankName: string
  regionOffice?: string
  generatedBy?: string
  generatedOn?: Date
  logoUrl?: string
  groups: DayBookGroup[]
  openingBalance: number
  closingBalance?: number // defaults to opening + cash receipts − cash payments
}

/* ───────── helpers ───────── */

const amt = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dmy = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return d && m && y ? `${d}-${m}-${y}` : iso
}

const dateTime = (dt: Date) => {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(dt.getDate())}-${p(dt.getMonth() + 1)}-${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`
}

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

const twoDigits = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : ""))

/**
 * Indian-system amount in words, in the format used on the Day Book:
 * 47417    → "Rupees Forty-seven thousand, four hundred and seventeen Only"
 * 105680.5 → "Rupees One lakh, five thousand, six hundred and eighty and fifty paise Only"
 */
export function rupeesInWords(value: number): string {
  const neg = value < 0
  const abs = Math.abs(Math.round(value * 100)) / 100
  const rupees = Math.floor(abs)
  const paise = Math.round((abs - rupees) * 100)

  const words = (n: number): string => {
    if (n === 0) return "zero"
    const parts: string[] = []
    const crore = Math.floor(n / 10000000)
    const lakh = Math.floor((n % 10000000) / 100000)
    const thousand = Math.floor((n % 100000) / 1000)
    const hundred = Math.floor((n % 1000) / 100)
    const rest = n % 100
    if (crore) parts.push(`${crore >= 100 ? words(crore) : twoDigits(crore)} crore`)
    if (lakh) parts.push(`${twoDigits(lakh)} lakh`)
    if (thousand) parts.push(`${twoDigits(thousand)} thousand`)
    let last = ""
    if (hundred) last = `${ONES[hundred]} hundred`
    if (rest) last = last ? `${last} and ${twoDigits(rest)}` : parts.length ? `and ${twoDigits(rest)}` : twoDigits(rest)
    if (last) {
      // "one thousand and fifty" — no comma before a bare "and …"
      if (last.startsWith("and ") && parts.length) return `${parts.join(", ")} ${last}`
      parts.push(last)
    }
    return parts.join(", ")
  }

  let text = words(rupees)
  if (paise) text += ` and ${twoDigits(paise)} paise`
  text = text.charAt(0).toUpperCase() + text.slice(1)
  return `Rupees ${neg ? "Minus " : ""}${text} Only`
}

/* ───────── builder ───────── */

export function buildDayBookHtml(d: DayBookData): string {
  const tot = { rc: 0, rt: 0, pc: 0, pt: 0 }

  const body = d.groups
    .map((g) => {
      const s = { rc: 0, rt: 0, pc: 0, pt: 0 }
      const rows = g.lines
        .map((l) => {
          s.rc += l.receiptCash; s.rt += l.receiptTransfer; s.pc += l.paymentCash; s.pt += l.paymentTransfer
          return `<tr>
  <td class="c">${esc(l.voucherNo)}</td><td class="r">${esc(l.accountNo ?? "")}</td><td>${esc(l.particulars)}</td>
  <td class="r">${amt(l.receiptCash)}</td><td class="r">${amt(l.receiptTransfer)}</td><td class="r">${amt(l.receiptCash + l.receiptTransfer)}</td>
  <td class="r">${amt(l.paymentCash)}</td><td class="r">${amt(l.paymentTransfer)}</td><td class="r">${amt(l.paymentCash + l.paymentTransfer)}</td>
</tr>`
        })
        .join("")
      tot.rc += s.rc; tot.rt += s.rt; tot.pc += s.pc; tot.pt += s.pt
      return `<tbody class="grp">
<tr class="gh"><td></td><td></td><td class="b">${esc(g.name)}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
${rows}
<tr class="sub"><td></td><td></td><td>Subtotal(₹)</td>
  <td class="r">${amt(s.rc)}</td><td class="r">${amt(s.rt)}</td><td class="r">${amt(s.rc + s.rt)}</td>
  <td class="r">${amt(s.pc)}</td><td class="r">${amt(s.pt)}</td><td class="r">${amt(s.pc + s.pt)}</td></tr>
</tbody>`
    })
    .join("")

  const closing = d.closingBalance ?? d.openingBalance + tot.rc - tot.pc
  const receiptSide = d.openingBalance + tot.rc
  const paymentSide = closing + tot.pc
  const generatedOn = dateTime(d.generatedOn ?? new Date())
  const footerRight = `Generated On : ${generatedOn}\\A Generated By : ${String(d.generatedBy ?? "").replace(/["\\]/g, "")}`

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Day Book ${esc(dmy(d.date))}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 10mm 10mm 16mm;
    @bottom-left   { content: "Page :  " counter(page) " of " counter(pages); font: 700 9pt Arial, sans-serif;
                     background: #dbe7f5; vertical-align: middle; padding-left: 4mm; margin-bottom: 3mm; }
    @bottom-center { content: ""; background: #dbe7f5; margin-bottom: 3mm; }
    @bottom-right  { content: "${footerRight}"; white-space: pre; font: 8pt Arial, sans-serif; text-align: left;
                     background: #dbe7f5; vertical-align: middle; margin-bottom: 3mm; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .band { background: #daf0d3; display: grid; grid-template-columns: 22mm 1fr 22mm; align-items: center; padding: 2mm 0 0; }
  .logo { width: 20mm; height: 20mm; object-fit: contain; margin-left: 1mm; }
  .titles { text-align: center; }
  .bank { font-size: 13pt; font-weight: 700; }
  .rep  { font-size: 10pt; font-weight: 700; margin-top: 3mm; }
  .meta { grid-column: 1 / -1; display: flex; justify-content: space-between; padding: 1mm 1mm 0.5mm 25mm; }
  .meta .dt span { display: inline-block; min-width: 26mm; text-align: right; }

  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { border: 1px solid #000; font-weight: 700; padding: 1.5mm 1mm; background: #fff; }
  td { padding: 0.3mm 1mm; white-space: nowrap; }
  .book td { border-left: 1px solid #000; border-right: 1px solid #000; }
  .book { border: 1px solid #000; }
  .grp { break-inside: auto; }
  tr { break-inside: avoid; }
  .gh { break-after: avoid; page-break-after: avoid; }
  .gh td { border-top: 1px solid #000; }
  .sub td { background: #f2d3ee; border-top: 1px solid #000; border-bottom: 1px solid #000; }
  .b { font-weight: 700; }
  .c { text-align: center; }
  .r { text-align: right; }
  td:nth-child(3) { white-space: normal; }

  .totals { margin-top: 0; }
  .totals td { padding: 0.6mm 1mm; font-weight: 700; }
  .totals .red { color: #c00000; font-weight: 400; }

  .words { display: flex; gap: 0; margin-top: 9mm; }
  .words div:first-child { width: 58mm; }
  .sigs { display: grid; grid-template-columns: 58mm 1fr 1fr 1fr; margin-top: 7mm; }
  .sigs div:nth-child(3) { text-align: center; }
  .sigs div:nth-child(4) { text-align: right; padding-right: 22mm; }
  .closing { break-inside: avoid; }
</style></head><body>

<div class="band">
  ${d.logoUrl ? `<img class="logo" src="${esc(d.logoUrl)}" alt="" onerror="this.style.visibility='hidden'">` : "<div></div>"}
  <div class="titles"><div class="bank">${esc(d.bankName)}</div><div class="rep">DAY BOOK</div></div>
  <div></div>
  <div class="meta"><div>${d.regionOffice ? `R.O : ${esc(d.regionOffice)}` : ""}</div><div class="dt">DATE <span>${esc(dmy(d.date))}</span></div></div>
</div>

<table class="book">
  <colgroup>
    <col style="width:6.5%"><col style="width:10%"><col style="width:20%">
    <col style="width:9%"><col style="width:9%"><col style="width:8.5%">
    <col style="width:8.5%"><col style="width:9%"><col style="width:8.5%">
  </colgroup>
  <thead>
    <tr><th rowspan="2">Voucher No.</th><th rowspan="2">Account Number</th><th rowspan="2">Particulars</th>
        <th colspan="3">Receipt</th><th colspan="3">Payment</th></tr>
    <tr><th>Cash(₹)</th><th>Transfer(₹)</th><th>Total</th><th>Cash(₹)</th><th>Transfer(₹)</th><th>Total</th></tr>
  </thead>
  ${body || `<tbody><tr><td colspan="9" class="c" style="padding:6mm">No passed vouchers for this date</td></tr></tbody>`}
</table>

<div class="closing">
<table class="totals">
  <colgroup>
    <col style="width:6.5%"><col style="width:10%"><col style="width:20%">
    <col style="width:9%"><col style="width:9%"><col style="width:8.5%">
    <col style="width:8.5%"><col style="width:9%"><col style="width:8.5%">
  </colgroup>
  <tr><td></td><td></td><td class="r">Grand Total (₹)</td>
      <td class="r">${amt(tot.rc)}</td><td class="r">${amt(tot.rt)}</td><td class="r">${amt(tot.rc + tot.rt)}</td>
      <td class="r">${amt(tot.pc)}</td><td class="r">${amt(tot.pt)}</td><td class="r">${amt(tot.pc + tot.pt)}</td></tr>
  <tr><td></td><td></td><td class="r red">Opening Balance(₹)</td><td class="r red">${amt(d.openingBalance)}</td><td></td>
      <td class="r red">Closing Balance (₹)</td><td class="r red">${amt(closing)}</td><td></td><td></td></tr>
  <tr><td></td><td></td><td class="r">Grand Total (₹)</td><td class="r">${amt(receiptSide)}</td><td></td>
      <td class="r">Grand Total (₹)</td><td class="r">${amt(paymentSide)}</td><td></td><td></td></tr>
</table>

<div class="words"><div>Closing Cash In Words :</div><div>${esc(rupeesInWords(closing))}</div></div>
<div class="sigs"><div></div><div>C.E.O.</div><div>PRESIDENT</div><div>AUDITOR</div></div>
</div>

</body></html>`
}
