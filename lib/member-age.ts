// Member age checks against a loan scheme's minimum_age / maximum_age.
// Shared by the loan application form and the applications API.

// Reads a date as a calendar date. Plain "YYYY-MM-DD" is used as is; a full
// timestamp (how pg DATE values arrive over JSON) is read in local time.
function toYmd(value: string | Date): [number, number, number] | null {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
  }
  const s = String(value).trim()
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (plain) return [Number(plain[1]), Number(plain[2]), Number(plain[3])]
  return s ? toYmd(new Date(s)) : null
}

// Completed years between dateOfBirth and asOf.
export function calculateAge(dateOfBirth: string | Date | null | undefined, asOf: string | Date): number | null {
  if (!dateOfBirth) return null
  const dob = toYmd(dateOfBirth)
  const ref = toYmd(asOf)
  if (!dob || !ref) return null
  let age = ref[0] - dob[0]
  if (ref[1] < dob[1] || (ref[1] === dob[1] && ref[2] < dob[2])) age--
  return age
}

const toLimit = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Returns "" when the member is eligible. A missing or zero maximum means no upper limit.
export function getSchemeAgeError(
  age: number | null,
  minimumAge: unknown,
  maximumAge: unknown,
  schemeName = "this scheme"
): string {
  const min = toLimit(minimumAge)
  let max = toLimit(maximumAge)
  if (max !== null && max <= 0) max = null
  if (min === null && max === null) return ""

  if (age === null) {
    return "Member's date of birth is not recorded. Update the member's record to check age eligibility."
  }
  if (age < 0) return "Member's date of birth is after the application date."
  if (min !== null && age < min) {
    return `Member is ${age} years old. ${schemeName} requires a minimum age of ${min} years.`
  }
  if (max !== null && age > max) {
    return `Member is ${age} years old. ${schemeName} allows a maximum age of ${max} years.`
  }
  return ""
}
