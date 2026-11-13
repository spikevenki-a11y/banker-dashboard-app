// Loan repayment schedule — shared by Loans → Loan Sanction (preview) and
// Loans → Disbursement (the schedule saved to loan_repayment_schedule_details),
// so both always produce the same instalments.
//
// Repayment Type (stored in loan_sanction_details.repayment_method):
//   ON_MATURITY     — one instalment at the end of the tenure: full principal plus
//                     simple interest for the whole tenure. Frequency is always Closing Time.
//   FIXED_PRINCIPAL — principal split equally across instalments; each instalment adds
//                     interest on the principal still outstanding for that period.
//
// Repayment Frequency (stored in loan_sanction_details.repayment_type, which already
// held the frequency before Repayment Type existed): MONTHLY, QUARTERLY, HALF_YEARLY,
// YEARLY or CLOSING_TIME (a single instalment at the end of the tenure).
//
// Moratorium (gestation) period: counted inside the sanctioned tenure. No principal is
// scheduled during it; Fixed Principal instalments start after it and the last one falls
// on the maturity date (start + tenure). Repayment Period = Tenure − Moratorium.
// Interest Payable During Moratorium (loan_sanction_details.moratorium_interest_payable,
// Fixed Principal only): Yes adds interest-only instalments at the Repayment Frequency
// during the moratorium (installment_type MORATORIUM_INTEREST); No adds none.

export type RepaymentMethod = "ON_MATURITY" | "FIXED_PRINCIPAL"
export type RepaymentFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CLOSING_TIME"

export const REPAYMENT_METHOD_OPTIONS: { value: RepaymentMethod; label: string }[] = [
  { value: "ON_MATURITY", label: "On Maturity" },
  { value: "FIXED_PRINCIPAL", label: "Fixed Principal" },
]

// months = length of one period; 0 means "the whole tenure" (Closing Time)
export const REPAYMENT_FREQUENCY_OPTIONS: { value: RepaymentFrequency; label: string; months: number }[] = [
  { value: "MONTHLY", label: "Monthly", months: 1 },
  { value: "QUARTERLY", label: "Quarterly", months: 3 },
  { value: "HALF_YEARLY", label: "Half Yearly", months: 6 },
  { value: "YEARLY", label: "Yearly", months: 12 },
  { value: "CLOSING_TIME", label: "Closing Time", months: 0 },
]

export const DEFAULT_REPAYMENT_METHOD: RepaymentMethod = "ON_MATURITY"
export const DEFAULT_FIXED_PRINCIPAL_FREQUENCY: RepaymentFrequency = "MONTHLY"

export const isRepaymentMethod = (v: unknown): v is RepaymentMethod =>
  REPAYMENT_METHOD_OPTIONS.some((o) => o.value === v)

export const isRepaymentFrequency = (v: unknown): v is RepaymentFrequency =>
  REPAYMENT_FREQUENCY_OPTIONS.some((o) => o.value === v)

// Fixed Principal is repaid in instalments, so Closing Time is not offered for it
export const FIXED_PRINCIPAL_FREQUENCY_OPTIONS = REPAYMENT_FREQUENCY_OPTIONS.filter((o) => o.value !== "CLOSING_TIME")

export const isFixedPrincipalFrequency = (v: unknown): v is RepaymentFrequency =>
  FIXED_PRINCIPAL_FREQUENCY_OPTIONS.some((o) => o.value === v)

/** Frequencies offered for a repayment type: On Maturity is Closing Time only. */
export const frequencyOptionsFor = (method: RepaymentMethod) =>
  method === "ON_MATURITY"
    ? REPAYMENT_FREQUENCY_OPTIONS.filter((o) => o.value === "CLOSING_TIME")
    : FIXED_PRINCIPAL_FREQUENCY_OPTIONS

export const repaymentMethodLabel = (v: string | null | undefined) =>
  REPAYMENT_METHOD_OPTIONS.find((o) => o.value === v)?.label || String(v || "").replace(/_/g, " ")

export const repaymentFrequencyLabel = (v: string | null | undefined) =>
  REPAYMENT_FREQUENCY_OPTIONS.find((o) => o.value === v)?.label || String(v || "").replace(/_/g, " ")

