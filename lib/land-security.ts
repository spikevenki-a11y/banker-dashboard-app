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

// No. of Years EC Obtained, worked out from the EC period.
// Counts the years the period covers, both dates inclusive, with a part year
// counted as a full year: 2010-01-01 → 2024-12-31 = 15, 2020-01-01 → 2020-06-30 = 1.
// Returns null when the dates are missing or not a valid range.
export function calculateEcYears(from?: string | null, to?: string | null): number | null {
  const f = (from || "").trim()
  const t = (to || "").trim()
  if (getEcDateError(f, t) || !f || !t) return null
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN
  }
  const start = parse(f)
  const endExclusive = parse(t) + 24 * 60 * 60 * 1000 // day after EC Date To
  if (isNaN(start) || isNaN(endExclusive)) return null

  const s = new Date(start)
  let years = 0
  // Whole years from the start that still fall inside the period
  while (Date.UTC(s.getUTCFullYear() + years + 1, s.getUTCMonth(), s.getUTCDate()) <= endExclusive) years++
  // Any remaining part year counts as a full year
  if (Date.UTC(s.getUTCFullYear() + years, s.getUTCMonth(), s.getUTCDate()) < endExclusive) years++
  return years
}

export function getEcYearsError(value?: string | number | null): string {
  if (value === null || value === undefined || String(value).trim() === "") return ""
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > EC_YEARS_MAX) {
    return `No. of Years EC Obtained must be a whole number between 1 and ${EC_YEARS_MAX}.`
  }
  return ""
}
