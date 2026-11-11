// App-wide date format: DD-MM-YYYY.
//
// The API and database use ISO dates ("YYYY-MM-DD"). These helpers only change how a
// date is shown or typed, never the stored value:
//   - A plain "YYYY-MM-DD" string is read by its parts, so it never shifts a day
//     because of the browser's timezone (new Date("2024-05-01") is UTC midnight).
//   - A full timestamp ("2024-05-01T18:30:00Z") or Date is shown in local time,
//     as before.

export const DATE_FORMAT_LABEL = "DD-MM-YYYY"

type DateLike = string | number | Date | null | undefined

const pad = (n: number) => String(n).padStart(2, "0")

/** True when y-m-d is a real calendar date (e.g. rejects 31-02-2024). */
export function isValidYmd(y: number, m: number, d: number) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1) return false
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Splits a date value into local calendar parts, or null when it is not a date. */
function toParts(value: DateLike): { y: number; m: number; d: number; date?: Date } | null {
  if (value === null || value === undefined || value === "") return null
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate(), date: value }
  }
  if (typeof value === "number") return toParts(new Date(value))

  const s = String(value).trim()
  // Plain ISO date (optionally with a midnight time and no timezone)
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]00:00(?::00(?:\.0+)?)?)?$/.exec(s)
  if (m) return isValidYmd(+m[1], +m[2], +m[3]) ? { y: +m[1], m: +m[2], d: +m[3] } : null
  // Already DD-MM-YYYY or DD/MM/YYYY
  m = /^(\d{2})[-/.](\d{2})[-/.](\d{4})$/.exec(s)
  if (m) return isValidYmd(+m[3], +m[2], +m[1]) ? { y: +m[3], m: +m[2], d: +m[1] } : null
  // ISO timestamp ("2024-05-01T18:30:00.000Z"): local time, as the app showed it before
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) return toParts(new Date(s))
  return null
}

/** Shows a date as DD-MM-YYYY. Returns `fallback` for empty or invalid values. */
export function formatDate(value: DateLike, fallback = "-"): string {
  const p = toParts(value)
  if (p) return `${pad(p.d)}-${pad(p.m)}-${p.y}`
  // Text that is not a date (e.g. "N/A") is shown as it is
  return typeof value === "string" && value.trim() ? value : fallback
}

/** Shows a date and time as "DD-MM-YYYY, hh:mm am". Plain dates show without a time. */
export function formatDateTime(value: DateLike, fallback = "-"): string {
  const p = toParts(value)
  if (!p) return typeof value === "string" && value.trim() ? value : fallback
  const date = p.date ?? (typeof value === "string" && /[T ]\d{2}:\d{2}/.test(value) ? new Date(value) : null)
  if (!date || isNaN(date.getTime())) return `${pad(p.d)}-${pad(p.m)}-${p.y}`
  const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  return `${pad(p.d)}-${pad(p.m)}-${p.y}, ${time}`
}

/** "YYYY-MM-DD" for a Date in local time (no UTC shift, unlike toISOString). */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Turns a typed "DD-MM-YYYY" (also DD/MM/YYYY, DD.MM.YYYY or a pasted ISO date)
 * into "YYYY-MM-DD". Returns "" when the text is incomplete or not a real date.
 */
export function parseDisplayDate(text: string): string {
  const s = String(text || "").trim()
  let m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s)
  if (m && isValidYmd(+m[3], +m[2], +m[1])) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m && isValidYmd(+m[1], +m[2], +m[3])) return s
  return ""
}
