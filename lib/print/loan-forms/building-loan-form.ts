/**
 * கட்டிட / சொத்து அடமானக் கடன் — Building (Property) Mortgage Loan (security type 2).
 * Land (type 1) uses the separate LT/MT form (lt-loan-application-form.ts), not this one.
 */
import { formatDate } from "@/lib/date-format"
import { buildLoanApplicationDocument, codeLabel, fieldsTable, isBlank, money, requestParagraph, yesNo, type FormContext } from "./base"

const date = (v: unknown) => (isBlank(v) ? "" : formatDate(String(v)))
const join = (...p: unknown[]) => p.map((x) => String(x ?? "").trim()).filter(Boolean).join(", ")

export function buildBuildingLoanApplicationHtml(ctx: FormContext, detail: Record<string, any> | null): string {
  const d = detail ?? {}
  const property = fieldsTable([
    ["சொத்து வகை<br><small>Property Type</small>", codeLabel(d.property_type)],
    ["உரிமை வகை<br><small>Ownership</small>", codeLabel(d.ownership_type)],
    ["உரிமையாளர் பெயர்<br><small>Owner Name</small>", d.owner_name],
    ["புல எண் / உட்பிரிவு<br><small>Survey No / Sub-division</small>", [d.survey_no, d.sub_division_no].filter((x) => !isBlank(x)).join(" / ")],
  ])
  const address = fieldsTable([
    ["சொத்தின் முகவரி<br><small>Property Address</small>", join(d.door_no, d.address_line1, d.address_line2, d.city, d.district, d.state, d.pincode)],
  ], 1)
  const extent = fieldsTable([
    ["மனை பரப்பளவு<br><small>Land Area (sq.ft)</small>", d.land_area_sqft],
    ["கட்டிட பரப்பளவு<br><small>Built-up Area (sq.ft)</small>", d.built_up_area_sqft],
    ["பரப்பளவு (ஏக்கர்)<br><small>Land Area (Acres)</small>", d.land_area_acres],
    ["ஆவண வகை<br><small>Document Type</small>", codeLabel(d.document_type)],
    ["பதிவு எண்<br><small>Registration No</small>", d.registration_no],
    ["பதிவு நாள்<br><small>Registration Date</small>", date(d.registration_date)],
    ["அரசு வழிகாட்டி மதிப்பு<br><small>Guideline Value (₹)</small>", money(d.guideline_value)],
    ["சந்தை மதிப்பு<br><small>Market Value (₹)</small>", money(d.market_value)],
  ])
  const legal = fieldsTable([
    ["வில்லங்கச் சான்று நாள்<br><small>Encumbrance Certificate Date</small>", date(d.encumbrance_cert_date)],
    ["உரிமை தெளிவு<br><small>Title Clear</small>", yesNo(d.title_clear)],
    ["சட்ட ஆலோசனை வழங்கியவர்<br><small>Legal Opinion By</small>", d.legal_opinion_by],
    ["சட்ட ஆலோசனை நாள்<br><small>Legal Opinion Date</small>", date(d.legal_opinion_date)],
  ])

  return buildLoanApplicationDocument({
    docTitle: `Building Mortgage Loan Application ${ctx.loan.applicationNo ?? ""}`,
    titleTa: "கட்டிட / சொத்து அடமானக் கடன் பெறுவதற்கான மனு",
    titleEn: "BUILDING / PROPERTY MORTGAGE LOAN — APPLICATION FORM",
    bankName: ctx.bankName,
    loan: ctx.loan,
    applicant: ctx.applicant,
    requestHtml: requestParagraph(ctx, "எனக்குச் சொந்தமான கீழ்க்கண்ட கட்டிடம் / சொத்தை அடமானமாகப் பெற்றுக்கொண்டு"),
    sections: [
      { titleTa: "அடமானம் வைக்கப்படும் சொத்தின் விவரம்", titleEn: "Details of the Property Mortgaged", html: property + address + extent },
      { titleTa: "சட்ட மற்றும் வில்லங்க விவரம்", titleEn: "Legal and Encumbrance Details", html: legal },
    ],
    declarations: [
      "ஈடுகாட்டப்படும் சொத்தின் பேரில் எந்தவிதமான வில்லங்கங்கள், வழக்குகள் அல்லது ஜப்திகள் இல்லை என்றும், கடன் தீரும் வரை அவைகளுக்கு உட்படுத்த மாட்டேன் என்றும் உறுதி கூறுகிறேன். (The property is free from encumbrance, litigation or attachment and will remain so until the loan is repaid.)",
      "கடன் தீரும் வரை சொத்தை விற்கவோ, தானம் செய்யவோ, வேறு அடமானம் செய்யவோ மாட்டேன். (I will not sell, gift or further mortgage the property until the loan is repaid.)",
      "சொத்தின் உரிமை ஆவணங்களை வங்கியிடம் ஒப்படைக்கவும், கட்டிடத்திற்கு காப்பீடு செய்து வைத்திருக்கவும் சம்மதிக்கிறேன். (I agree to deposit the title deeds with the bank and keep the building insured.)",
      "இம்மனுவில் தெரிவிக்கப்பட்ட விவரங்கள் அனைத்தும் உண்மை என உறுதி கூறுகிறேன். (All particulars furnished in this application are true.)",
    ],
  })
}
