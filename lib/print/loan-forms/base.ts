/**
 * Shared layout for the security-specific loan application forms (Gold, Personal
 * Surety, Deposit, Vehicle, Insurance, Building, Other). The Land Security form
 * (lt-loan-application-form.ts) is separate and is not built from this file.
 *
 * Same conventions as the Land form: A4, bank header box, Tamil labels (with English),
 * and every value optional — anything missing prints as an empty cell for hand-filling.
 *
 * Each security template supplies its title, request paragraph, security section(s),
 * declarations and any extra signature blocks; this file supplies the common parts
 * (header, loan details, applicant details, declaration/signature, office use).
 */
import { escapeHtml as esc } from "../print-html"
export { esc }
import { amountToWords } from "../lt-loan-application-form"

/* ───────────────────────── data types ───────────────────────── */

export type PrintPerson = {
  membershipNo?: string
  name?: string
  fatherOrHusbandName?: string
  dateOfBirth?: string
  age?: string | number
  gender?: string
  community?: string
  presentAddress?: string
  permanentAddress?: string
  mobile?: string
  phone?: string
  email?: string
  aadhaar?: string
  pan?: string
  rationCard?: string
  voterId?: string
  occupation?: string
  monthlyIncome?: string | number
  bankAccount?: { bankName?: string; branch?: string; accountNo?: string }
}

export type PrintLoan = {
  applicationNo?: string
  applicationDate?: string
  schemeName?: string
  loanType?: string
  purpose?: string
  amount?: string | number
  securityName?: string
  securityRefNo?: string
}

/** [label, value] — value is printed as-is (escaped); blank values leave an empty cell. */
export type Field = [label: string, value: unknown]

export type LoanFormSpec = {
  /** Browser/print document title */
  docTitle: string
  titleTa: string
  titleEn: string
  bankName?: string
  loan: PrintLoan
  applicant: PrintPerson
  /** Opening request paragraph (HTML; build values with `inl`) */
  requestHtml: string
  /** Security-specific section bodies, numbered after the applicant section */
  sections: { titleTa: string; titleEn: string; html: string }[]
  /** Applicant's declarations (plain text) */
  declarations: string[]
  /** Extra sheets after the applicant declaration (e.g. surety consent, appraiser certificate) */
  extraSheets?: string[]
}

/* ───────────────────────── helpers ───────────────────────── */

export const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === ""

/** Inline value, or an underline blank for hand-filling. */
export function inl(v: unknown, widthMm = 30): string {
  return isBlank(v)
    ? `<span class="blank" style="min-width:${widthMm}mm"></span>`
    : `<span class="val">${esc(v)}</span>`
}

/** Table-cell value (empty when missing). */
export function cell(v: unknown): string {
  return isBlank(v) ? "" : `<span class="val">${esc(v)}</span>`
}

export function money(v: unknown): string {
  if (isBlank(v)) return ""
  const n = Number(String(v).replace(/[,₹\s]/g, ""))
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v)
}

export function grams(v: unknown): string {
  if (isBlank(v)) return ""
  const n = Number(v)
  return Number.isFinite(n) ? `${n.toFixed(3)} g` : String(v)
}

export function yesNo(v: unknown): string {
  if (v === true || v === "true" || v === "t") return "ஆம் / Yes"
  if (v === false || v === "false" || v === "f") return "இல்லை / No"
  return ""
}

