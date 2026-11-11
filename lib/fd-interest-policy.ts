// Fixed Deposit Interest Policy Configuration (Settings > Interest Policy Configuration).
//
// A policy belongs to one term deposit scheme and has an effective period and
// tenure-wise rate slabs. Every edit or status change is saved as a new version,
// so earlier configurations stay on record. A deposit is opened under the version in
// force for its scheme, opening date and tenure, and keeps a copy of those terms.
//
// Pure helpers (validation, maturity calculation) are used by both the browser and
// the server; the database helpers take the query client as a parameter.

import { calculateAge } from "@/lib/member-age"
import { formatDate } from "@/lib/date-format"

type Queryable = { query: (text: string, values?: any[]) => Promise<{ rows: any[] }> }

export const CALCULATION_METHODS = [
  { value: "PERIOD_WISE", label: "Period wise" },
  { value: "AGE_WISE", label: "Age wise (senior citizens)" },
] as const
export type CalculationMethod = (typeof CALCULATION_METHODS)[number]["value"]

// periods per year; NONE = simple interest
export const COMPOUNDING_FREQUENCIES = [
  { value: "NONE", label: "None (simple interest)", perYear: 0 },
  { value: "MONTHLY", label: "Monthly", perYear: 12 },
  { value: "QUARTERLY", label: "Quarterly", perYear: 4 },
  { value: "HALF_YEARLY", label: "Half Yearly", perYear: 2 },
  { value: "YEARLY", label: "Yearly", perYear: 1 },
] as const
export type CompoundingFrequency = (typeof COMPOUNDING_FREQUENCIES)[number]["value"]

export const MATURITY_ROUNDING = [
  { value: "NEAREST_RUPEE", label: "Nearest rupee" },
  { value: "NEAREST_PAISE", label: "Nearest paise" },
  { value: "ROUND_DOWN_RUPEE", label: "Round down to rupee" },
] as const
export type MaturityRounding = (typeof MATURITY_ROUNDING)[number]["value"]

/** Highest interest or penal rate accepted (% p.a.) */
export const MAX_INTEREST_RATE = 50

export type RateSlab = {
  tenure_from_days: number
  tenure_to_days: number
  interest_rate: number
  /** Only on versions saved before the Senior Citizen Benefit setting existed */
  senior_citizen_rate?: number | null
}

export const INTEREST_CATEGORIES = [
  { value: "REGULAR", label: "Regular" },
  { value: "SENIOR_CITIZEN", label: "Senior Citizen" },
] as const
export type InterestCategory = (typeof INTEREST_CATEGORIES)[number]["value"]

export type PolicyTerms = {
  policy_name: string
  scheme_id: number
  calculation_method: CalculationMethod
  senior_citizen_age: number | null
  rate_slabs: RateSlab[]
  compounding_frequency: CompoundingFrequency
  effective_from: string
  effective_to: string | null
  premature_closure_allowed: boolean
  premature_lock_in_days: number
  premature_penal_rate: number
  maturity_rounding: MaturityRounding
  // Senior Citizen Benefit: regular tenure rate + additional rate, for members at or
  // above the minimum age on the opening date, within the benefit period
  senior_benefit_enabled: boolean
  senior_min_age: number | null
  senior_additional_rate: number | null
  senior_effective_from: string | null
  senior_effective_to: string | null
}

export type PolicyVersion = PolicyTerms & {
  version_id: number
  policy_id: number
  version_no: number
  status: "ACTIVE" | "INACTIVE"
  change_type: string
  change_remarks: string | null
  created_by: string | null
  created_at: string
}

export const labelOf = (list: readonly { value: string; label: string }[], v: string | null | undefined) =>
  list.find((o) => o.value === v)?.label || String(v || "")

/** "7 days", "1 year 2 months"-style text is ambiguous; tenure is always whole days. */
export const tenureLabel = (from: number, to: number) => `${from} – ${to} days`

// ── Validation ───────────────────────────────────────────────────────────────

const isYmd = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
const twoDecimals = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

function rateError(label: string, v: unknown): string | null {
  const n = Number(v)
  if (v === "" || v === null || v === undefined || !Number.isFinite(n)) return `${label} is required.`
  if (n <= 0 || n > MAX_INTEREST_RATE) return `${label} must be greater than 0 and not more than ${MAX_INTEREST_RATE}%.`
  if (!twoDecimals(n)) return `${label} can have at most 2 decimal places.`
  return null
}

