// Indian number formatting (lakh / crore grouping) shared by the whole application.
//
//   formatCurrency(12500000)  → "₹1,25,00,000.00"
//   formatAmount(100000)      → "1,00,000.00"
//   parseAmount("1,00,000.50") → 100000.5
//
// Formatting is display-only: it never changes stored values or calculations. Values sent
// to APIs / the database must be plain numbers (use parseAmount / normalizeAmountInput).
// The grouping is implemented here rather than via Intl so server and browser output are
// identical regardless of the runtime's ICU data.

export type Numeric = number | string | null | undefined

export const CURRENCY_SYMBOL = "₹"

// Inserts Indian separators into a string of digits: last 3 digits, then groups of 2.
function groupIndianDigits(digits: string) {
  if (digits.length <= 3) return digits
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")
  return `${head},${digits.slice(-3)}`
}

// Converts a value (number, numeric string, or already-formatted string) to a number.
// Returns NaN when it is not numeric.
export function toNumber(value: Numeric): number {
  if (value === null || value === undefined) return NaN
  if (typeof value === "number") return value
  const cleaned = String(value).replace(/[₹,\s]/g, "")
  if (cleaned === "") return NaN
  return Number(cleaned)
}

const isEmpty = (value: Numeric) =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "")

type FormatOptions = {
  // Fraction digits shown (default 2 for money)
  decimals?: number
  // Text returned for null / undefined / "" / non-numeric values (default: the value formatted as 0)
  empty?: string
}

// "1,00,000.00" — Indian grouping, fixed decimals, no currency symbol.
export function formatAmount(value: Numeric, options: FormatOptions = {}): string {
  const { decimals = 2, empty } = options
  const n = toNumber(value)
  if (isEmpty(value) || !Number.isFinite(n)) {
    if (empty !== undefined) return empty
    return formatAmount(0, { decimals })
  }
  const [intPart, fracPart] = Math.abs(n).toFixed(decimals).split(".")
  const sign = n < 0 && Number(Math.abs(n).toFixed(decimals)) !== 0 ? "-" : ""
  return `${sign}${groupIndianDigits(intPart)}${fracPart ? `.${fracPart}` : ""}`
}

// "₹1,00,000.00" — Indian grouping, 2 decimals, rupee symbol ("-₹500.00" for negatives).
export function formatCurrency(value: Numeric, options: FormatOptions = {}): string {
  const formatted = formatAmount(value, options)
  if (options.empty !== undefined && formatted === options.empty) return formatted
  return formatted.startsWith("-") ? `-${CURRENCY_SYMBOL}${formatted.slice(1)}` : `${CURRENCY_SYMBOL}${formatted}`
}

// Whole-number Indian grouping for counts (members, accounts…): "1,25,000".
export function formatCount(value: Numeric): string {
  return formatAmount(value, { decimals: 0 })
}

// Parses user input or a formatted amount ("₹1,00,000.50") to a number; NaN when invalid.
// Use this before sending amounts to an API.
export function parseAmount(value: Numeric): number {
  return toNumber(value)
}

// Normalises what the user typed into a plain numeric string (no commas), keeping at most
// `decimals` fraction digits: "1,00,000.567" → "100000.56". Used as the value kept in form state.
export function normalizeAmountInput(raw: string, options: { decimals?: number; allowNegative?: boolean } = {}): string {
  const { decimals = 2, allowNegative = false } = options
  let s = String(raw ?? "").replace(/[^\d.-]/g, "")
  const negative = allowNegative && s.startsWith("-")
  s = s.replace(/-/g, "")
  const dot = s.indexOf(".")
  if (dot !== -1) {
    const intPart = s.slice(0, dot)
    const frac = s.slice(dot + 1).replace(/\./g, "")
    s = decimals > 0 ? `${intPart}.${frac.slice(0, decimals)}` : intPart
  }
  // Drop leading zeros ("007" → "7", but keep "0.5")
  s = s.replace(/^0+(?=\d)/, "")
  return negative ? `-${s}` : s
}

// Display form of a plain numeric string while typing: groups the integer part but keeps
// exactly what the user typed after the decimal point ("100000.5" → "1,00,000.5").
export function formatAmountInput(plain: string): string {
  if (plain === null || plain === undefined || plain === "") return ""
  const s = String(plain)
  const negative = s.startsWith("-")
  const body = negative ? s.slice(1) : s
  const [intPart, ...rest] = body.split(".")
  const grouped = intPart === "" ? (rest.length ? "0" : "") : groupIndianDigits(intPart)
  return `${negative ? "-" : ""}${grouped}${rest.length ? `.${rest.join("")}` : ""}`
}