/** Frequency that applies to a repayment type: On Maturity is always Closing Time. */
export function effectiveFrequency(method: RepaymentMethod, frequency: string | null | undefined): RepaymentFrequency {
  if (method === "ON_MATURITY") return "CLOSING_TIME"
  return isRepaymentFrequency(frequency) ? frequency : DEFAULT_FIXED_PRINCIPAL_FREQUENCY
}

// REGULAR: principal (+ interest) instalment; MORATORIUM_INTEREST: interest-only
// instalment due during the moratorium (stored in loan_repayment_schedule_details.installment_type)
export type InstallmentType = "REGULAR" | "MORATORIUM_INTEREST"

export const installmentTypeLabel = (t: string | null | undefined) =>
  t === "MORATORIUM_INTEREST" ? "Moratorium Interest" : "Regular"

export type RepaymentScheduleRow = {
  installment_no: number
  due_date: string // YYYY-MM-DD
  principal: number
  interest: number
  total: number
  balance: number // principal still outstanding after this instalment
  installment_type: InstallmentType
}

/**
 * "Interest Payable During Moratorium" applies only to Fixed Principal loans with a
 * moratorium: interest is then paid at the Repayment Frequency during the moratorium.
 * On Maturity already charges interest for the whole tenure at maturity, so it never applies.
 */
export const isMoratoriumInterestApplicable = (method: RepaymentMethod, moratoriumMonths: unknown) =>
  method === "FIXED_PRINCIPAL" && (Math.floor(Number(moratoriumMonths) || 0) > 0)

/** First principal (regular) instalment — the EMI / installment start date shown and stored at sanction. */
export const firstRegularInstallment = (rows: RepaymentScheduleRow[]) =>
  rows.find((r) => r.installment_type === "REGULAR") ?? rows[0]

const round2 = (n: number) => Math.round(n * 100) / 100
const pad = (n: number) => String(n).padStart(2, "0")

// Calendar date as YYYY-MM-DD. Strings already in that form are kept as-is; Date
// objects use their local calendar day (DB DATE values arrive as local midnight).
function toYmd(value: string | Date): string {
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
    value = new Date(value)
  }
  const d = isNaN(value.getTime()) ? new Date() : value
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Add whole months to a YYYY-MM-DD date; the day is capped at the target month's
// last day (31 Jan + 1 month → 28/29 Feb)
function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const total = y * 12 + (m - 1) + months
  const ty = Math.floor(total / 12)
  const tm = total % 12
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  return `${ty}-${pad(tm + 1)}-${pad(Math.min(d, lastDay))}`
}

/** Months in one repayment period for a frequency; 0 = the whole repayment period (Closing Time). */
export const frequencyMonths = (frequency: string | null | undefined): number =>
  REPAYMENT_FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.months ?? 0

/**
 * Moratorium (gestation) period is part of the sanctioned tenure, not added to it:
 *   Repayment Period = Sanctioned Loan Tenure − Moratorium Period
 * Principal is repaid only in the repayment period, which ends on the maturity date.
 */
export function repaymentPeriodMonths(tenureMonths: unknown, moratoriumMonths: unknown): number {
  const T = Math.floor(Number(tenureMonths)) || 0
  const M = Math.max(0, Math.floor(Number(moratoriumMonths) || 0))
  return T - M
}

/** Maturity date = start date + sanctioned tenure (YYYY-MM-DD). No instalment falls after it. */
export function maturityDate(startDate: string | Date, tenureMonths: number): string {
  return addMonths(toYmd(startDate), Math.floor(Number(tenureMonths)) || 0)
}

/**
 * Error message when the repayment schedule cannot fit within the sanctioned tenure,
 * otherwise "". Used by the Loan Sanction screen and POST /api/loans/sanction.
 * - The moratorium must leave at least one month to repay in.
 * - Fixed Principal needs at least one full period of the chosen frequency after the
 *   moratorium (e.g. Yearly needs 12 months left).
 */