/** Checks a policy form and returns clean terms, or the first problem found. */
export function parsePolicyInput(body: any): { terms: PolicyTerms } | { error: string } {
  const name = String(body?.policy_name ?? "").trim()
  if (!name) return { error: "Policy name is required." }
  if (name.length > 100) return { error: "Policy name can be at most 100 characters." }

  const schemeId = Number(body?.scheme_id)
  if (!Number.isInteger(schemeId) || schemeId <= 0) return { error: "Please select a deposit scheme." }

  // Senior Citizen Benefit decides the method: age wise when enabled, period wise otherwise
  const seniorEnabled = body?.senior_benefit_enabled === true
  const method: CalculationMethod = seniorEnabled ? "AGE_WISE" : "PERIOD_WISE"

  const compounding = body?.compounding_frequency
  if (!COMPOUNDING_FREQUENCIES.some((c) => c.value === compounding)) return { error: "Please select a compounding frequency." }

  const from = body?.effective_from
  const to = body?.effective_to || null
  if (!isYmd(from)) return { error: "Effective From date is required." }
  if (to !== null && !isYmd(to)) return { error: "Effective To date is not valid." }
  if (to !== null && to < from) return { error: "Effective To date cannot be before Effective From date." }

  const rawSlabs: any[] = Array.isArray(body?.rate_slabs) ? body.rate_slabs : []
  if (rawSlabs.length === 0) return { error: "Add at least one tenure and interest rate." }
  const slabs: RateSlab[] = []
  for (let i = 0; i < rawSlabs.length; i++) {
    const s = rawSlabs[i]
    const row = `Rate row ${i + 1}`
    const f = Number(s?.tenure_from_days)
    const t = Number(s?.tenure_to_days)
    if (!Number.isInteger(f) || f < 1) return { error: `${row}: tenure from must be a whole number of days (1 or more).` }
    if (!Number.isInteger(t) || t < f) return { error: `${row}: tenure to must be a whole number of days, not less than tenure from.` }
    const rErr = rateError(`${row}: interest rate`, s?.interest_rate)
    if (rErr) return { error: rErr }
    slabs.push({ tenure_from_days: f, tenure_to_days: t, interest_rate: Number(s.interest_rate) })
  }
  slabs.sort((a, b) => a.tenure_from_days - b.tenure_from_days)
  for (let i = 1; i < slabs.length; i++) {
    if (slabs[i].tenure_from_days <= slabs[i - 1].tenure_to_days) {
      return {
        error: `Tenure ranges ${tenureLabel(slabs[i - 1].tenure_from_days, slabs[i - 1].tenure_to_days)} and ${tenureLabel(slabs[i].tenure_from_days, slabs[i].tenure_to_days)} overlap.`,
      }
    }
  }

  const prematureAllowed = body?.premature_closure_allowed !== false
  const lockIn = prematureAllowed ? Number(body?.premature_lock_in_days ?? 0) : 0
  if (!Number.isInteger(lockIn) || lockIn < 0) return { error: "Premature lock-in period must be a whole number of days (0 or more)." }
  const penal = prematureAllowed ? Number(body?.premature_penal_rate ?? 0) : 0
  if (!Number.isFinite(penal) || penal < 0 || penal > 100 || !twoDecimals(penal)) {
    return { error: "Premature penal rate must be between 0 and 100, with at most 2 decimal places." }
  }

  const rounding = body?.maturity_rounding
  if (!MATURITY_ROUNDING.some((r) => r.value === rounding)) return { error: "Please select a maturity rounding rule." }

  let seniorAge: number | null = null
  let seniorExtra: number | null = null
  let seniorFrom: string | null = null
  let seniorTo: string | null = null
  if (seniorEnabled) {
    seniorAge = Number(body?.senior_min_age)
    if (!Number.isInteger(seniorAge) || seniorAge < 1 || seniorAge > 120) {
      return { error: "Senior citizen minimum age must be a whole number between 1 and 120." }
    }
    const xErr = rateError("Senior citizen additional rate", body?.senior_additional_rate)
    if (xErr) return { error: xErr }
    seniorExtra = Number(body.senior_additional_rate)
    const highest = Math.max(...slabs.map((sl) => sl.interest_rate))
    if (highest + seniorExtra > MAX_INTEREST_RATE) {
      return { error: `Regular rate plus senior citizen additional rate cannot exceed ${MAX_INTEREST_RATE}% (highest regular rate is ${highest}%).` }
    }
    seniorFrom = body?.senior_effective_from || from
    seniorTo = body?.senior_effective_to || null
    if (!isYmd(seniorFrom)) return { error: "Senior citizen benefit Effective From date is not valid." }
    if (seniorTo !== null && !isYmd(seniorTo)) return { error: "Senior citizen benefit Effective To date is not valid." }
    if (seniorFrom < from) return { error: "Senior citizen benefit cannot start before the policy's Effective From date." }
    if (to !== null && seniorFrom > to) return { error: "Senior citizen benefit must start within the policy period." }
    if (seniorTo !== null && seniorTo < seniorFrom) return { error: "Senior citizen benefit Effective To date cannot be before its Effective From date." }
    if (to !== null && seniorTo !== null && seniorTo > to) return { error: "Senior citizen benefit cannot end after the policy's Effective To date." }
    // Open-ended benefit inside a policy with an end date ends with the policy
    if (seniorTo === null && to !== null) seniorTo = to
  }

  return {
    terms: {
      policy_name: name,
      scheme_id: schemeId,
      calculation_method: method,
      senior_citizen_age: null,
      rate_slabs: slabs,
      compounding_frequency: compounding,
      effective_from: from,
      effective_to: to,
      premature_closure_allowed: prematureAllowed,
      premature_lock_in_days: lockIn,
      premature_penal_rate: penal,
      maturity_rounding: rounding,
      senior_benefit_enabled: seniorEnabled,
      senior_min_age: seniorAge,
      senior_additional_rate: seniorExtra,
      senior_effective_from: seniorFrom,
      senior_effective_to: seniorTo,
    },
  }
}

