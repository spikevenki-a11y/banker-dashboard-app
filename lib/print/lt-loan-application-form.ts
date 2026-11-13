/**
 * நீண்ட / மத்திய கால கடன் பெறுவதற்கான மனு  (LT / MT Loan Application Form)
 *
 * Builds a print-ready HTML document that reproduces the bank's paper form.
 * Every field is optional: whatever you pass is printed, anything missing is
 * left as a blank line / empty cell for hand-filling. Calling it with `{}`
 * gives a completely blank form.
 *
 * Pages: 1–3 portrait (items 1–23), 4–6 landscape (items 24–26),
 *        7 portrait (Statement & Assurance + VAO certificate).
 */
import { escapeHtml as esc } from "./print-html"

export type Community = "ST" | "SC" | "MBC" | "DNC" | "BC" | "General" | "Others"

export type LtFamilyMember = {
  name?: string
  relation?: string
  age?: string | number
  phone?: string
  aadhaar?: string
}

export type LtCultivatedLand = {
  village?: string
  surveyNo?: string
  landType?: string // நன்செய் / புன்செய்
  totalExtent?: string
  crop?: string
  kist?: string // நிலத்தீர்வை
  anticipatedIncome?: string | number
  wellPumpShare?: string
}

export type LtSecurityLand = {
  village?: string
  surveyNo?: string
  landType?: string
  totalExtent?: string
  mortgagedExtent?: string
  guidelineValue?: string | number
  marketValue?: string | number
  remarks?: string
}

export type LtLoanFormData = {
  // Header
  bankName?: string // e.g. "பல்லடம்" → "பல்லடம் தொடக்க கூட்டுறவு ..."
  regionName?: string // ______ மண்டல அலுவலகம்

  applicationNo?: string
  applicationDate?: string
  loanPurpose?: string

  // Opening paragraph
  residingVillage?: string
  landVillage?: string
  landExtent?: string
  amount?: number | string
  amountInWords?: string // auto-generated from amount when omitted

  // 1–15
  membershipNo?: string
  name?: string
  fatherOrHusbandName?: string
  dateOfBirth?: string
  age?: string | number
  religion?: string
  community?: Community | string
  presentAddress?: string
  permanentAddress?: string
  phone?: string
  mobile?: string
  email?: string
  aadhaar?: string
  pan?: string
  aadhaarPanLinked?: boolean | null
  rationCard?: string
  voterId?: string

  // 16–19
  occupation?: string
  monthlyIncome?: string | number
  monthlyExpenses?: string | number
  netMonthlyIncome?: string | number
  bankAccount?: {
    bankName?: string
    branch?: string
    accountType?: string
    accountNo?: string
    ifsc?: string
  }
  loanItem?: string // கடன் காரியம்
  requestedAmount?: string | number

  // 20–22
  securityVillage?: string
  securitySurveyNo?: string
  securitySubDivisionNo?: string
  securityExtent?: string
  litigationDetails?: string
  otherLoan?: {
    exists?: boolean | null
    institution?: string
    purpose?: string
    amount?: string | number
    outstanding?: string | number
  }

  // 23, 25, 26
  family?: LtFamilyMember[]
  cultivatedLands?: LtCultivatedLand[]
  securityLands?: LtSecurityLand[]
}

/* ───────────────────────── helpers ───────────────────────── */

const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === ""

/** Inline value, or an underline blank of the given width for hand-filling. */
function inl(v: unknown, widthMm = 30): string {
  return isBlank(v)
    ? `<span class="blank" style="min-width:${widthMm}mm"></span>`
    : `<span class="val">${esc(v)}</span>`
}

/** Table-cell value (empty cell when missing). */
function cell(v: unknown): string {
  return isBlank(v) ? "" : `<span class="val">${esc(v)}</span>`
}

function money(v: unknown): string {
  if (isBlank(v)) return ""
  const n = Number(String(v).replace(/[,₹\s]/g, ""))
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(v)
}

function box(checked: boolean): string {
  return `<span class="chk">${checked ? "&#10003;" : ""}</span>`
}

/** "ஆம் / இல்லை" with the chosen option circled; plain text when unknown. */
function yesNo(v: boolean | null | undefined): string {
  if (v === true) return `<span class="circle">ஆம்</span> / இல்லை`
  if (v === false) return `ஆம் / <span class="circle">இல்லை</span>`
  return "ஆம் / இல்லை"
}

