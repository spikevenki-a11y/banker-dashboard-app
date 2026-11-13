"use client"

import { formatDate } from "@/lib/date-format"
import { buildLtLoanApplicationHtml, type LtLoanFormData } from "./lt-loan-application-form"
import { printHtml } from "./print-html"

type LoanLike = {
  reference_no?: string
  membership_no?: string
  application_date?: string
  applied_loan_amount?: number | string
  loan_purpose?: string
  member_name?: string
  mobile_no?: string
}

type LandDetailLike = {
  survey_no?: string
  revenue_village?: string | null
  city?: string
  land_area_acres?: string
  guideline_value?: string
  market_value?: string
} | null

export const joinAddr = (...parts: (string | null | undefined)[]) =>
  parts.map((p) => (p ?? "").trim()).filter(Boolean).join(", ")

export function ageFrom(dob?: string | null): number | undefined {
  if (!dob) return undefined
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return undefined
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--
  return age
}

/** Fetches the member's full profile (KYC, address, community) for the form. */
export async function fetchMember(membershipNo?: string) {
  if (!membershipNo) return null
  try {
    const res = await fetch("/api/memberships/view_member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membership_no: membershipNo }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const rows: any[] = data.memberData ?? []
    // view_member does a partial (ILIKE) match, so pick the exact member
    return rows.find((r) => String(r.membership_no) === String(membershipNo)) ?? rows[0] ?? null
  } catch {
    return null
  }
}

/**
 * Prints the LT/MT loan application form.
 * - Pass a loan (and optionally its land security) → pre-filled form.
 * - Pass nothing → blank form for hand-filling.
 */
export type LtLoanPrintOptions = {
  loan?: LoanLike | null
  land?: LandDetailLike
  branchName?: string
}

export async function printLtLoanApplication(opts: LtLoanPrintOptions = {}): Promise<void> {
  printHtml(await buildLtLoanApplicationDocument(opts))
}

/** The LT/MT form as a complete HTML document (used for printing and PDF download). */
export async function buildLtLoanApplicationDocument(opts: LtLoanPrintOptions = {}): Promise<string> {
  const { loan, land, branchName } = opts
  const m = loan ? await fetchMember(loan.membership_no) : null

  const presentAddress = m ? joinAddr(m.house_no, m.street, m.village, m.thaluk, m.district, m.pincode) : ""
  const permanentAddress = m
    ? joinAddr(m.permanent_house_no, m.permanent_street, m.permanent_village, m.permanent_thaluk, m.permanent_district, m.permanent_pincode)
    : ""
  const landVillage = land?.revenue_village || land?.city || ""
  const extent = land?.land_area_acres ? `${land.land_area_acres} ஏக்கர்` : ""
  const [surveyNo, subDivision] = String(land?.survey_no ?? "").split("/").map((s) => s.trim())

  const data: LtLoanFormData = {
    bankName: branchName,
    applicationNo: loan?.reference_no,
    applicationDate: loan?.application_date ? formatDate(loan.application_date) : undefined,
    loanPurpose: loan?.loan_purpose,
    amount: loan?.applied_loan_amount,
    residingVillage: m?.village,
    landVillage,
    landExtent: extent,

    membershipNo: loan?.membership_no,
    name: m?.full_name ?? loan?.member_name,
    fatherOrHusbandName: m?.father_name || m?.spouse_name,
    dateOfBirth: m?.date_of_birth ? formatDate(m.date_of_birth) : undefined,
    age: ageFrom(m?.date_of_birth),
    religion: m?.religion,
    community: m?.caste_category,
    presentAddress,
    permanentAddress,
    phone: m?.phone_no,
    mobile: m?.mobile_no ?? loan?.mobile_no,
    email: m?.email,
    aadhaar: m?.aadhaar_no?.trim(),
    pan: m?.pan_no?.trim(),
    rationCard: m?.ration_no,
    voterId: m?.voter_id,
    occupation: m?.occupation,
    monthlyIncome: m?.annual_income ? Math.round(Number(m.annual_income) / 12) : undefined,
    bankAccount: m?.dccb_account_number
      ? { bankName: "DCCB", branch: m?.dccb_branch, accountNo: m.dccb_account_number }
      : undefined,

    requestedAmount: loan?.applied_loan_amount,
    securityVillage: landVillage,
    securitySurveyNo: surveyNo,
    securitySubDivisionNo: subDivision,
    securityExtent: extent,
    securityLands: land
      ? [{
          village: landVillage,
          surveyNo: land.survey_no,
          totalExtent: extent,
          mortgagedExtent: extent,
          guidelineValue: land.guideline_value,
          marketValue: land.market_value,
        }]
      : undefined,
  }

  return buildLtLoanApplicationHtml(data)
}