/** UPPER_SNAKE codes → "Upper Snake" for display. */
export function codeLabel(v: unknown): string {
  if (isBlank(v)) return ""
  return String(v)
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

/** Label/value grid with `cols` pairs per row. */
export function fieldsTable(fields: Field[], cols: 1 | 2 = 2): string {
  const rows: string[] = []
  for (let i = 0; i < fields.length; i += cols) {
    const pair = fields.slice(i, i + cols)
    const tds = pair
      .map(([label, value]) => `<td class="lbl">${label}</td><td class="v">${cell(value)}</td>`)
      .join("")
    const filler = pair.length < cols ? `<td class="lbl"></td><td class="v"></td>` : ""
    rows.push(`<tr>${tds}${filler}</tr>`)
  }
  return `<table class="grid cols${cols}">${rows.join("")}</table>`
}

/** Person details (applicant, surety) with a photo box. */
export function personTable(p: PrintPerson, photoLabel = "மனுதாரர்<br>புகைப்படம்"): string {
  const dobAge = [p.dateOfBirth, isBlank(p.age) ? "" : `${p.age} வயது`].filter((x) => !isBlank(x)).join(" / ")
  const bank = p.bankAccount ?? {}
  const top: Field[] = [
    ["உறுப்பினர் எண்<br><small>Membership No</small>", p.membershipNo],
    ["பெயர்<br><small>Name</small>", p.name],
    ["தகப்பனார் / கணவர் பெயர்<br><small>Father / Husband Name</small>", p.fatherOrHusbandName],
    ["பிறந்த தேதி / வயது<br><small>Date of Birth / Age</small>", dobAge],
    ["பாலினம் / இனம்<br><small>Gender / Community</small>", [p.gender, p.community].filter((x) => !isBlank(x)).join(" / ")],
  ]
  const topRows = top
    .map(
      ([l, v], i) =>
        `<tr><td class="lbl">${l}</td><td class="v">${cell(v)}</td>${
          i === 0 ? `<td class="photo" rowspan="${top.length}">${photoLabel}</td>` : ""
        }</tr>`
    )
    .join("")
  return `<table class="grid person">${topRows}</table>
  ${fieldsTable([
    ["தற்போதைய முகவரி<br><small>Present Address</small>", p.presentAddress],
    ["நிரந்தர முகவரி<br><small>Permanent Address</small>", p.permanentAddress],
  ], 1)}
  ${fieldsTable([
    ["அலைபேசி எண்<br><small>Mobile</small>", p.mobile],
    ["தொலைபேசி எண்<br><small>Phone</small>", p.phone],
    ["மின்னஞ்சல்<br><small>Email</small>", p.email],
    ["ஆதார் எண்<br><small>Aadhaar No</small>", p.aadhaar],
    ["PAN எண்<br><small>PAN</small>", p.pan],
    ["குடும்ப அட்டை எண்<br><small>Ration Card</small>", p.rationCard],
    ["வாக்காளர் அட்டை எண்<br><small>Voter ID</small>", p.voterId],
    ["தொழில்<br><small>Occupation</small>", p.occupation],
    ["மாத வருமானம்<br><small>Monthly Income (₹)</small>", money(p.monthlyIncome)],
    ["வங்கி கணக்கு<br><small>Bank / Branch / A/c No</small>", [bank.bankName, bank.branch, bank.accountNo].filter((x) => !isBlank(x)).join(" / ")],
  ])}`
}

/** Signature line(s) at the bottom right, optionally with place/date on the left. */
export function signatureBlock(labels: string[], withPlaceDate = true): string {
  return `<div class="sigs">
    ${withPlaceDate ? `<div class="pd">இடம் / Place:<br>தேதி / Date:</div>` : "<div></div>"}
    <div class="sig-list">${labels.map((l) => `<div class="sig">${l}</div>`).join("")}</div>
  </div>`
}

/* ───────────────────────── document ───────────────────────── */

export function buildLoanApplicationDocument(spec: LoanFormSpec): string {
  const { loan, applicant } = spec
  const words = amountToWords(loan.amount)

  const loanFields: Field[] = [
    ["கடன் மனு எண்<br><small>Application No</small>", loan.applicationNo],
    ["நாள்<br><small>Date</small>", loan.applicationDate],
    ["கடன் திட்டம்<br><small>Loan Scheme</small>", loan.schemeName],
    ["கடன் வகை<br><small>Loan Type</small>", loan.loanType],
    ["கடன் நோக்கம்<br><small>Purpose</small>", loan.purpose],
    ["ஈடு வகை<br><small>Security Type</small>", loan.securityName],
    ["கோரும் தொகை<br><small>Amount Requested (₹)</small>", money(loan.amount)],
    ["ஈடு குறிப்பு எண்<br><small>Security Ref No</small>", loan.securityRefNo],
  ]

  const sectionsHtml = spec.sections
    .map((s, i) => `<h2>${i + 3}. ${s.titleTa} <small>(${s.titleEn})</small></h2>${s.html}`)
    .join("")
  const declNo = spec.sections.length + 3

  return `<!doctype html>
<html lang="ta"><head><meta charset="utf-8">
<title>${esc(spec.docTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=block" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 13mm 13mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    font-family: "Noto Sans Tamil", "Latha", "Nirmala UI", "Vijaya", Arial, sans-serif;
    font-size: 10pt; line-height: 1.4; color: #000;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  small { font-size: 7.5pt; color: #333; font-weight: 400; }

  .val { font-weight: 600; }
  .blank { display: inline-block; border-bottom: 1px solid #000; height: 1em; vertical-align: baseline; }

  .head-box { border: 2px solid #000; outline: 1px solid #000; outline-offset: 2px; text-align: center;
              font-weight: 700; font-size: 12.5pt; padding: 3mm 4mm; margin: 2mm 4mm 4mm; line-height: 1.5; }
  .title { text-align: center; font-weight: 700; font-size: 11.5pt; margin: 0 0 1mm; text-decoration: underline; }
  .title-en { text-align: center; font-weight: 600; margin: 0 0 4mm; }
  .para { text-align: justify; text-indent: 12mm; line-height: 2.1; margin: 1mm 0 3mm; }

  h2 { font-size: 10.5pt; font-weight: 700; margin: 4mm 0 1.5mm; break-after: avoid; page-break-after: avoid; }
  h2 small { font-size: 8.5pt; font-weight: 600; color: #000; }

  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 1.2mm 2mm; vertical-align: top; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  thead { display: table-header-group; }
  table + table { border-top: 0; }
  table + table tr:first-child td { border-top: 0; }

  table.grid { table-layout: fixed; }
  .grid td.lbl { width: 21%; }
  .grid.cols2 td.v { width: 29%; }
  .grid td.v { overflow-wrap: anywhere; }
  .grid.cols1 td.v { height: 10mm; }
  .keep { break-inside: avoid; page-break-inside: avoid; }
  .photo { width: 36mm; text-align: center; vertical-align: middle !important; font-weight: 600; }

  .items th { font-weight: 600; font-size: 9pt; text-align: center; vertical-align: middle; }
  .items td { height: 8mm; }
  .items tr.total td { font-weight: 700; }
  .c { text-align: center !important; }
  .r { text-align: right !important; }

  .decl ol { margin: 0; padding-left: 6mm; text-align: justify; line-height: 1.7; }
  .decl li { margin-bottom: 1.2mm; }

  .sigs { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14mm; break-inside: avoid; }
  .sigs .pd { line-height: 2.2; }
  .sig-list { display: flex; gap: 14mm; }
  .sig { min-width: 50mm; text-align: center; border-top: 1px solid #000; padding-top: 1mm; }

  .office td { height: 9mm; }
  .office-sigs { display: flex; justify-content: space-between; margin-top: 16mm; text-align: center; }
  .office-sigs > div { min-width: 40mm; border-top: 1px solid #000; padding-top: 1mm; }
  .note { font-size: 8.5pt; margin-top: 1.5mm; }
</style></head><body>

<section class="sheet">
  <div class="head-box">${inl(spec.bankName, 45)} தொடக்க கூட்டுறவு வேளாண்மை மற்றும் ஊரக<br>வளர்ச்சி வங்கி லிட்.,</div>
  <div class="title">${spec.titleTa}</div>
  <div class="title-en">${spec.titleEn}</div>

  <p style="margin:2mm 0 0">ஐயா,</p>
  <p class="para">${spec.requestHtml}</p>

  <h2>1. கடன் விவரம் <small>(Loan Details)</small></h2>
  ${fieldsTable(loanFields)}
  ${fieldsTable([["தொகை (எழுத்தால்)<br><small>Amount in Words</small>", words ? `Rupees ${words}` : ""]], 1)}

  <h2>2. விண்ணப்பதாரர் விவரம் <small>(Applicant Details)</small></h2>
  ${personTable(applicant)}

  ${sectionsHtml}

  <div class="decl keep">
    <h2>${declNo}. வாக்குமூலம் <small>(Declaration by the Applicant)</small></h2>
    <ol>${spec.declarations.map((d) => `<li>${esc(d)}</li>`).join("")}</ol>
    ${signatureBlock(["மனுதாரரின் கையொப்பம்<br><small>Signature of the Applicant</small>"])}
  </div>
</section>

${(spec.extraSheets ?? []).map((s) => `<section class="sheet">${s}</section>`).join("\n")}

<section class="sheet">
  <h2 style="text-align:center;margin-top:0">அலுவலக பயன்பாட்டிற்கு மட்டும் <small>(For Office Use Only)</small></h2>
  <table class="grid cols2 office">
    <tr><td class="lbl">மனு பெறப்பட்ட நாள்<br><small>Date of Receipt</small></td><td class="v">${cell(loan.applicationDate)}</td>
        <td class="lbl">மனு எண்<br><small>Application No</small></td><td class="v">${cell(loan.applicationNo)}</td></tr>
    <tr><td class="lbl">ஈடு சரிபார்ப்பு<br><small>Security Verified By</small></td><td class="v"></td>
        <td class="lbl">சரிபார்த்த நாள்<br><small>Verification Date</small></td><td class="v"></td></tr>
    <tr><td class="lbl">பரிந்துரைக்கப்பட்ட தொகை<br><small>Amount Recommended (₹)</small></td><td class="v"></td>
        <td class="lbl">அனுமதிக்கப்பட்ட தொகை<br><small>Amount Sanctioned (₹)</small></td><td class="v"></td></tr>
    <tr><td class="lbl">வட்டி விகிதம்<br><small>Rate of Interest (%)</small></td><td class="v"></td>
        <td class="lbl">தவணைக் காலம்<br><small>Tenure (Months)</small></td><td class="v"></td></tr>
    <tr><td class="lbl">அனுமதி நாள்<br><small>Sanction Date</small></td><td class="v"></td>
        <td class="lbl">தீர்மான எண்<br><small>Resolution No</small></td><td class="v"></td></tr>
    <tr><td class="lbl">குறிப்பு<br><small>Remarks</small></td><td class="v" colspan="3" style="height:20mm"></td></tr>
  </table>
  <div class="office-sigs">
    <div>மேற்பார்வையாளர்<br><small>Supervisor</small></div>
    <div>செயலாளர்<br><small>Secretary</small></div>
    <div>செயலாட்சியர் / தலைவர்<br><small>Special Officer / President</small></div>
  </div>
</section>

</body></html>`
}

/** What every security template receives besides its own security details. */
export type FormContext = { bankName?: string; loan: PrintLoan; applicant: PrintPerson }

/** "நான் … ரூ.____ (Rupees … Only) கடன் …" — the opening request, shared wording. */
export function requestParagraph(ctx: FormContext, securityPhraseTa: string): string {
  const words = amountToWords(ctx.loan.amount)
  return `${inl(ctx.applicant.name, 40)} ஆகிய நான், உறுப்பினர் எண் ${inl(ctx.applicant.membershipNo, 20)},
    ${securityPhraseTa} ${inl(ctx.loan.purpose, 35)} நோக்கத்திற்கு ரூ.${inl(money(ctx.loan.amount), 25)}
    (Rupees ${inl(words, 70)}) கடன் வழங்குமாறு கேட்டுக்கொள்கிறேன்.`
}
