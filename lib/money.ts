// Money as integer paise, shared by server routes and client components.
//
// Every rupee amount is held as a whole number of paise (₹12.34 → 1234), so sums and
// differences are exact. Rate calculations (interest, EMI) are worked out as exact
// fractions with BigInt and rounded once, at the end, to whole paise using banker's
// rounding (round half to even: 0.5 → 0, 1.5 → 2, 2.5 → 2).
//
// Boundaries:
//   DB row → paise       toPaise(row.amount)            pg returns NUMERIC as a string
//   request → paise      parseAmountInput(body.amount)  null when missing/invalid/> 2 decimals
//   paise → SQL param    toSql(p)                       "1234.50" (pg accepts strings for NUMERIC)
//   paise → JSON / UI    toRupees(p)                    API responses stay plain numbers
//
// Note: PostgreSQL ROUND() on NUMERIC rounds half away from zero, so a value rounded in
// SQL can differ by one paisa from the same value rounded here when it is exactly x.xx5.

/** A whole number of paise. Branded so plain rupee numbers can't be passed by mistake. */
export type Paise = number & { readonly __unit: "paise" }

/** How a calculated amount is rounded. All modes are applied to the exact value, once. */
export type Rounding = "PAISA" | "RUPEE" | "RUPEE_DOWN"

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MoneyError"
  }
}

// BigInt literals (1n) need an ES2020 target; this project targets ES2017.
const ZERO = BigInt(0)
const ONE = BigInt(1)
const TWO = BigInt(2)
const TEN = BigInt(10)
const PAISE_PER_RUPEE = BigInt(100)

export const ZERO_PAISE = 0 as Paise

function asPaise(n: number): Paise {
  if (!Number.isSafeInteger(n)) throw new MoneyError(`Amount out of range: ${n} paise`)
  return (n === 0 ? 0 : n) as Paise // normalise -0
}

function bigToPaise(b: bigint): Paise {
  return asPaise(Number(b))
}

// ── Exact decimals ───────────────────────────────────────────────────────────

/** value = units / 10^scale */
type Decimal = { units: bigint; scale: number }

const DECIMAL_RE = /^([+-])?(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/

// Parses a decimal string or number exactly. Numbers go through String(), which gives
// the shortest decimal that round-trips (0.1 → "0.1"), i.e. the value that was meant.
// Indian-grouped input ("1,00,000.50") and a leading ₹ are accepted.
function parseDecimal(value: string | number): Decimal | null {
  if (typeof value === "number" && !Number.isFinite(value)) return null
  const s = String(value).trim().replace(/[₹,\s]/g, "")
  const m = DECIMAL_RE.exec(s)
  if (!m) return null
  const [, sign, int = "", frac = "", exp] = m
  if (int === "" && frac === "") return null
  let digits = int + frac
  let scale = frac.length - (exp ? Number(exp) : 0)
  if (scale < 0) {
    digits += "0".repeat(-scale)
    scale = 0
  }
  const units = BigInt(digits)
  return { units: sign === "-" ? -units : units, scale }
}

const pow10 = (n: number) => TEN ** BigInt(n)

/** n / d rounded to an integer, ties to even. */
function divHalfEven(n: bigint, d: bigint): bigint {
  if (d === ZERO) throw new MoneyError("Division by zero")
  if (d < ZERO) {
    n = -n
    d = -d
  }
  const negative = n < ZERO
  const a = negative ? -n : n
  let q = a / d
  const twiceRemainder = (a % d) * TWO
  if (twiceRemainder > d || (twiceRemainder === d && q % TWO === ONE)) q += ONE
  return negative ? -q : q
}

/** n / d rounded down (towards −∞). */
function divFloor(n: bigint, d: bigint): bigint {
  if (d < ZERO) {
    n = -n
    d = -d
  }
  const q = n / d
  return n < ZERO && q * d !== n ? q - ONE : q
}

/** Rounds the exact paise amount n / d according to `rounding`. */
function roundFraction(n: bigint, d: bigint, rounding: Rounding): Paise {
  switch (rounding) {
    case "PAISA":
      return bigToPaise(divHalfEven(n, d))
    case "RUPEE":
      return bigToPaise(divHalfEven(n, d * PAISE_PER_RUPEE) * PAISE_PER_RUPEE)
    case "RUPEE_DOWN":
      return bigToPaise(divFloor(n, d * PAISE_PER_RUPEE) * PAISE_PER_RUPEE)
  }
}

function rateOf(ratePercent: string | number): Decimal {
  const rate = parseDecimal(ratePercent)
  if (!rate) throw new MoneyError(`Invalid rate: ${String(ratePercent)}`)
  return rate
}

// ── Converting in and out ────────────────────────────────────────────────────

/**
 * Converts a stored or computed amount (pg NUMERIC string, number, or Paise-free rupee
 * value) to paise. null / undefined / "" become 0, matching the `|| 0` the routes used.
 * Values with more than 2 decimals (e.g. 4-decimal accruals) are rounded half to even.
 * Throws MoneyError for anything that isn't a number.
 */
export function toPaise(value: string | number | null | undefined): Paise {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return ZERO_PAISE
  }
  const dec = parseDecimal(value)
  if (!dec) throw new MoneyError(`Invalid amount: ${String(value)}`)
  return roundFraction(dec.units * PAISE_PER_RUPEE, pow10(dec.scale), "PAISA")
}