/** Indian-system number → English words, e.g. 520000 → "Five Lakh Twenty Thousand Only". */
export function amountToWords(input: number | string | undefined | null): string {
  const n = Math.floor(Number(String(input ?? "").replace(/[,₹\s]/g, "")))
  if (!Number.isFinite(n) || n <= 0) return ""
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
    "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  const two = (x: number) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`)
  const three = (x: number) =>
    x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? " " + two(x % 100) : ""}` : two(x)

  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000
  if (crore) parts.push(`${crore >= 100 ? three(crore) : two(crore)} Crore`)
  if (lakh) parts.push(`${two(lakh)} Lakh`)
  if (thousand) parts.push(`${two(thousand)} Thousand`)
  if (rest) parts.push(three(rest))
  return `${parts.join(" ")} Only`
}

function padRows<T>(rows: T[] | undefined, min: number): (T | undefined)[] {
  const out: (T | undefined)[] = [...(rows ?? [])]
  while (out.length < min) out.push(undefined)
  return out
}

/* ───────────────────────── builder ───────────────────────── */

export function buildLtLoanApplicationHtml(d: LtLoanFormData = {}): string {
  const words = d.amountInWords ?? amountToWords(d.amount)
  const comm = String(d.community ?? "").toUpperCase()
  const bank = d.bankAccount ?? {}
  const ol = d.otherLoan ?? {}

  // A row in the main (items 1–23) table
  const row = (no: string, label: string, value = "", opts: { bold?: boolean; noColon?: boolean; tall?: boolean } = {}) =>
    `<tr${opts.tall ? ' class="tall"' : ""}><td class="no">${no}</td><td class="lbl${opts.bold ? " b" : ""}">${label}</td><td class="colon">${opts.noColon ? "" : ":"}</td><td class="v">${value}</td></tr>`

  const communityOptions: [string[], string][] = [
    [["ST"], "பழங்குடியினர் (ST)"],
    [["SC"], "தாழ்த்தப்பட்டவர் (SC)"],
    [["MBC", "DNC"], "மிகவும் பிற்படுத்தப்பட்டவர் (MBC)/<br>சீர்மரபினர் (DNC)"],
    [["BC"], "பிற்படுத்தப்பட்டவர் (BC)"],
    [["GENERAL", "OC"], "பொதுபிரிவினர் (General)"],
    [["OTHERS"], "பிற (Others)"],
  ]
  const communityHtml = communityOptions
    .map(([codes, label]) => `<div class="opt">${box(codes.includes(comm))} ${label}</div>`)
    .join("")

  const dobAge = [d.dateOfBirth, isBlank(d.age) ? "" : `${d.age} வயது`].filter((x) => !isBlank(x)).join(" / ")

  const familyRows = padRows(d.family, 4)
    .map(
      (f, i) =>
        `<tr><td class="c">${i + 1}</td><td>${cell(f?.name)}</td><td>${cell(f?.relation)}</td><td class="c">${cell(f?.age)}</td><td>${cell(f?.phone)}</td><td>${cell(f?.aadhaar)}</td></tr>`
    )
    .join("")

  const cultivatedRows = padRows(d.cultivatedLands, 8)
    .map(
      (l) =>
        `<tr class="land"><td>${cell(l?.village)}</td><td>${cell(l?.surveyNo)}</td><td>${cell(l?.landType)}</td><td>${cell(l?.totalExtent)}</td><td>${cell(l?.crop)}</td><td>${cell(l?.kist)}</td><td class="r">${cell(money(l?.anticipatedIncome))}</td><td>${cell(l?.wellPumpShare)}</td></tr>`
    )
    .join("")

  const securityRows = padRows(d.securityLands, 8)
    .map(
      (l) =>
        `<tr class="land"><td>${cell(l?.village)}</td><td>${cell(l?.surveyNo)}</td><td>${cell(l?.landType)}</td><td>${cell(l?.totalExtent)}</td><td>${cell(l?.mortgagedExtent)}</td><td class="r">${cell(money(l?.guidelineValue))}</td><td class="r">${cell(money(l?.marketValue))}</td><td>${cell(l?.remarks)}</td></tr>`
    )
    .join("")

  return `<!doctype html>
