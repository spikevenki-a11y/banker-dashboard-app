/**
 * Loan application for security types without their own detail table
 * (Machinery, Inventory, Accounts Receivable, Shares / Stocks, Other …), and for
 * applications saved without any security. Prints the security's base record.
 */
import { formatDate } from "@/lib/date-format"
import { buildLoanApplicationDocument, esc, fieldsTable, isBlank, money, requestParagraph, type FormContext } from "./base"

const date = (v: unknown) => (isBlank(v) ? "" : formatDate(String(v)))

export function buildGeneralLoanApplicationHtml(ctx: FormContext, security: Record<string, any> | null): string {
  const s = security ?? {}
  const name = String(s.security_name ?? "").trim()
  const html = fieldsTable([
    ["ஈடு வகை<br><small>Security Type</small>", name],
    ["ஈடு குறிப்பு எண்<br><small>Security Ref No</small>", s.security_ref_no],
    ["மதிப்பீட்டுத் தொகை<br><small>Assessed Value (₹)</small>", money(s.assessed_value)],
    ["மதிப்பீட்டு நாள்<br><small>Valuation Date</small>", date(s.valuation_date)],
  ]) + fieldsTable([["ஈட்டின் விவரம்<br><small>Description of Security</small>", s.description]], 1)

  return buildLoanApplicationDocument({
    docTitle: `Loan Application ${ctx.loan.applicationNo ?? ""}`,
    titleTa: "கடன் பெறுவதற்கான மனு",
    titleEn: name ? `LOAN APPLICATION FORM — ${esc(name.toUpperCase())} SECURITY` : "LOAN APPLICATION FORM",
    bankName: ctx.bankName,
    loan: ctx.loan,
    applicant: ctx.applicant,
    requestHtml: requestParagraph(ctx, name ? `கீழ்க்கண்ட ${esc(name)} ஈட்டின் பேரில்` : "கீழ்க்கண்ட ஈட்டின் பேரில்"),
    sections: [{ titleTa: "ஈடு விவரம்", titleEn: "Details of the Security Offered", html }],
    declarations: [
      "மேற்கண்ட ஈடு எனக்குச் சொந்தமானது என்றும், அது எந்தவிதமான வில்லங்கத்திற்கும் உட்பட்டது அல்ல என்றும் உறுதி கூறுகிறேன். (The security offered is my own and is free from any encumbrance.)",
      "கடன் தீரும் வரை வங்கியின் அனுமதியின்றி ஈட்டை விற்கவோ மாற்றவோ மாட்டேன். (I will not sell or transfer the security without the bank's consent until the loan is repaid.)",
      "கடன் தொகையையும் வட்டியையும் உரிய காலத்தில் திருப்பிச் செலுத்துவேன்; தவறினால் ஈட்டின் மூலம் நிலுவையை வசூலிக்க வங்கிக்கு உரிமை உண்டு. (I will repay on time; on default the bank may recover the dues from the security.)",
      "இம்மனுவில் தெரிவிக்கப்பட்ட விவரங்கள் அனைத்தும் உண்மை என உறுதி கூறுகிறேன். (All particulars furnished in this application are true.)",
    ],
  })
}
