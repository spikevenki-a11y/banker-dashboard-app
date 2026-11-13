/**
 * வைப்புத்தொகை ஈட்டுக் கடன் விண்ணப்பம் — Loan against Deposit (type 8)
 * and Loan against NSC / KVP (type 12).
 */
import { formatDate } from "@/lib/date-format"
import { buildLoanApplicationDocument, codeLabel, fieldsTable, isBlank, money, requestParagraph, type FormContext } from "./base"

const date = (v: unknown) => (isBlank(v) ? "" : formatDate(String(v)))

export function buildDepositLoanApplicationHtml(
  ctx: FormContext,
  detail: Record<string, any> | null,
  kind: "DEPOSIT" | "NSC_KVP"
): string {
  const d = detail ?? {}
  const nsc = kind === "NSC_KVP"

  const html = fieldsTable([
    ["வைப்பு வகை<br><small>Deposit Type</small>", codeLabel(d.deposit_type)],
    ["வைப்புக் கணக்கு எண்<br><small>Deposit Account No</small>", d.deposit_account_no],
    ["சான்றிதழ் எண்<br><small>Certificate No</small>", d.certificate_no],
    ["நிறுவனம் / கிளை<br><small>Institution / Branch</small>", [d.institution_name, d.institution_branch].filter((x) => !isBlank(x)).join(" / ")],
    ["வைப்புத் தொகை<br><small>Deposit Amount (₹)</small>", money(d.deposit_amount)],
    ["வைப்பு நாள்<br><small>Deposit Date</small>", date(d.deposit_date)],
    ["முதிர்வு நாள்<br><small>Maturity Date</small>", date(d.maturity_date)],
    ["முதிர்வுத் தொகை<br><small>Maturity Amount (₹)</small>", money(d.maturity_amount)],
    ["வட்டி விகிதம்<br><small>Interest Rate (%)</small>", d.interest_rate],
    ["பிணை (லியன்) தொகை<br><small>Lien Amount (₹)</small>", money(d.lien_amount)],
  ])

  return buildLoanApplicationDocument({
    docTitle: `${nsc ? "NSC / KVP" : "Deposit"} Loan Application ${ctx.loan.applicationNo ?? ""}`,
    titleTa: nsc ? "தேசிய சேமிப்புப் பத்திரம் / கிசான் விகாஸ் பத்திரம் ஈட்டுக் கடன் மனு" : "வைப்புத்தொகை ஈட்டுக் கடன் பெறுவதற்கான மனு",
    titleEn: nsc ? "LOAN AGAINST NSC / KVP — APPLICATION FORM" : "LOAN AGAINST DEPOSIT — APPLICATION FORM",
    bankName: ctx.bankName,
    loan: ctx.loan,
    applicant: ctx.applicant,
    requestHtml: requestParagraph(
      ctx,
      nsc ? "எனது கீழ்க்கண்ட சேமிப்புப் பத்திரத்தை ஈடாகப் பெற்றுக்கொண்டு" : "எனது கீழ்க்கண்ட வைப்புத்தொகையை ஈடாகப் பெற்றுக்கொண்டு"
    ),
    sections: [
      {
        titleTa: nsc ? "ஈடாக வைக்கப்படும் பத்திர விவரம்" : "ஈடாக வைக்கப்படும் வைப்பு விவரம்",
        titleEn: nsc ? "Details of the Certificate Pledged" : "Details of the Deposit Pledged",
        html,
      },
    ],
    declarations: [
      nsc
        ? "மேற்கண்ட பத்திரம் எனக்குச் சொந்தமானது; அதனை வங்கியின் பெயருக்கு மாற்றம் / அடமானம் செய்ய சம்மதிக்கிறேன். (The certificate is my own and I agree to transfer / pledge it in favour of the bank.)"
        : "மேற்கண்ட வைப்புத்தொகை எனக்குச் சொந்தமானது; அதன் மீது வங்கி பிணை (லியன்) குறிக்க சம்மதிக்கிறேன். (The deposit is my own and I agree to the bank marking a lien on it.)",
      "கடன் முழுவதும் தீரும் வரை இந்த வைப்பை / பத்திரத்தை முன்கூட்டியே முடிக்கவோ திரும்பப் பெறவோ மாட்டேன். (I will not close or withdraw the deposit / certificate until the loan is repaid.)",
      "கடன் தவறினாலோ முதிர்வு அடைந்தாலோ வைப்புத் தொகையிலிருந்து நிலுவையை ஈடுசெய்ய வங்கிக்கு உரிமை உண்டு. (On default or maturity the bank may adjust the dues from the deposit proceeds.)",
      "இம்மனுவில் தெரிவிக்கப்பட்ட விவரங்கள் அனைத்தும் உண்மை என உறுதி கூறுகிறேன். (All particulars furnished in this application are true.)",
    ],
  })
}