<html lang="ta"><head><meta charset="utf-8">
<title>LT Loan Application ${esc(d.applicationNo ?? "")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=block" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 14mm 14mm 12mm; }
  @page land { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    font-family: "Noto Sans Tamil", "Latha", "Nirmala UI", "Vijaya", Arial, sans-serif;
    font-size: 10.5pt; line-height: 1.45; color: #000;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .landscape { page: land; }

  .val { font-weight: 600; }
  .blank { display: inline-block; border-bottom: 1px solid #000; height: 1em; vertical-align: baseline; }
  .chk { display: inline-block; width: 3.4mm; height: 3.4mm; border: 1px solid #000; margin-right: 2mm;
         text-align: center; line-height: 3.2mm; font-size: 9pt; vertical-align: -0.3mm; }
  .circle { border: 1px solid #000; border-radius: 50%; padding: 0 2mm; }

  .head-box { border: 2px solid #000; outline: 1px solid #000; outline-offset: 2px; text-align: center;
              font-weight: 700; font-size: 13pt; padding: 3mm 4mm; margin: 2mm 4mm 5mm; line-height: 1.5; }
  .title { text-align: center; font-weight: 700; text-decoration: underline; margin: 0 0 4mm; }
  .meta { display: flex; justify-content: space-between; margin: 1.5mm 0; }
  .para { text-align: justify; text-indent: 12mm; line-height: 2.3; margin: 2mm 0 4mm; }

  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 1.4mm 2mm; vertical-align: top; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  thead { display: table-header-group; }

  .main td.no { width: 8mm; }
  .main td.lbl { width: 66mm; }
  .main td.colon { width: 5mm; text-align: center; padding: 1.4mm 0; }
  .main td.b { font-weight: 700; }
  .main tr.tall td { height: 16mm; }
  .photo { width: 38mm; text-align: center; vertical-align: middle !important; font-weight: 600; }
  .opt { margin: 0.6mm 0; }

  .inner th, .inner td { text-align: center; vertical-align: middle; }
  .inner td { height: 9mm; text-align: left; }
  .c { text-align: center !important; }
  .r { text-align: right !important; }

  .landscape h2 { font-size: 12pt; font-weight: 600; margin: 0 0 3mm 8mm; }
  .wide th { font-weight: 600; font-size: 9.5pt; vertical-align: top; text-align: center; }
  .wide tr.land td { height: 13mm; }
  .wide .colno td { text-align: center; padding: 0.5mm; height: auto; }

  .genealogy { border: 1px solid #000; padding: 3mm 4mm; height: 178mm; display: flex; flex-direction: column; }
  .genealogy h2 { text-align: center; margin: 0; }
  .genealogy .space { flex: 1; }
  .sigrow { display: flex; justify-content: space-between; align-items: flex-end; }
  .sigrow > div { text-align: center; }

  .assure h3 { text-align: center; font-size: 11pt; margin: 6mm 0 4mm; line-height: 1.5; }
  .assure ol { margin: 0 0 0 4mm; padding-left: 6mm; text-align: justify; line-height: 1.8; }
  .assure li { margin-bottom: 1.5mm; }
  .sign { margin: 14mm 0 0 auto; width: 70mm; line-height: 2.2; }
  .vao-foot { display: flex; justify-content: space-between; margin-top: 18mm; line-height: 2.4; }
</style></head><body>

<!-- ═════════════ Pages 1–3 (portrait) ═════════════ -->
<section class="sheet">
  <div class="head-box">${inl(d.bankName, 45)} தொடக்க கூட்டுறவு வேளாண்மை மற்றும் ஊரக<br>வளர்ச்சி வங்கி லிட்.,</div>
  <div class="title">நீண்ட / மத்திய கால கடன் பெறுவதற்கான மனு</div>

  <div class="meta"><div>கடன் மனு எண்: ${inl(d.applicationNo, 40)}</div><div>நாள்: ${inl(d.applicationDate, 30)}</div></div>
  <div class="meta"><div>கடன் நோக்கம்: ${inl(d.loanPurpose, 60)}</div></div>

  <p style="margin:3mm 0 0">ஐயா,</p>
  <p class="para">
    நான் ${inl(d.residingVillage, 25)} கிராமத்தில் வசித்து வருகிறேன். எனக்கு சொந்தமாக
    ${inl(d.landVillage, 25)} கிராமத்தில் ${inl(d.landExtent, 30)} நிலம் உள்ளது. எனது நிலத்தை அடமானமாக
    பெற்றுக்கொண்டு ${inl(d.loanPurpose, 30)} நோக்கத்திற்கு ரூ.${inl(money(d.amount), 25)} (எழுத்தால்)
    ரூபாய் ${inl(words, 80)} கடன் வழங்குமாறு கேட்டுக்கொள்கிறேன்.
  </p>

  <table class="main">
    <tr><td colspan="5">விண்ணப்பதாரர் விவரம்</td></tr>
    <tr><td class="no">1</td><td class="lbl">உறுப்பினர் எண்</td><td class="colon">:</td><td class="v">${cell(d.membershipNo)}</td>
        <td class="photo" rowspan="5">மனுதாரர்<br>புகைப்படம்</td></tr>
    <tr><td class="no">2</td><td class="lbl">பெயர்</td><td class="colon">:</td><td class="v">${cell(d.name)}</td></tr>
    <tr><td class="no">3</td><td class="lbl">தகப்பனார் / கணவர் பெயர்</td><td class="colon">:</td><td class="v">${cell(d.fatherOrHusbandName)}</td></tr>
    <tr><td class="no">4</td><td class="lbl">பிறந்த தேதி / வயது</td><td class="colon">:</td><td class="v">${cell(dobAge)}</td></tr>
    <tr><td class="no">5</td><td class="lbl">மதம்</td><td class="colon">:</td><td class="v">${cell(d.religion)}</td></tr>
    <tr><td class="no">6</td><td class="lbl">இனம்</td><td class="colon">:</td><td colspan="2">${communityHtml}</td></tr>
  </table>
  <table class="main" style="border-top:0">
    ${row("7", "முகவரி விவரம்", "", { bold: true })}
    ${row("", "தற்போதைய முகவரி", cell(d.presentAddress), { tall: true })}
    ${row("", "நிரந்தர முகவரி", cell(d.permanentAddress), { tall: true })}
    ${row("8", "தொலைபேசி எண்", cell(d.phone))}
    ${row("9", "அலைபேசி எண்", cell(d.mobile))}
    ${row("10", "மின்னஞ்சல் முகவரி", cell(d.email))}
    ${row("11", "ஆதார் அட்டை எண்", cell(d.aadhaar))}
    ${row("12", "வருமான வரி அட்டை<br>(PAN Card)", cell(d.pan))}
    ${row("13", "ஆதார் எண் வருமான வரி நிரந்தர அட்டை எண்ணுடன் இணைக்கப்பட்டுள்ளதா?", `<div class="c">${yesNo(d.aadhaarPanLinked)}</div>`)}
    ${row("14", "குடும்ப அட்டை எண்<br>(Smart Card)", cell(d.rationCard))}
    ${row("15", "வாக்காளர் அட்டை எண்", cell(d.voterId))}
    ${row("16", "தொழில் விவரம்", "", { bold: true, noColon: true })}
    ${row("", "விவசாயம்/சுயதொழில்/மாத ஊதியம்/ஓய்வூதியம்", cell(d.occupation))}
    ${row("17", "நிதி விவரம்", "", { bold: true, noColon: true })}
    ${row("", "மாத வருமானம்", cell(money(d.monthlyIncome)))}
    ${row("", "மொத்த மாத செலவுகள்", cell(money(d.monthlyExpenses)))}
    ${row("", "நிகர மாத வருமானம்", cell(money(d.netMonthlyIncome)))}
    ${row("18", "வங்கி கணக்கு விவரம்", "", { bold: true, noColon: true })}
    ${row("", "வங்கியின் பெயர்", cell(bank.bankName))}
    ${row("", "கிளை", cell(bank.branch))}
    ${row("", "கணக்கு வகை <small>(SB/Current A/c)</small>", cell(bank.accountType))}
    ${row("", "கணக்கு எண்", cell(bank.accountNo))}
    ${row("", "IFSC Code", cell(bank.ifsc))}
    ${row("19", "கடன் கோரும் நோக்கம்", "", { bold: true, noColon: true })}
    ${row("", "கடன் காரியம்", cell(d.loanItem))}
    ${row("", "கடன் கோரும் தொகை", cell(money(d.requestedAmount ?? d.amount)))}
    ${row("20", "ஈடு காட்டும் அசையா<br>சொத்து அமைந்துள்ள", "", { bold: true, noColon: true })}
    ${row("", "&emsp;&emsp;(1) கிராமம்", cell(d.securityVillage))}
    ${row("", "&emsp;&emsp;(2) புல எண்", cell(d.securitySurveyNo))}
    ${row("", "&emsp;&emsp;(3) உட் பிரிவு எண்", cell(d.securitySubDivisionNo))}
    ${row("21", "ஈடு காட்டும் சொத்தின் பரப்பளவு", cell(d.securityExtent))}
    ${row(
      "22<br>(a)",
      `<div>அடமானம் வைக்கப்பட விருக்கும் சொத்தின் மீது, நீதிமன்றத்தின் தாவா நடவடிக்கைகள் இருந்ததா? அல்லது நடவடிக்கையில் உள்ளதா? ஆம் எனில் தாவா அல்லது நடவடிக்கையின் விவரம் அளிப்பதோடு, சம்பந்தப்பட்ட நபர்கள் இவ்வகையிலான நடவடிக்கைகளின் முடிவு குறித்த விவரங்கள் குறிப்பிடப்பட வேண்டும்.</div>`,
      cell(d.litigationDetails)
    )}
    <tr><td class="no">(b)</td>
      <td class="lbl">அடமானம் வைக்கப்பட இருக்கும் சொத்து வில்லங்கத்தில் இல்லாத நிலையில் வேறு கடன் உள்ளதா?<br>ஆம் எனில்,<br>
        (அ) கடன் பெற்ற நிறுவனம்<br>(ஆ) கடன் காரியம்<br>(இ) கடன் பெற்ற தொகை<br>(ஈ) நாளது தேதியில் கடன் நிலுவை</td>
      <td class="colon"><br><br>:<br>:<br>:<br>:<br>:</td>
      <td class="v">${yesNo(ol.exists)}<br><br><br>${cell(ol.institution)}<br>${cell(ol.purpose)}<br>${cell(money(ol.amount))}<br>${cell(money(ol.outstanding))}</td></tr>
    <tr><td class="no">23</td><td colspan="3">மனுதாரரின் குடும்ப விவரங்கள்:
      <table class="inner" style="margin:2mm 0 1mm">
        <thead><tr><th style="width:11mm">வ.எண்</th><th>குடும்ப உறுப்பினர் பெயர்</th><th>மனுதாரரின் உறவு முறை</th><th style="width:14mm">வயது</th><th>தொலைபேசி எண்</th><th>ஆதார் எண்</th></tr></thead>
        <tbody>${familyRows}</tbody>
      </table></td></tr>
  </table>
</section>

<!-- ═════════════ Page 4 (landscape) — 24 வம்சாவழிப் பட்டியல் ═════════════ -->
<section class="sheet landscape">
  <div class="genealogy">
    <h2>24. வம்சாவழிப் பட்டியல்</h2>
    <div class="space"></div>
    <p style="text-indent:12mm;text-align:justify;margin:0 0 10mm">மேற்கூறிய வம்சாவழி பட்டியலில் தெரிவித்துள்ள விவரங்கள் அனைத்தும் என்னால் தெரிவிக்கப்பட்டது என்றும் மேற்கூறிய விவரங்கள் அனைத்து உண்மை என நான் உறுதி கூறுகிறேன்.</p>
    <div style="text-align:right;margin:0 60mm 6mm 0">மனுதாரர்</div>
    <div class="sigrow" style="margin-bottom:12mm"><div style="margin-left:25mm">வம்சாவழி பட்டியல் எங்களால் சரிபார்க்கப்பட்டது.</div><div style="margin-right:30mm">மேலொப்பம் செய்யப்படுகிறது</div></div>
    <div class="sigrow">
      <div>மேற்பார்வையாளர்</div>
      <div>செயலாளர்</div>
      <div>செயலாட்சியர்/<br>மேலாண்மை இயக்குநர்</div>
      <div>மண்டல மேலாளர்,<br>தமிழ்நாடு கூட்டுறவு மாநில வேளாண்மை<br>மற்றும் ஊரக வளர்ச்சி வங்கி,<br>${inl(d.regionName, 25)} மண்டல அலுவலகம்.</div>
    </div>
  </div>
</section>

<!-- ═════════════ Page 5 (landscape) — 25 ═════════════ -->
<section class="sheet landscape">
  <h2>25. மனுதாரர் சாகுபடி செய்துவரும் நிலங்களின் விவரங்கள்</h2>
  <table class="wide">
    <thead><tr>
      <th style="width:12%">கிராமத்தின் பெயர்</th><th style="width:8%">நில அளவை எண்</th><th style="width:9%">நன்செய் அல்லது புன்செய்</th>
      <th style="width:12%">மனுதாரருக்கு பாத்தியப்பட்ட மொத்த பரப்பளவு</th><th style="width:9%">சாகுபடி செய்து வரும் விவரம் (Crop)</th>
      <th style="width:10%">நிலத்தீர்வை</th><th style="width:16%">உத்தேசமாக கிடைக்கக் கூடிய வருமானம் (Anticipated Income)</th>
      <th>கிணறு/மின்விசை நீரேற்று இயந்திரம் இவைகள் இருந்தால், இவைகளில் மனுதாரருக்குள்ள பாத்தியம்</th>
    </tr></thead>
    <tbody>${cultivatedRows}</tbody>
  </table>
</section>

<!-- ═════════════ Page 6 (landscape) — 26 ═════════════ -->
<section class="sheet landscape">
  <h2>26. கடனுக்கு ஈடாக காட்டப்படும் சொத்துக்களின் விவரங்கள்:</h2>
  <table class="wide">
    <thead>
      <tr>
        <th rowspan="2" style="width:11%">கிராமத்தின் பெயர்</th><th rowspan="2" style="width:10%">நில அளவை எண்</th>
        <th rowspan="2" style="width:9%">நன்செய் அல்லது புன்செய்</th><th rowspan="2" style="width:13%">மொத்த பரப்பளவு</th>
        <th rowspan="2" style="width:16%">அடமானம் காட்டப்படும் நிலத்தின் பரப்பளவு</th>
        <th colspan="2">அடமானம் காட்டப்படும் நிலத்தின் மதிப்பு</th><th rowspan="2">குறிப்பு</th>
      </tr>
      <tr><th style="width:13%">அரசு வழிகாட்டி மதிப்பு</th><th style="width:10%">சந்தை மதிப்பு</th></tr>
      <tr class="colno"><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td></tr>
    </thead>
    <tbody>${securityRows}</tbody>
  </table>
</section>

<!-- ═════════════ Page 7 (portrait) — Statement & VAO certificate ═════════════ -->
<section class="sheet assure">
  <h3>வாக்குமூலங்களும் ஈட்டுறுதிகளும்<br>(Statement and Assurance)</h3>
  <ol>
    <li>ஈடுகாட்டப்படும் சொத்துக்களின் பேரில் எந்தவிதமான வில்லங்கங்கள் அல்லது சிவில் / ரெவின்யூ, மற்றும் வேறு எந்தவிதமான வழக்குகள் சம்மந்தப்பட்ட ஜப்திகள் இல்லை என்றும், வழங்க இருக்கும் கடன் தீரும் வரை இவைகளுக்கு உட்படுத்த மாட்டேன் என்றும்.</li>
    <li>அடமானம் வைக்கப்படும் சொத்துக்களை கிரயம், தானம், செட்டில்மெண்டு பரிவர்த்தனை அல்லது வேறு எந்தவிதமான வில்லங்கங்களும் உட்படுத்தவில்லை என்றும் இக்கடன் தீரும் வரை இவை களுக்கு உட்படுத்த மாட்டேன் என்றும்,</li>
    <li>என்னுடைய கிராம எல்லைக்குட்பட்ட வங்கியில் கடன் மனுவில் கோரிய கடன் காரியம் வேறு எங்கும் பெறவில்லை என்றும் உறுதிமொழி அளிக்கிறேன்.</li>
  </ol>
  <div class="sign">மனுதாரரின் கையொப்பம்<br>தேதி:</div>

  <h3 style="margin-top:10mm">அடமானம் வைக்கப்படும் நிலங்கள் சம்மந்தமாக கொடுக்கப்பட<br>கிராம நிர்வாக அதிகாரி சான்றிதழ்</h3>
  <ol>
    <li>மனுதாரர் சாகுபடி செய்து வரும் மற்றும் வங்கிக்கு அடமானமாக கொடுக்கப்படும் சொத்துக்கள் மனுதாரருடைய சொந்த சுவாதீனத்திலும் அனுபவத்திலும் இருக்கின்றனவென்றும்,</li>
    <li>கடன் மனுவில் காண்பிக்கப்பட்டிருக்கும் சொத்துக்களில் அரசுக்கடன்கள் இல்லையென்றும்,</li>
    <li>அடமானம் வைக்கப்படும் சொத்துக்கள் சிவில், ரெவின்யூ, மற்ற எந்தவிதமான ஜப்தி நடவடிக்கைகளுக்கும் உட்படுத்தப்பட இல்லையென்றும் இதன் மூலம் சான்றளிக்கிறேன்.</li>
  </ol>
  <div class="vao-foot"><div>கிராமம்:<br>தேதி:</div><div>கிராம நிர்வாக அதிகாரி</div></div>
</section>

</body></html>`
}
