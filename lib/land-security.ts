// Validation for Land security (security_type_id = 1) EC fields.
// Shared by the loan application form and the applications API.

export const EC_YEARS_MAX = 100

// Dates are "YYYY-MM-DD" strings, so string comparison matches date order.
export function getEcDateError(from?: string | null, to?: string | null): string {
  const f = (from || "").trim()
  const t = (to || "").trim()
  if (!f && !t) return ""
  if (!f || !t) return "Enter both EC Date From and EC Date To."
  if (t <= f) return "EC Date To must be later than EC Date From."
  return ""
}

export function getEcYearsError(value?: string | number | null): string {
  if (value === null || value === undefined || String(value).trim() === "") return ""
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > EC_YEARS_MAX) {
    return `No. of Years EC Obtained must be a whole number between 1 and ${EC_YEARS_MAX}.`
  }
  return ""
}
