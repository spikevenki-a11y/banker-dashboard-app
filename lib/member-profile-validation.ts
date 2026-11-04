// Edit Member (Member Management → View Member) — the fields each tab saves and
// their validation. Shared by the page and PUT /api/members/profile so both
// sides apply the same rules.

export type MemberEditSection = "personal" | "address" | "kyc" | "membership"

export const MEMBER_EDIT_SECTIONS: Record<MemberEditSection, { label: string; fields: readonly string[] }> = {
  personal: {
    label: "Personal Details",
    fields: [
      "full_name", "father_name", "spouse_name", "date_of_birth", "gender", "marital_status",
      "caste_category", "occupation", "qualification", "qualification_details",
      "dccb_account_number", "mobile_no", "alt_mobile_no", "email",
    ],
  },
  address: {
    label: "Address Details",
    fields: [
      "house_no", "street", "village", "thaluk", "district", "state", "pincode", "phone_no",
      "permanent_house_no", "permanent_street", "permanent_village", "permanent_thaluk",
      "permanent_district", "permanent_state", "permanent_pincode", "permanent_phone_no",
    ],
  },
  kyc: {
    label: "KYC Details",
    fields: [
      "pan_no", "ration_no", "ration_card_type", "driving_license_no",
      "passport_no", "eb_bill_no", "other_document_name", "other_document_no",
    ],
  },
  membership: {
    label: "Membership Details",
    fields: ["ledger_folio_number", "board_resolution_number", "board_resolution_date"],
  },
}

export function isMemberEditSection(x: unknown): x is MemberEditSection {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(MEMBER_EDIT_SECTIONS, x)
}

/** Picks only the given section's fields, trimmed; empty values become "". */
export function pickSectionFields(section: MemberEditSection, source: Record<string, unknown>) {
  const out: Record<string, string> = {}
  for (const f of MEMBER_EDIT_SECTIONS[section].fields) {
    const val = source?.[f]
    out[f] = val === undefined || val === null ? "" : String(val).trim()
  }
  return out
}

const DIGITS_10 = /^\d{10}$/
const DIGITS_6 = /^\d{6}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isFutureOrInvalidDate(value: string): "invalid" | "future" | null {
  if (!ISO_DATE.test(value) || isNaN(new Date(value).getTime())) return "invalid"
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  return value > todayIso ? "future" : null
}

const PASSPORT = /^[A-Z][0-9]{7}$/
const DOC_NO = /^[A-Za-z0-9\/\-]+$/

/**
 * Passport, EB Bill and Others KYC documents. Shared by Create Customer and
 * Edit Member so both apply the same rules. Values are expected trimmed.
 */
export function validateAdditionalKycDocs(d: {
  passport_no?: string
  eb_bill_no?: string
  other_document_name?: string
  other_document_no?: string
}): string | null {
  const passport = (d.passport_no || "").toUpperCase()
  const eb = d.eb_bill_no || ""
  const otherName = d.other_document_name || ""
  const otherNo = d.other_document_no || ""

  if (passport && !PASSPORT.test(passport)) return "Passport number must be 1 letter followed by 7 digits (e.g. A1234567)."
  if (eb && (eb.length > 30 || !DOC_NO.test(eb))) return "EB bill number must be up to 30 letters, digits, '/' or '-'."
  if (otherNo && !otherName) return "Enter the document name for the 'Others' KYC document."
  if (otherName && !otherNo) return "Enter the document number for the 'Others' KYC document."
  if (otherName.length > 100) return "Other document name must be 100 characters or fewer."
  if (otherNo && (otherNo.length > 50 || !DOC_NO.test(otherNo))) return "Other document number must be up to 50 letters, digits, '/' or '-'."
  return null
}

/** Returns the first validation error for the section, or null when valid. */
export function validateMemberSection(section: MemberEditSection, d: Record<string, string>): string | null {
  switch (section) {
    case "personal": {
      if (!d.full_name) return "Full name is required."
      if (d.full_name.length > 100) return "Full name must be 100 characters or fewer."
      if (d.date_of_birth) {
        const r = isFutureOrInvalidDate(d.date_of_birth)
        if (r === "invalid") return "Date of birth is not a valid date."
        if (r === "future") return "Date of birth cannot be in the future."
      }
      if (d.mobile_no && !DIGITS_10.test(d.mobile_no)) return "Mobile number must be 10 digits."
      if (d.alt_mobile_no && !DIGITS_10.test(d.alt_mobile_no)) return "Alternate mobile number must be 10 digits."
      if (d.alt_mobile_no && d.alt_mobile_no === d.mobile_no) return "Alternate mobile number must differ from the mobile number."
      if (d.email && !EMAIL.test(d.email)) return "Email address is not valid."
      return null
    }
    case "address": {
      if (d.pincode && !DIGITS_6.test(d.pincode)) return "Current address pincode must be 6 digits."
      if (d.phone_no && !DIGITS_10.test(d.phone_no)) return "Current address phone number must be 10 digits."
      if (d.permanent_pincode && !DIGITS_6.test(d.permanent_pincode)) return "Permanent address pincode must be 6 digits."
      if (d.permanent_phone_no && !DIGITS_10.test(d.permanent_phone_no)) return "Permanent address phone number must be 10 digits."
      return null
    }
    case "kyc": {
      if (d.pan_no && !PAN.test(d.pan_no.toUpperCase())) return "PAN number must be in the format ABCDE1234F."
      if (d.driving_license_no && d.driving_license_no.length > 20) return "Driving license number must be 20 characters or fewer."
      return validateAdditionalKycDocs(d)
    }
    case "membership": {
      if (d.board_resolution_date) {
        const r = isFutureOrInvalidDate(d.board_resolution_date)
        if (r === "invalid") return "Board resolution date is not a valid date."
        if (r === "future") return "Board resolution date cannot be in the future."
      }
      return null
    }
  }
}