/**
 * Parses an amount typed by a user (request body). Returns null when it is missing,
 * not a number, or has more than 2 decimal places — callers reply 400 rather than
 * silently rounding what the user entered.
 */
export function parseAmountInput(value: unknown): Paise | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const dec = parseDecimal(value)
  if (!dec) return null
  if (dec.scale > 2) {
    // allow trailing zeros beyond 2 places ("10.500")
    const excess = pow10(dec.scale - 2)
    if (dec.units % excess !== ZERO) return null
  }
  try {
    return roundFraction(dec.units * PAISE_PER_RUPEE, pow10(dec.scale), "PAISA")
  } catch {
    return null
  }
}

/** Paise → rupees as a plain number, for JSON responses and existing number-based UI. */
export function toRupees(p: Paise): number {
  return p / 100
}

/** Paise → exact decimal string for a NUMERIC query parameter ("-1234.05"). */
export function toSql(p: Paise): string {
  const negative = p < 0
  const abs = String(Math.abs(p)).padStart(3, "0")
  return `${negative ? "-" : ""}${abs.slice(0, -2)}.${abs.slice(-2)}`
}

/** Indian-grouped currency text from paise, without going through floating point. */
export function formatMoney(p: Paise): string {
  const [int, frac] = toSql(p).replace("-", "").split(".")
  const grouped = int.length <= 3 ? int : `${int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${int.slice(-3)}`
  return `${p < 0 ? "-" : ""}₹${grouped}.${frac}`
}

// ── Arithmetic ───────────────────────────────────────────────────────────────

export function add(...amounts: Paise[]): Paise {
  let total = 0
  for (const a of amounts) total += a
  return asPaise(total)
}

export function sub(a: Paise, b: Paise): Paise {
  return asPaise(a - b)
}

export function sum(amounts: Iterable<Paise>): Paise {
  return add(...amounts)
}

/** p × n for a whole number n (e.g. EMI × number of instalments). */
export function multiplyBy(p: Paise, n: number): Paise {
  if (!Number.isSafeInteger(n)) throw new MoneyError(`Invalid multiplier: ${n}`)
  return asPaise(p * n)
}

/** p / n rounded half to even — e.g. splitting a principal into n instalments. */
export function divideBy(p: Paise, n: number): Paise {
  if (!Number.isSafeInteger(n) || n === 0) throw new MoneyError(`Invalid divisor: ${n}`)
  return bigToPaise(divHalfEven(BigInt(p), BigInt(n)))
}

/** Rounds an amount already in paise to whole rupees (half to even, or down). */
export function roundToRupee(p: Paise, mode: "RUPEE" | "RUPEE_DOWN" = "RUPEE"): Paise {
  return roundFraction(BigInt(p), ONE, mode)
}

