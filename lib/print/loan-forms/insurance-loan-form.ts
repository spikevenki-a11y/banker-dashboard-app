/** காப்பீட்டுப் பாலிசி ஈட்டுக் கடன் — Loan against Insurance Policy (security type 10). */
import { formatDate } from "@/lib/date-format"
import { buildLoanApplicationDocument, codeLabel, fieldsTable, isBlank, money, requestParagraph, yesNo, type FormContext } from "./base"

const date = (v: unknown) => (isBlank(v) ? "" : formatDate(String(v)))

export function buildInsuranceLoanApplicationHtml(ctx: FormContext, detail: Record<string, any> | null): string {
  const d = detail ?? {}
  const html = fieldsTable([
    ["பாலிசி எண்<br><small>Policy No</small>", d.policy_no],
    ["பாலிசி வகை<br><small>Policy Type</small>", codeLabel(d.policy_type)],
    ["காப்பீட்டு நிறுவனம்<br><small>Insurer</small>", d.insurer_name],
    ["காப்பீடு செய்யப்பட்டவர்<br><small>Life Assured / Insured</small>", d.insured_name],
    ["காப்பீட்டுத் தொகை<br><small>Sum Assured (₹)</small>", money(d.sum_assured)],
    ["சரண்டர் மதிப்பு<br><small>Surrender Value (₹)</small>", money(d.surrender_value)],
    ["சரண்டர் மதிப்பு நாள்<br><small>Surrender Value as on</small>", date(d.surrender_value_date)],
    ["பிரீமியம் தொகை / காலம்<br><small>Premium / Frequency</small>", [money(d.premium_amount), codeLabel(d.premium_frequency)].filter((x) => !isBlank(x)).join(" / ")],
    ["பாலிசி தொடக்க நாள்<br><small>Policy Start Date</small>", date(d.policy_start_date)],
    ["முதிர்வு நாள்<br><small>Maturity Date</small>", date(d.policy_maturity_date)],
    ["வங்கிக்கு ஒப்படைப்பு<br><small>Assigned to Bank</small>", yesNo(d.assignment_done)],
    ["ஒப்படைக்கப்பட்டவர்<br><small>Assignee</small>", d.assignee_name],
  ])

  return buildLoanApplicationDocument({
    docTitle: `Insurance Policy Loan Application ${ctx.loan.applicationNo ?? ""}`,
    titleTa: "காப்பீட்டுப் பாலிசி ஈட்டுக் கடன் பெறுவதற்கான மனு",
    titleEn: "LOAN AGAINST INSURANCE POLICY — APPLICATION FORM",
    bankName: ctx.bankName,
    loan: ctx.loan,
    applicant: ctx.applicant,
    requestHtml: requestParagraph(ctx, "எனது கீழ்க்கண்ட காப்பீட்டுப் பாலிசியை வங்கிக்கு ஒப்படைத்து (Assignment)"),
    sections: [{ titleTa: "ஈடாக வைக்கப்படும் பாலிசி விவரம்", titleEn: "Details of the Policy Assigned", html }],
    declarations: [
      "மேற்கண்ட பாலிசியை கடன் தீரும் வரை வங்கிக்கு முழுமையாக ஒப்படைக்க (Absolute Assignment) சம்மதிக்கிறேன். (I agree to assign the policy absolutely to the bank until the loan is repaid.)",
      "பாலிசி நடைமுறையில் இருக்கும்படி பிரீமியத்தை உரிய காலத்தில் செலுத்துவேன். (I will pay the premiums on time and keep the policy in force.)",
      "கடன் தவறினால் பாலிசியை சரண்டர் செய்தோ, முதிர்வு / உரிமைத் தொகையிலிருந்தோ நிலுவையை ஈடுசெய்ய வங்கிக்கு உரிமை உண்டு. (On default the bank may surrender the policy or adjust the dues from the maturity / claim proceeds.)",
      "இம்மனுவில் தெரிவிக்கப்பட்ட விவரங்கள் அனைத்தும் உண்மை என உறுதி கூறுகிறேன். (All particulars furnished in this application are true.)",
    ],
  })
}
