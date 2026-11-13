/** வாகனக் கடன் விண்ணப்பம் — Vehicle Loan Application Form (security type 7). */
import { formatDate } from "@/lib/date-format"
import { buildLoanApplicationDocument, codeLabel, fieldsTable, isBlank, money, requestParagraph, yesNo, type FormContext } from "./base"

const date = (v: unknown) => (isBlank(v) ? "" : formatDate(String(v)))

export function buildVehicleLoanApplicationHtml(ctx: FormContext, detail: Record<string, any> | null): string {
  const d = detail ?? {}
  const html = fieldsTable([
    ["வாகன வகை<br><small>Vehicle Type</small>", codeLabel(d.vehicle_type)],
    ["பதிவு எண்<br><small>Registration No</small>", d.registration_no],
    ["தயாரிப்பாளர்<br><small>Manufacturer</small>", d.manufacturer],
    ["மாடல்<br><small>Model</small>", [d.model, d.variant].filter((x) => !isBlank(x)).join(" ")],
    ["தயாரிப்பு ஆண்டு<br><small>Year of Manufacture</small>", d.year_of_manufacture],
    ["பதிவு நாள்<br><small>Registration Date</small>", date(d.registration_date)],
    ["சேசிஸ் எண்<br><small>Chassis No</small>", d.chassis_no],
    ["இன்ஜின் எண்<br><small>Engine No</small>", d.engine_no],
    ["RC புத்தகம் ஒப்படைப்பு<br><small>RC Book Held by Bank</small>", yesNo(d.rc_book_held)],
    ["நிறம்<br><small>Colour</small>", d.color],
    ["காப்பீட்டு பாலிசி எண்<br><small>Insurance Policy No</small>", d.insurance_policy_no],
    ["காப்பீடு காலாவதி நாள்<br><small>Insurance Expiry</small>", date(d.insurance_expiry)],
    ["வாங்கிய விலை<br><small>Purchase Price (₹)</small>", money(d.purchase_price)],
    ["தற்போதைய சந்தை மதிப்பு<br><small>Current Market Value (₹)</small>", money(d.current_market_value)],
  ])

  return buildLoanApplicationDocument({
    docTitle: `Vehicle Loan Application ${ctx.loan.applicationNo ?? ""}`,
    titleTa: "வாகனக் கடன் பெறுவதற்கான மனு",
    titleEn: "VEHICLE LOAN APPLICATION FORM",
    bankName: ctx.bankName,
    loan: ctx.loan,
    applicant: ctx.applicant,
    requestHtml: requestParagraph(ctx, "கீழ்க்கண்ட வாகனத்தை வங்கிக்கு அடமானம் (Hypothecation) செய்து"),
    sections: [{ titleTa: "அடமானம் செய்யப்படும் வாகன விவரம்", titleEn: "Details of the Vehicle Hypothecated", html }],
    declarations: [
      "மேற்கண்ட வாகனம் எனக்குச் சொந்தமானது; அதனை வங்கிக்கு அடமானம் (Hypothecation) செய்யவும், பதிவுச் சான்றிதழில் (RC) வங்கியின் அடமானத்தைப் பதிவு செய்யவும் சம்மதிக்கிறேன். (The vehicle is my own; I agree to hypothecate it to the bank and to have the hypothecation endorsed in the RC.)",
      "கடன் தீரும் வரை வாகனத்திற்கு முழுமையான காப்பீடு செய்து வைத்திருப்பேன்; வங்கியின் அனுமதியின்றி வாகனத்தை விற்கவோ மாற்றவோ மாட்டேன். (I will keep the vehicle comprehensively insured and will not sell or transfer it without the bank's consent until the loan is repaid.)",
      "தவணை தவறினால் வாகனத்தைக் கைப்பற்றி விற்று நிலுவையை ஈடுசெய்ய வங்கிக்கு உரிமை உண்டு. (On default the bank may seize and sell the vehicle to recover the dues.)",
      "இம்மனுவில் தெரிவிக்கப்பட்ட விவரங்கள் அனைத்தும் உண்மை என உறுதி கூறுகிறேன். (All particulars furnished in this application are true.)",
    ],
  })
}
