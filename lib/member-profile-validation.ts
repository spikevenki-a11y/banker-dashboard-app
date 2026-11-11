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

/** Display names for edit-history entries */
export const MEMBER_FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name", father_name: "Father Name", spouse_name: "Spouse Name",
  date_of_birth: "Date of Birth", gender: "Gender", marital_status: "Marital Status",
  caste_category: "Caste Category", occupation: "Occupation", qualification: "Qualification",
  qualification_details: "Qualification Details", dccb_account_number: "DCCB Account Number",
  mobile_no: "Mobile No", alt_mobile_no: "Alternate Mobile", email: "Email",
  house_no: "House No", street: "Street", village: "Village", thaluk: "Taluk",
  district: "District", state: "State", pincode: "Pincode", phone_no: "Phone No",
  permanent_house_no: "Permanent House No", permanent_street: "Permanent Street",
  permanent_village: "Permanent Village", permanent_thaluk: "Permanent Taluk",
  permanent_district: "Permanent District", permanent_state: "Permanent State",
  permanent_pincode: "Permanent Pincode", permanent_phone_no: "Permanent Phone No",
  pan_no: "PAN No", ration_no: "Ration Card No", ration_card_type: "Ration Card Type",
  driving_license_no: "Driving License No", passport_no: "Passport No", eb_bill_no: "EB Bill No",
  other_document_name: "Others — Document Name", other_document_no: "Others — Document No",
  ledger_folio_number: "Ledger Folio No", board_resolution_number: "Board Resolution No",
  board_resolution_date: "Board Resolution Date",
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

/** PAN as typed → uppercase, letters/digits only, at most 10 characters. */
export function normalizePan(value: unknown): string {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)
}

/** PAN 4th character — the holder type */
export const PAN_HOLDER_TYPES: Record<string, string> = {
  C: "Company",
  P: "Person",
  H: "Hindu Undivided Family (HUF)",
  F: "Firm",
  A: "Association of Persons (AOP)",
  T: "Trust",
  B: "Body of Individuals (BOI)",
  L: "Local Authority",
  J: "Artificial Juridical Person",
  G: "Government",
}

// Name split into words of letters only (dots, commas etc. separate words)
const nameWords = (name: string) =>
  name.toUpperCase().replace(/[^A-Z]+/g, " ").trim().split(" ").filter(Boolean)

/**
 * Letters the PAN's 5th character may be, given the holder's name.
 * - Person (P): first letter of the surname (last word of the name). Initials
 *   ("R. Kumar", "Kumar R") are also accepted, as an initial often stands for the
 *   surname / family name recorded on the PAN.
 * - Others: first letter of the entity / trust / organisation name, ignoring a
 *   leading "M/s" or "The".
 */
export function panFifthCharOptions(holderType: string, holderName: string): string[] {
  if (holderType === "P") {
    const words = nameWords(holderName)
    if (words.length === 0) return []
    const letters = new Set([words[words.length - 1][0]])
    for (const w of words) if (w.length === 1) letters.add(w)
    return [...letters]
  }
  const entity = holderName.trim().replace(/^(M\/S\.?|MESSRS\.?)\s*/i, "").replace(/^THE\s+/i, "")
  const words = nameWords(entity)
  return words.length ? [words[0][0]] : []
}

/**
 * Indian PAN format ABCDE1234F: 5 letters, 4 digits, 1 letter (10 characters).
 * 4th character: holder type (C, P, H, F, A, T, B, L, J, G).
 * 5th character: checked against holderName when it is given (see panFifthCharOptions).
 * Returns an error message, or null when valid or empty (PAN is optional).
 */
export function validatePan(value: unknown, holderName?: string | null): string | null {
  const pan = String(value ?? "").trim().toUpperCase()
  if (!pan) return null
  if (pan.length !== 10) return "PAN number must be exactly 10 characters (e.g. ABCDE1234F)."
  if (!/^[A-Z]{5}/.test(pan)) return "PAN number: the first 5 characters must be letters (A–Z)."
  if (!/^[A-Z]{5}[0-9]{4}/.test(pan)) return "PAN number: characters 6 to 9 must be digits (0–9)."
  if (!PAN.test(pan)) return "PAN number: the last character must be a letter (A–Z)."

  const holderType = pan[3]
  if (!PAN_HOLDER_TYPES[holderType]) {
    return `PAN number: the 4th character "${holderType}" is not a valid holder type. Use C (Company), P (Person), H (HUF), F (Firm), A (AOP), T (Trust), B (BOI), L (Local Authority), J (Artificial Juridical Person) or G (Government).`
  }

  const name = String(holderName ?? "").trim()
  if (name) {
    const allowed = panFifthCharOptions(holderType, name)
    if (allowed.length > 0 && !allowed.includes(pan[4])) {
      const expected = allowed.map((l) => `"${l}"`).join(" or ")
      return holderType === "P"
        ? `PAN number: the 5th character "${pan[4]}" must be the first letter of the holder's surname (${expected} for "${name}").`
        : `PAN number: the 5th character "${pan[4]}" must be the first letter of the ${PAN_HOLDER_TYPES[holderType]} name (${expected} for "${name}").`
    }
  }
  return null
}
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

/**
 * Returns the first validation error for the section, or null when valid.
 * holderName: the member's saved full name, used for the PAN 5th-character check (KYC tab).
 */
export function validateMemberSection(
  section: MemberEditSection,
  d: Record<string, string>,
  holderName?: string | null
): string | null {
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
      const panError = validatePan(d.pan_no, holderName)
      if (panError) return panError
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

// ── Aadhaar (UIDAI) ─────────────────────────────────────────────────────────
// 12 digits, first digit 2–9, last digit a Verhoeff check digit over the first 11.

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

/** True when the digit string (check digit last) passes the Verhoeff checksum. */
export function verhoeffValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false
  let c = 0
  const rev = digits.split("").reverse()
  for (let i = 0; i < rev.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(rev[i])]]
  }
  return c === 0
}

/** Strips spaces (and dashes) the user may type between the digit groups. */
export function normalizeAadhaar(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).replace(/[\s-]/g, "")
}

/**
 * Aadhaar check: exactly 12 digits, cannot start with 0 or 1, and must pass the
 * Verhoeff checksum. Returns an error message, or null when valid or empty.
 */
export function validateAadhaar(value: unknown): string | null {
  const a = normalizeAadhaar(value)
  if (!a) return null
  if (!/^\d+$/.test(a)) return "Aadhaar number must contain digits only"
  if (a.length !== 12) return "Aadhaar number must be exactly 12 digits"
  if (/^[01]/.test(a)) return "Aadhaar number cannot start with 0 or 1"
  if (!verhoeffValid(a)) return "Invalid Aadhaar number . Please check the number and re-enter."
  return null
}
