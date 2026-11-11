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

export type RepaymentScheduleRow = {
  installment_no: number
  due_date: string // YYYY-MM-DD
  principal: number
  interest: number
  total: number
  balance: number // principal still outstanding after this instalment
}

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

export function buildRepaymentSchedule(params: {
  principal: number
  annualRate: number // % per annum
  tenureMonths: number
  moratoriumMonths?: number
  method: RepaymentMethod
  frequency: string | null | undefined
  startDate: string | Date // sanction date (preview) or disbursement date (saved schedule)
}): RepaymentScheduleRow[] {
  const P = round2(Number(params.principal))
  const rate = Number(params.annualRate) || 0
  const T = Math.floor(Number(params.tenureMonths))
  const moratorium = Math.max(0, Math.floor(Number(params.moratoriumMonths) || 0))
  if (!(P > 0) || !(T > 0) || rate < 0) return []

  const frequency = effectiveFrequency(params.method, params.frequency)
  const periodMonths = REPAYMENT_FREQUENCY_OPTIONS.find((o) => o.value === frequency)!.months || T
  const n = Math.ceil(T / periodMonths)
  const principalPer = round2(P / n)
  const start = toYmd(params.startDate)

  const rows: RepaymentScheduleRow[] = []
  let balance = P
  for (let i = 1; i <= n; i++) {
    // The last period may be shorter when the tenure isn't a whole number of periods
    const endMonth = Math.min(i * periodMonths, T)
    const monthsInPeriod = endMonth - (i - 1) * periodMonths
    const interest = round2((balance * rate * monthsInPeriod) / 1200)
    const principal = i === n ? balance : principalPer // last instalment clears any rounding
    balance = round2(balance - principal)
    rows.push({
      installment_no: i,
      due_date: addMonths(start, moratorium + endMonth),
      principal: round2(principal),
      interest,
      total: round2(principal + interest),
      balance,
    })
  }
  return rows
}
