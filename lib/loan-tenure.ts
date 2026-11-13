// Loan tenure (months) is entered by the sanctioning officer at Loan Sanction and must
// fall within the loan scheme's limits (loan_schemes.minimum_period_months /
// maximum_period_months). Shared by the Loan Sanction screen and POST /api/loans/sanction.

// Used when a scheme has no limit configured (0 / null)
export const DEFAULT_MIN_TENURE_MONTHS = 1
export const DEFAULT_MAX_TENURE_MONTHS = 360

export type TenureLimits = { min: number; max: number }

export function getTenureLimits(minimumMonths: unknown, maximumMonths: unknown): TenureLimits {
  const min = Number(minimumMonths) > 0 ? Math.floor(Number(minimumMonths)) : DEFAULT_MIN_TENURE_MONTHS
  const max = Number(maximumMonths) > 0 ? Math.floor(Number(maximumMonths)) : DEFAULT_MAX_TENURE_MONTHS
  return { min, max: Math.max(min, max) }
}

// Error message for an invalid sanctioned tenure, otherwise "".
export function getTenureError(tenure: unknown, limits: TenureLimits): string {
  const raw = String(tenure ?? "").trim()
  if (raw === "") return "Please enter the loan tenure in months"
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return "Loan tenure must be a whole number of months greater than zero"
  if (n < limits.min) return `Loan tenure must be at least ${limits.min} months for this scheme`
  if (n > limits.max) return `Loan tenure cannot exceed ${limits.max} months for this scheme`
  return ""
}

// Error message for an invalid moratorium (gestation) period, otherwise "".
// Empty means 0. It must be a whole number of months and less than the loan tenure,
// otherwise no instalments would be left to repay the loan.
export function getMoratoriumError(moratorium: unknown, tenure: unknown): string {
  const raw = String(moratorium ?? "").trim()
  if (raw === "") return ""
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) return "Gestation period must be a whole number of months (0 or more)"
  const t = Number(String(tenure ?? "").trim())
  if (Number.isFinite(t) && t > 0 && n >= t) {
    return `Gestation period (${n} months) must be less than the loan tenure (${t} months)`
  }
  return ""
}