// ── Rates ────────────────────────────────────────────────────────────────────

/**
 * p × ratePercent/100 × numer/denom, computed exactly and rounded once.
 * e.g. monthly interest = applyRate(p, 9.5, 1, 12); daily = applyRate(p, 9.5, 1, 365).
 */
export function applyRate(
  p: Paise,
  ratePercent: string | number,
  numer: number,
  denom: number,
  rounding: Rounding = "PAISA"
): Paise {
  if (!Number.isSafeInteger(numer) || !Number.isSafeInteger(denom) || denom === 0) {
    throw new MoneyError(`Invalid period ${numer}/${denom}`)
  }
  const rate = rateOf(ratePercent)
  const n = BigInt(p) * rate.units * BigInt(numer)
  const d = pow10(rate.scale) * BigInt(100) * BigInt(denom)
  return roundFraction(n, d, rounding)
}

/** Simple interest for whole months: p × rate% × months / 12. */
export function interestForMonths(p: Paise, annualRatePercent: string | number, months: number): Paise {
  return applyRate(p, annualRatePercent, months, 12)
}

/** Simple interest for days: p × rate% × days / daysInYear. */
export function interestForDays(
  p: Paise,
  annualRatePercent: string | number,
  days: number,
  daysInYear = 365
): Paise {
  return applyRate(p, annualRatePercent, days, daysInYear)
}

/**
 * p plus simple interest (p × rate% × numer/denom), rounded once as a whole — so
 * rounding a maturity amount to the rupee doesn't first round the interest to the paisa.
 */
export function addSimpleInterest(
  p: Paise,
  ratePercent: string | number,
  numer: number,
  denom: number,
  rounding: Rounding = "PAISA"
): Paise {
  const rate = rateOf(ratePercent)
  const d = pow10(rate.scale) * BigInt(100) * BigInt(denom)
  const n = BigInt(p) * d + BigInt(p) * rate.units * BigInt(numer)
  return roundFraction(n, d, rounding)
}

/**
 * p × (1 + rate%/periodsPerYear)^periods, rounded once. A fractional number of periods
 * makes the growth factor irrational, so the factor is computed in floating point
 * (~15 significant digits: far below a paisa for any realistic deposit) and only the
 * final amount is rounded.
 */
export function compound(
  p: Paise,
  annualRatePercent: string | number,
  periodsPerYear: number,
  periods: number,
  rounding: Rounding = "PAISA"
): Paise {
  const rate = Number(annualRatePercent)
  if (!Number.isFinite(rate) || !(periodsPerYear > 0)) throw new MoneyError("Invalid compounding")
  const gross = p * Math.pow(1 + rate / (100 * periodsPerYear), periods)
  const unit = rounding === "PAISA" ? 1 : 100
  const q = gross / unit
  let whole: number
  if (rounding === "RUPEE_DOWN") {
    whole = Math.floor(q)
  } else {
    const f = Math.floor(q)
    const diff = q - f
    whole = diff > 0.5 ? f + 1 : diff < 0.5 ? f : f % 2 === 0 ? f : f + 1
  }
  return asPaise(whole * unit)
}

/**
 * Equated monthly instalment on the reducing balance:
 *   EMI = P × r × (1+r)^n / ((1+r)^n − 1),  r = annual rate / 1200
 * computed as one exact fraction and rounded half to even. With a 0% rate it is P / n.
 */
export function emi(p: Paise, annualRatePercent: string | number, months: number): Paise {
  if (!Number.isSafeInteger(months) || months <= 0) throw new MoneyError(`Invalid tenure: ${months}`)
  const rate = rateOf(annualRatePercent)
  if (rate.units === ZERO) return divideBy(p, months)
  // r = N / D  →  EMI = P × N × A^n / (D × (A^n − D^n)), A = D + N
  const N = rate.units
  const D = pow10(rate.scale) * BigInt(1200)
  const n = BigInt(months)
  const An = (D + N) ** n
  const Dn = D ** n
  return bigToPaise(divHalfEven(BigInt(p) * N * An, D * (An - Dn)))
}
