"use client"

/**
 * "Print Application Form" for any saved loan application: loads the application and
 * its security from the database and prints the form for that security type.
 *
 *   Land (1)             → existing LT/MT form (printLtLoanApplication, unchanged)
 *   Building (2)         → building-loan-form
 *   Gold (6)             → gold-loan-form
 *   Vehicle (7)          → vehicle-loan-form
 *   Deposit (8)          → deposit-loan-form
 *   Insurance (10)       → insurance-loan-form
 *   NSC / KVP (12)       → deposit-loan-form (NSC / KVP wording)
 *   Personal Surety (13) → surety-loan-form
 *   anything else / none → general-loan-form
 */
import { formatDate } from "@/lib/date-format"
import { printHtml } from "./print-html"
import { ageFrom, buildLtLoanApplicationDocument, fetchMember, joinAddr } from "./print-lt-loan-application"
import { codeLabel, type FormContext, type PrintPerson } from "./loan-forms/base"
import { buildBuildingLoanApplicationHtml } from "./loan-forms/building-loan-form"
import { buildDepositLoanApplicationHtml } from "./loan-forms/deposit-loan-form"
import { buildGeneralLoanApplicationHtml } from "./loan-forms/general-loan-form"
import { buildGoldLoanApplicationHtml } from "./loan-forms/gold-loan-form"
import { buildInsuranceLoanApplicationHtml } from "./loan-forms/insurance-loan-form"
import { buildSuretyLoanApplicationHtml } from "./loan-forms/surety-loan-form"
import { buildVehicleLoanApplicationHtml } from "./loan-forms/vehicle-loan-form"

export const LAND_SECURITY_TYPE_ID = 1

type PrintData = {
  application: Record<string, any>
  security: (Record<string, any> & { detail: Record<string, any> | null; gold_items: any[] }) | null
  surety: Record<string, any> | null
}

async function fetchPrintData(loanApplicationId: number | string): Promise<PrintData> {
  const res = await fetch(`/api/loans/applications/print?id=${encodeURIComponent(String(loanApplicationId))}`, {
    credentials: "include",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Failed to load the loan application for printing")
  return data as PrintData
}

/** Member profile (view_member row) → the person block printed on the forms. */
function personFromMember(m: any, fallback: { membershipNo?: string; name?: string; mobile?: string } = {}): PrintPerson {
  return {
    membershipNo: m?.membership_no != null ? String(m.membership_no) : fallback.membershipNo,
    name: m?.full_name ?? fallback.name,
    fatherOrHusbandName: m?.father_name || m?.spouse_name,
    dateOfBirth: m?.date_of_birth ? formatDate(m.date_of_birth) : undefined,
    age: ageFrom(m?.date_of_birth),
    gender: codeLabel(m?.gender),
    community: m?.caste_category,
    presentAddress: m ? joinAddr(m.house_no, m.street, m.village, m.thaluk, m.district, m.pincode) : "",
    permanentAddress: m
      ? joinAddr(m.permanent_house_no, m.permanent_street, m.permanent_village, m.permanent_thaluk, m.permanent_district, m.permanent_pincode)
      : "",
    mobile: m?.mobile_no ?? fallback.mobile,
    phone: m?.phone_no,
    email: m?.email || m?.address_email,
    aadhaar: m?.aadhaar_no?.trim(),
    pan: m?.pan_no?.trim(),
    rationCard: m?.ration_no,
    voterId: m?.voter_id,
    occupation: m?.occupation,
    monthlyIncome: m?.annual_income ? Math.round(Number(m.annual_income) / 12) : undefined,
    bankAccount: m?.dccb_account_number
      ? { bankName: "DCCB", branch: m?.dccb_branch, accountNo: m.dccb_account_number }
      : undefined,
  }
}

type LoanApplicationPrintOptions = {
  loanApplicationId: number | string
  branchName?: string
}

/**
 * Prints the application form matching the application's saved security type.
 * Throws when the application can't be loaded (the caller shows the error).
 */
export async function printLoanApplication(opts: LoanApplicationPrintOptions): Promise<void> {
  const { html } = await buildLoanApplicationDocument(opts)
  printHtml(html)
}

/**
 * Builds the application form (complete HTML document) for the saved security type.
 * Shared by print and PDF download, so both always produce the same form.
 */
export async function buildLoanApplicationDocument(
  opts: LoanApplicationPrintOptions
): Promise<{ html: string; fileName: string; securityName: string }> {
  const { application: a, security, surety } = await fetchPrintData(opts.loanApplicationId)
  const typeId = Number(security?.security_type_id) || 0
  const detail = security?.detail ?? null
  const appNo = String(a.reference_no ?? a.loan_application_id ?? opts.loanApplicationId)
  const securityName = String(security?.security_name ?? "").trim()
  const fileName = `Loan-Application-${appNo}${securityName ? `-${securityName.replace(/[^A-Za-z0-9]+/g, "-")}` : ""}.pdf`

  // Land keeps the existing LT/MT form, exactly as before
  if (typeId === LAND_SECURITY_TYPE_ID) {
    const html = await buildLtLoanApplicationDocument({
      loan: {
        reference_no: a.reference_no != null ? String(a.reference_no) : undefined,
        membership_no: a.membership_no != null ? String(a.membership_no) : undefined,
        application_date: a.application_date,
        applied_loan_amount: a.applied_loan_amount,
        loan_purpose: a.loan_purpose_name,
      },
      land: detail,
      branchName: opts.branchName,
    })
    return { html, fileName, securityName }
  }

  const [member, suretyMember] = await Promise.all([
    fetchMember(a.membership_no != null ? String(a.membership_no) : undefined),
    typeId === 13 && surety?.membership_no ? fetchMember(String(surety.membership_no)) : Promise.resolve(null),
  ])

  const ctx: FormContext = {
    bankName: opts.branchName,
    loan: {
      applicationNo: a.reference_no != null ? String(a.reference_no) : String(a.loan_application_id ?? ""),
      applicationDate: a.application_date ? formatDate(a.application_date) : undefined,
      schemeName: a.scheme_name,
      loanType: codeLabel(a.loan_type),
      purpose: a.loan_purpose_name,
      amount: a.applied_loan_amount,
      securityName: security?.security_name,
      securityRefNo: security?.security_ref_no,
    },
    applicant: personFromMember(member, { membershipNo: a.membership_no != null ? String(a.membership_no) : undefined }),
  }

  let html: string
  switch (typeId) {
    case 2:
      html = buildBuildingLoanApplicationHtml(ctx, detail)
      break
    case 6:
      html = buildGoldLoanApplicationHtml(ctx, detail, security?.gold_items ?? [])
      break
    case 7:
      html = buildVehicleLoanApplicationHtml(ctx, detail)
      break
    case 8:
      html = buildDepositLoanApplicationHtml(ctx, detail, "DEPOSIT")
      break
    case 12:
      html = buildDepositLoanApplicationHtml(ctx, detail, "NSC_KVP")
      break
    case 10:
      html = buildInsuranceLoanApplicationHtml(ctx, detail)
      break
    case 13:
      html = buildSuretyLoanApplicationHtml(
        ctx,
        surety
          ? {
              person: personFromMember(suretyMember, { membershipNo: String(surety.membership_no) }),
              annualIncome: surety.surety_annual_income,
              eligibleSecurityAmount: surety.surety_eligible_security_amount,
            }
          : null
      )
      break
    default:
      html = buildGeneralLoanApplicationHtml(ctx, security)
  }

  return { html, fileName, securityName }
}