const datesOverlap = (aFrom: string, aTo: string | null, bFrom: string, bTo: string | null) =>
  aFrom <= (bTo ?? "9999-12-31") && bFrom <= (aTo ?? "9999-12-31")

const slabsOverlap = (a: RateSlab[], b: RateSlab[]) =>
  a.some((x) => b.some((y) => x.tenure_from_days <= y.tenure_to_days && y.tenure_from_days <= x.tenure_to_days))

// ── Database helpers ─────────────────────────────────────────────────────────

const VERSION_COLUMNS = `v.version_id, v.policy_id, v.version_no, v.policy_name, v.status,
  v.calculation_method, v.senior_citizen_age, v.rate_slabs, v.compounding_frequency,
  TO_CHAR(v.effective_from, 'YYYY-MM-DD') AS effective_from,
  TO_CHAR(v.effective_to, 'YYYY-MM-DD') AS effective_to,
  v.premature_closure_allowed, v.premature_lock_in_days, v.premature_penal_rate::float8 AS premature_penal_rate,
  v.maturity_rounding, v.change_type, v.change_remarks, v.created_by, v.created_at,
  v.senior_benefit_enabled, v.senior_min_age, v.senior_additional_rate::float8 AS senior_additional_rate,
  TO_CHAR(v.senior_effective_from, 'YYYY-MM-DD') AS senior_effective_from,
  TO_CHAR(v.senior_effective_to, 'YYYY-MM-DD') AS senior_effective_to`

/** Current version of every policy in the branch (with the scheme it belongs to). */
export async function listPolicies(db: Queryable, branchId: string | number) {
  const { rows } = await db.query(
    `SELECT ${VERSION_COLUMNS}, p.scheme_id, ds.scheme_name, p.updated_at
       FROM fd_interest_policies p
       JOIN fd_interest_policy_versions v ON v.policy_id = p.policy_id AND v.version_no = p.current_version
       LEFT JOIN deposit_schemes ds ON ds.scheme_id = p.scheme_id AND ds.branch_id = p.branch_id
      WHERE p.branch_id = $1
      ORDER BY ds.scheme_name NULLS LAST, v.effective_from DESC, p.policy_id DESC`,
    [Number(branchId)]
  )
  return rows as (PolicyVersion & { scheme_name: string | null })[]
}

export async function getPolicyHistory(db: Queryable, branchId: string | number, policyId: number) {
  const { rows } = await db.query(
    `SELECT ${VERSION_COLUMNS}, p.scheme_id
       FROM fd_interest_policy_versions v
       JOIN fd_interest_policies p ON p.policy_id = v.policy_id
      WHERE p.branch_id = $1 AND v.policy_id = $2
      ORDER BY v.version_no DESC`,
    [Number(branchId), policyId]
  )
  return rows as PolicyVersion[]
}

/**
 * Another ACTIVE policy of the same scheme whose effective period and tenure
 * ranges both overlap these terms, or null. `exceptPolicyId` skips the policy being edited.
 */
