/** தனிநபர் ஜாமீன் கடன் விண்ணப்பம் — Personal Surety Loan Application Form (security type 13). */
import {
  buildLoanApplicationDocument, fieldsTable, inl, money, personTable, requestParagraph, signatureBlock,
  type FormContext, type PrintPerson,
} from "./base"

export type SuretyInfo = {
  person: PrintPerson
  annualIncome?: number | string
  eligibleSecurityAmount?: number | string
}

export function buildSuretyLoanApplicationHtml(ctx: FormContext, surety: SuretyInfo | null): string {
  const s: SuretyInfo = surety ?? { person: {} }
  const suretyHtml = `${personTable(s.person, "ஜாமீன்தாரர்<br>புகைப்படம்")}
    ${fieldsTable([
      ["ஆண்டு வருமானம்<br><small>Annual Income (₹)</small>", money(s.annualIncome)],
      ["ஜாமீன் தகுதித் தொகை<br><small>Eligible Security Amount (₹)</small>", money(s.eligibleSecurityAmount)],
    ])}`

  const consent = `
    <h2 style="margin-top:0;text-align:center">ஜாமீன்தாரர் ஒப்புதல் மற்றும் உறுதிமொழி <small>(Surety's Consent and Undertaking)</small></h2>
    <p class="para">
      ${inl(s.person.name, 40)} ஆகிய நான், உறுப்பினர் எண் ${inl(s.person.membershipNo, 20)}, திரு/திருமதி
      ${inl(ctx.applicant.name, 40)} (உறுப்பினர் எண் ${inl(ctx.applicant.membershipNo, 20)}) அவர்கள் மனு எண்
      ${inl(ctx.loan.applicationNo, 20)} மூலம் கோரியுள்ள ரூ.${inl(money(ctx.loan.amount), 25)} கடனுக்கு
      ஜாமீன்தாரராக இருக்க முழு மனதுடன் சம்மதிக்கிறேன்.
    </p>
    <div class="decl"><ol>
      <li>கடன்தாரர் கடன் தொகை, வட்டி மற்றும் இதர கட்டணங்களைச் செலுத்தத் தவறினால், அத்தொகை முழுவதையும் நானே செலுத்த பொறுப்பேற்கிறேன். (If the borrower defaults, I am jointly and severally liable to repay the loan, interest and charges.)</li>
      <li>கடன் முழுவதும் தீரும் வரை இந்த ஜாமீனை நான் திரும்பப் பெறமாட்டேன். (I will not withdraw this guarantee until the loan is fully repaid.)</li>
      <li>எனது சம்பளம் / வருமானம் / வைப்புகளிலிருந்து நிலுவைத் தொகையை வசூலிக்க வங்கிக்கு உரிமை உண்டு என ஒப்புக்கொள்கிறேன். (The bank may recover the dues from my salary, income or deposits.)</li>
      <li>மேலே தெரிவித்த எனது விவரங்கள் அனைத்தும் உண்மை. (The particulars given by me are true.)</li>
    </ol></div>
    ${signatureBlock(["ஜாமீன்தாரர் கையொப்பம்<br><small>Signature of the Surety</small>"])}
    <div class="sigs" style="margin-top:18mm">
      <div style="line-height:2.2">சாட்சிகள் / Witnesses:<br>1.<br>2.</div>
      <div class="sig-list"><div class="sig">மனுதாரர் கையொப்பம்<br><small>Signature of the Applicant</small></div></div>
    </div>`

  return buildLoanApplicationDocument({
    docTitle: `Personal Surety Loan Application ${ctx.loan.applicationNo ?? ""}`,
    titleTa: "தனிநபர் ஜாமீன் கடன் பெறுவதற்கான மனு",
    titleEn: "PERSONAL SURETY LOAN APPLICATION FORM",
    bankName: ctx.bankName,
    loan: ctx.loan,
    applicant: ctx.applicant,
    requestHtml: requestParagraph(ctx, "கீழ்க்கண்ட உறுப்பினரை ஜாமீன்தாரராகக் கொண்டு"),
    sections: [{ titleTa: "ஜாமீன்தாரர் விவரம்", titleEn: "Surety Details", html: suretyHtml }],
    declarations: [
      "கடன் தொகையையும் வட்டியையும் வங்கி நிர்ணயிக்கும் தவணைகளில் உரிய காலத்தில் திருப்பிச் செலுத்துவேன். (I will repay the loan and interest in the instalments fixed by the bank.)",
      "கடன் தொகையை மனுவில் குறிப்பிட்ட நோக்கத்திற்கு மட்டுமே பயன்படுத்துவேன். (I will use the loan only for the stated purpose.)",
      "தவணை தவறினால் எனது மற்றும் ஜாமீன்தாரரின் சொத்து, வருமானம், வைப்புகளிலிருந்து நிலுவையை வசூலிக்க வங்கிக்கு உரிமை உண்டு. (On default the bank may recover the dues from me and from the surety.)",
      "இம்மனுவில் தெரிவிக்கப்பட்ட விவரங்கள் அனைத்தும் உண்மை என உறுதி கூறுகிறேன். (All particulars furnished in this application are true.)",
    ],
    extraSheets: [consent],
  })
}
