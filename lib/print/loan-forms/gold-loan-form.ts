/** நகைக் கடன் விண்ணப்பம் — Gold Loan Application Form (security type 6). */
import { formatDate } from "@/lib/date-format"
import {
  buildLoanApplicationDocument, cell, codeLabel, fieldsTable, grams, inl, isBlank, money, requestParagraph,
  signatureBlock, type FormContext,
} from "./base"

export type GoldItemRow = {
  item_seq?: number
  ornament_name?: string
  gold_form?: string
  purity_karat?: number | string
  number_of_pieces?: number | string
  gross_weight_grams?: number | string
  stone_weight_grams?: number | string
  net_weight_grams?: number | string
}

const sum = (rows: GoldItemRow[], k: keyof GoldItemRow) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
const date = (v: unknown) => (isBlank(v) ? "" : formatDate(String(v)))

export function buildGoldLoanApplicationHtml(
  ctx: FormContext,
  detail: Record<string, any> | null,
  items: GoldItemRow[]
): string {
  const d = detail ?? {}
  // Blank rows for hand-filling when no items were recorded
  const rows: (GoldItemRow | undefined)[] = items.length > 0 ? items : Array.from({ length: 6 }, () => undefined)
  const itemRows = rows
    .map(
      (r, i) => `<tr>
        <td class="c">${i + 1}</td><td>${cell(r?.ornament_name)}</td><td class="c">${cell(codeLabel(r?.gold_form))}</td>
        <td class="c">${cell(isBlank(r?.purity_karat) ? "" : `${r!.purity_karat}K`)}</td><td class="c">${cell(r?.number_of_pieces)}</td>
        <td class="r">${cell(grams(r?.gross_weight_grams))}</td><td class="r">${cell(grams(r?.stone_weight_grams))}</td>
        <td class="r">${cell(grams(r?.net_weight_grams))}</td></tr>`
    )
    .join("")
  const totals =
    items.length > 0
      ? `<tr class="total"><td colspan="4" class="r">மொத்தம் / Total</td><td class="c">${sum(items, "number_of_pieces")}</td>
         <td class="r">${grams(sum(items, "gross_weight_grams"))}</td><td class="r">${grams(sum(items, "stone_weight_grams"))}</td>
         <td class="r">${grams(sum(items, "net_weight_grams"))}</td></tr>`
      : `<tr class="total"><td colspan="4" class="r">மொத்தம் / Total</td><td></td><td></td><td></td><td></td></tr>`

  const ornaments = `<table class="items">
    <thead><tr>
      <th style="width:9mm">வ.எண்<br><small>S.No</small></th><th>நகையின் விவரம்<br><small>Ornament</small></th>
      <th style="width:20mm">வகை<br><small>Form</small></th><th style="width:15mm">தரம்<br><small>Purity</small></th>
      <th style="width:16mm">எண்ணிக்கை<br><small>Pieces</small></th><th style="width:22mm">மொத்த எடை<br><small>Gross Wt</small></th>
      <th style="width:22mm">கழிவு எடை<br><small>Stone / Disallowed</small></th><th style="width:22mm">நிகர எடை<br><small>Net Wt</small></th>
    </tr></thead>
    <tbody>${itemRows}${totals}</tbody>
  </table>`

  const valuation = fieldsTable([
    ["பொட்டல எண்<br><small>Packet No</small>", d.packet_no],
    ["முத்திரை எண்<br><small>Seal No</small>", d.seal_no],
    ["தங்க விலை / கிராம்<br><small>Gold Rate per Gram (₹)</small>", money(d.gold_rate_per_gram)],
    ["விலை நாள்<br><small>Rate Date</small>", date(d.gold_rate_date)],
    ["சந்தை மதிப்பு<br><small>Market Value (₹)</small>", money(d.market_value)],
    ["வழிகாட்டி மதிப்பு / கிராம்<br><small>Guidelines Value per Gram (₹)</small>", money(d.guideline_value_per_gram)],
    ["அதிகபட்ச கடன் தொகை<br><small>Maximum Sanction Amount (₹)</small>", money(d.max_sanction_amount)],
    ["பாதுகாப்பு இடம்<br><small>Storage Location</small>", d.storage_location],
  ])

  const appraiser = `
    <h2 style="margin-top:0;text-align:center">நகை மதிப்பீட்டாளர் சான்றிதழ் <small>(Gold Appraiser's Certificate)</small></h2>
    <p class="para">மனு எண் ${inl(ctx.loan.applicationNo, 20)} இல் குறிப்பிட்டுள்ள நகைகளை நான் நேரில் பரிசோதித்தேன். அவை மேற்கண்ட
      தரம் மற்றும் எடை உடையவை என்றும், அவற்றின் மதிப்பீடு உண்மையானது என்றும் சான்றளிக்கிறேன்.<br>
      <small>I have personally examined the ornaments listed in this application and certify that their purity, weight and valuation are as stated.</small></p>
    ${fieldsTable([
      ["மதிப்பீட்டாளர் பெயர்<br><small>Appraiser Name</small>", d.appraiser_name],
      ["உரிம எண்<br><small>Licence No</small>", d.appraiser_license_no],
      ["மதிப்பீட்டு நாள்<br><small>Appraisal Date</small>", date(d.appraisal_date)],
      ["நிகர எடை<br><small>Net Weight</small>", grams(d.net_weight_grams)],
    ])}
    ${signatureBlock(["நகை மதிப்பீட்டாளர் கையொப்பம்<br><small>Signature of the Appraiser</small>"])}

    <h2 style="margin-top:14mm;text-align:center">நகைகளைப் பெற்றதற்கான ஒப்புகை <small>(Acknowledgement of Pledged Ornaments)</small></h2>
    <p class="para">மேற்கண்ட நகைகள் பொட்டல எண் ${inl(d.packet_no, 25)} இல் முத்திரையிட்டு வங்கியின் பாதுகாப்பில் வைக்கப்பட்டுள்ளன.<br>
      <small>The above ornaments have been sealed and kept in the bank's safe custody.</small></p>
    <div class="office-sigs"><div>காசாளர்<br><small>Cashier</small></div><div>செயலாளர்<br><small>Secretary</small></div></div>`

  return buildLoanApplicationDocument({
    docTitle: `Gold Loan Application ${ctx.loan.applicationNo ?? ""}`,
    titleTa: "நகைக் கடன் பெறுவதற்கான மனு",
    titleEn: "GOLD LOAN APPLICATION FORM",
    bankName: ctx.bankName,
    loan: ctx.loan,
    applicant: ctx.applicant,
    requestHtml: requestParagraph(ctx, "எனக்குச் சொந்தமான கீழ்க்கண்ட தங்க நகைகளை அடமானமாகப் பெற்றுக்கொண்டு"),
    sections: [
      { titleTa: "அடமானம் வைக்கப்படும் நகைகளின் விவரம்", titleEn: "Details of Gold Ornaments Pledged", html: ornaments },
      { titleTa: "நகை மதிப்பீடு", titleEn: "Gold Valuation", html: valuation },
    ],
    declarations: [
      "மேற்கண்ட நகைகள் எனக்கு மட்டுமே சொந்தமானவை என்றும், அவை திருட்டு அல்லது வேறு எந்த வில்லங்கத்திற்கும் உட்பட்டவை அல்ல என்றும் உறுதி கூறுகிறேன். (The ornaments are my own absolute property and are free from theft, dispute or encumbrance.)",
      "கடன் தொகையையும் வட்டியையும் உரிய காலத்தில் திருப்பிச் செலுத்துவேன். தவறினால் வங்கி விதிகளின்படி நகைகளை ஏலம் விட்டு கடனை ஈடுசெய்ய வங்கிக்கு முழு உரிமை உண்டு என்பதை ஒப்புக்கொள்கிறேன். (I will repay the loan with interest on time; on default the bank may auction the ornaments as per its rules to recover the dues.)",
      "நகைகளின் எடை மற்றும் தரம் குறித்த மதிப்பீட்டாளரின் முடிவை ஏற்றுக்கொள்கிறேன். (I accept the appraiser's assessment of the weight and purity of the ornaments.)",
      "இம்மனுவில் தெரிவிக்கப்பட்ட விவரங்கள் அனைத்தும் உண்மை என உறுதி கூறுகிறேன். (All particulars furnished in this application are true.)",
    ],
    extraSheets: [appraiser],
  })
}