export async function findOverlappingPolicy(
  db: Queryable,
  branchId: string | number,
  terms: Pick<PolicyTerms, "scheme_id" | "effective_from" | "effective_to" | "rate_slabs">,
  exceptPolicyId?: number
) {
  const policies = await listPolicies(db, branchId)
  return (
    policies.find(
      (p) =>
        p.policy_id !== exceptPolicyId &&
        p.status === "ACTIVE" &&
        Number(p.scheme_id) === Number(terms.scheme_id) &&
        datesOverlap(p.effective_from, p.effective_to, terms.effective_from, terms.effective_to) &&
        slabsOverlap(p.rate_slabs, terms.rate_slabs)
    ) ?? null
  )
}

export function overlapMessage(p: { policy_name: string; effective_from: string; effective_to: string | null }) {
  const period = `${formatDate(p.effective_from)}${p.effective_to ? ` to ${formatDate(p.effective_to)}` : " onwards"}`
  return `This overlaps the active policy "${p.policy_name}" (${period}) for the same scheme and tenure. Change the dates or tenure ranges, or deactivate that policy first.`
}

/** Adds a version row and points the policy at it. */
export async function insertVersion(
  db: Queryable,
  policyId: number,
  versionNo: number,
  terms: PolicyTerms,
  status: "ACTIVE" | "INACTIVE",
  changeType: string,
  remarks: string | null,
  userId: string
) {
  await db.query(
    `INSERT INTO fd_interest_policy_versions (
       policy_id, version_no, policy_name, status, calculation_method, senior_citizen_age, rate_slabs,
       compounding_frequency, effective_from, effective_to, premature_closure_allowed,
       premature_lock_in_days, premature_penal_rate, maturity_rounding, change_type, change_remarks, created_by,
       senior_benefit_enabled, senior_min_age, senior_additional_rate, senior_effective_from, senior_effective_to
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
    [
      policyId, versionNo, terms.policy_name, status, terms.calculation_method, terms.senior_citizen_age,
      JSON.stringify(terms.rate_slabs), terms.compounding_frequency, terms.effective_from, terms.effective_to,
      terms.premature_closure_allowed, terms.premature_lock_in_days, terms.premature_penal_rate,
      terms.maturity_rounding, changeType, remarks, userId,
      terms.senior_benefit_enabled, terms.senior_min_age, terms.senior_additional_rate,
      terms.senior_effective_from, terms.senior_effective_to,
    ]
  )
  await db.query(
    `UPDATE fd_interest_policies
        SET current_version = $2, status = $3, policy_name = $4, updated_by = $5, updated_at = now()
      WHERE policy_id = $1`,
    [policyId, versionNo, status, terms.policy_name, userId]
  )
}

// ── Applying a policy to a new deposit ───────────────────────────────────────

/** Maturity date and tenure in days, using real calendar month lengths (as before). */
export function termPeriod(openDate: string, months: number, days: number) {
  const open = new Date(openDate)
  const maturity = new Date(openDate)
  maturity.setMonth(maturity.getMonth() + months)
  maturity.setDate(maturity.getDate() + days)
  const totalDays = Math.round((maturity.getTime() - open.getTime()) / (1000 * 60 * 60 * 24))
  return { maturityDate: maturity.toISOString().split("T")[0], totalDays }
}

/**
 * Maturity amount for a term deposit. With compounding NONE and nearest-rupee
 * rounding this is exactly the existing calculation: principal + P×R×days/36500.
 * Compounding is only applied when interest is paid at maturity (cumulative).
 */
export function computeTermMaturity(params: {
  principal: number
  annualRate: number
  openDate: string
  months: number
  days: number
  compounding?: CompoundingFrequency
  rounding?: MaturityRounding
  cumulative?: boolean
}) {
  const { principal, annualRate, openDate, months, days } = params
  const { maturityDate, totalDays } = termPeriod(openDate, months, days)
  const perYear = params.cumulative === false ? 0 : COMPOUNDING_FREQUENCIES.find((c) => c.value === params.compounding)?.perYear || 0

  const gross =
    perYear > 0
      ? principal * Math.pow(1 + annualRate / (100 * perYear), (perYear * totalDays) / 365)
      : principal + (principal * annualRate * totalDays) / (365 * 100)

  const rounding = params.rounding || "NEAREST_RUPEE"
  const maturityAmount =
    rounding === "NEAREST_PAISE" ? Math.round(gross * 100) / 100 : rounding === "ROUND_DOWN_RUPEE" ? Math.floor(gross) : Math.round(gross)

  return {
    maturityDate,
    totalDays,
    maturityAmount,
    interest: Math.round((maturityAmount - principal) * 100) / 100,
    compounded: perYear > 0,
  }
}

export type AppliedPolicy = {
  policy_id: number
  version_id: number
  version_no: number
  policy_name: string
  calculation_method: CalculationMethod
  /** Rate the deposit gets: regular, or regular + senior citizen additional rate */
  interest_rate: number
  regular_rate: number
  senior_additional_rate: number
  interest_category: InterestCategory
  senior_citizen_applied: boolean
  /** Member's age on the opening date (null when the date of birth is not on record) */
  member_age: number | null
  senior_benefit_enabled: boolean
  senior_min_age: number | null
  tenure_days: number
  slab: RateSlab
  compounding_frequency: CompoundingFrequency
  maturity_rounding: MaturityRounding
  premature_closure_allowed: boolean
  premature_lock_in_days: number
  premature_penal_rate: number
  effective_from: string
  effective_to: string | null
}

/** Member's age in whole years on a date (the deposit opening date), or null. */
export function memberAgeOn(dateOfBirth: string | null | undefined, onDate: string): number | null {
  if (!dateOfBirth) return null
  const age = calculateAge(dateOfBirth, onDate)
  return age !== null && age >= 0 ? age : null
}

/**
 * The active policy for a scheme on the opening date whose tenure slab covers the
 * deposit's tenure, with the rate that applies to this depositor; null if none.
 */
export async function findApplicablePolicy(
  db: Queryable,
  params: { branchId: string | number; schemeId: number; openDate: string; tenureDays: number; dateOfBirth?: string | null }
): Promise<AppliedPolicy | null> {
  const { rows } = await db.query(
    `SELECT ${VERSION_COLUMNS}
       FROM fd_interest_policies p
       JOIN fd_interest_policy_versions v ON v.policy_id = p.policy_id AND v.version_no = p.current_version
      WHERE p.branch_id = $1 AND p.scheme_id = $2 AND p.status = 'ACTIVE'
        AND v.effective_from <= $3::date AND (v.effective_to IS NULL OR v.effective_to >= $3::date)
      ORDER BY v.effective_from DESC, p.policy_id DESC`,
    [Number(params.branchId), params.schemeId, params.openDate]
  )
  for (const v of rows as PolicyVersion[]) {
    const slab = (v.rate_slabs || []).find(
      (s) => params.tenureDays >= s.tenure_from_days && params.tenureDays <= s.tenure_to_days
    )
    if (!slab) continue
    const age = memberAgeOn(params.dateOfBirth, params.openDate)
    const regular = Number(slab.interest_rate)
    let rate = regular
    let extra = 0
    let senior = false
    if (v.senior_benefit_enabled) {
      // Senior Citizen Benefit: eligible by age on the opening date, within the benefit period
      senior =
        age !== null &&
        v.senior_min_age !== null &&
        age >= v.senior_min_age &&
        !!v.senior_effective_from &&
        v.senior_effective_from <= params.openDate &&
        (!v.senior_effective_to || v.senior_effective_to >= params.openDate)
      if (senior) {
        extra = Number(v.senior_additional_rate) || 0
        rate = Math.round((regular + extra) * 100) / 100
      }
    } else if (v.calculation_method === "AGE_WISE" && v.senior_citizen_age !== null && slab.senior_citizen_rate != null) {
      // Versions saved before the Senior Citizen Benefit setting: per-tenure senior rate
      senior = age !== null && age >= v.senior_citizen_age
      if (senior) {
        rate = Number(slab.senior_citizen_rate)
        extra = Math.round((rate - regular) * 100) / 100
      }
    }
    return {
      policy_id: v.policy_id,
      version_id: v.version_id,
      version_no: v.version_no,
      policy_name: v.policy_name,
      calculation_method: v.calculation_method,
      interest_rate: rate,
      regular_rate: regular,
      senior_additional_rate: extra,
      interest_category: senior ? "SENIOR_CITIZEN" : "REGULAR",
      senior_citizen_applied: senior,
      member_age: age,
      senior_benefit_enabled: !!v.senior_benefit_enabled || v.calculation_method === "AGE_WISE",
      senior_min_age: v.senior_benefit_enabled ? v.senior_min_age : v.senior_citizen_age,
      tenure_days: params.tenureDays,
      slab,
      compounding_frequency: v.compounding_frequency,
      maturity_rounding: v.maturity_rounding,
      premature_closure_allowed: v.premature_closure_allowed,
      premature_lock_in_days: v.premature_lock_in_days,
      premature_penal_rate: Number(v.premature_penal_rate),
      effective_from: v.effective_from,
      effective_to: v.effective_to,
    }
  }
  return null
}