export function getScheduleFitError(params: {
  tenureMonths: unknown
  moratoriumMonths: unknown
  method: RepaymentMethod
  frequency: string | null | undefined
}): string {
  const T = Math.floor(Number(params.tenureMonths)) || 0
  if (!(T > 0)) return ""
  const M = Math.max(0, Math.floor(Number(params.moratoriumMonths) || 0))
  const R = repaymentPeriodMonths(T, M)
  if (R <= 0) {
    return `Gestation period (${M} months) must be less than the loan tenure (${T} months)`
  }
  const frequency = effectiveFrequency(params.method, params.frequency)
  const period = frequencyMonths(frequency)
  if (params.method === "FIXED_PRINCIPAL" && period > R) {
    return `Only ${R} month(s) remain for repayment after the ${M}-month gestation period — ` +
      `not enough for a ${repaymentFrequencyLabel(frequency)} instalment (${period} months). ` +
      `Reduce the gestation period or choose a shorter frequency.`
  }
  return ""
}

export function buildRepaymentSchedule(params: {
  principal: number
  annualRate: number // % per annum
  tenureMonths: number
  moratoriumMonths?: number
  /** Interest Payable During Moratorium (Fixed Principal only; ignored otherwise) */
  moratoriumInterestPayable?: boolean
  method: RepaymentMethod
  frequency: string | null | undefined
  startDate: string | Date // sanction date (preview) or disbursement date (saved schedule)
}): RepaymentScheduleRow[] {
  const P = round2(Number(params.principal))
  const rate = Number(params.annualRate) || 0
  const T = Math.floor(Number(params.tenureMonths))
  const moratorium = Math.max(0, Math.floor(Number(params.moratoriumMonths) || 0))
  if (!(P > 0) || !(T > 0) || rate < 0) return []
  if (getScheduleFitError({ tenureMonths: T, moratoriumMonths: moratorium, method: params.method, frequency: params.frequency })) {
    return []
  }

  const frequency = effectiveFrequency(params.method, params.frequency)
  const start = toYmd(params.startDate)

  // On Maturity (Closing Time): one instalment on the maturity date — full principal plus
  // simple interest for the whole tenure (unchanged; the moratorium doesn't move maturity)
  if (frequency === "CLOSING_TIME") {
    const interest = round2((P * rate * T) / 1200)
    return [{
      installment_no: 1,
      due_date: maturityDate(start, T),
      principal: P,
      interest,
      total: round2(P + interest),
      balance: 0,
      installment_type: "REGULAR",
    }]
  }

  const R = repaymentPeriodMonths(T, moratorium)
  const periodMonths = frequencyMonths(frequency)
  const rows: RepaymentScheduleRow[] = []

  // Interest Payable During Moratorium = Yes: interest-only instalments at the Repayment
  // Frequency on the full principal (nothing is repaid yet), the last one ending with the
  // moratorium. No = no instalments in the moratorium (unchanged behaviour).
  if (params.moratoriumInterestPayable && isMoratoriumInterestApplicable(params.method, moratorium)) {
    const k = Math.ceil(moratorium / periodMonths)
    for (let j = 1; j <= k; j++) {
      // The last moratorium period may be shorter when it isn't a whole number of periods
      const endMonth = Math.min(j * periodMonths, moratorium)
      const monthsInPeriod = endMonth - (j - 1) * periodMonths
      const interest = round2((P * rate * monthsInPeriod) / 1200)
      rows.push({
        installment_no: rows.length + 1,
        due_date: addMonths(start, endMonth),
        principal: 0,
        interest,
        total: interest,
        balance: P,
        installment_type: "MORATORIUM_INTEREST",
      })
    }
  }

  // Fixed Principal: principal repaid after the moratorium; the remaining repayment
  // period is split into instalments of the chosen frequency, the last ending at maturity
  const n = Math.ceil(R / periodMonths)
  const principalPer = round2(P / n)

  let balance = P
  for (let i = 1; i <= n; i++) {
    // The last period may be shorter when the repayment period isn't a whole number of periods
    const endMonth = Math.min(i * periodMonths, R)
    const monthsInPeriod = endMonth - (i - 1) * periodMonths
    const interest = round2((balance * rate * monthsInPeriod) / 1200)
    const principal = i === n ? balance : principalPer // last instalment clears any rounding
    balance = round2(balance - principal)
    rows.push({
      installment_no: rows.length + 1, // numbered after any moratorium-interest instalments
      // moratorium + endMonth ≤ T, so the final instalment is on the maturity date
      due_date: addMonths(start, moratorium + endMonth),
      principal: round2(principal),
      interest,
      total: round2(principal + interest),
      balance,
      installment_type: "REGULAR",
    })
  }
  return rows
}
