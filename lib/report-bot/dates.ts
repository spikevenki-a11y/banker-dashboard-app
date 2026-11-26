// Date understanding for the report parser. Co-operative FY = 1 April – 31 March.
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const DATE = String.raw`\d{1,2}-\d{1,2}-\d{4}` // after normalizeDates() every exact date looks like this

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
const MON = String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`
const monthIndex = (s: string) => MONTHS.findIndex(m => m.startsWith(s.slice(0, 3)))
const pad = (n: number | string) => String(n).padStart(2, "0")

/** Rewrite every exact date into DD-MM-YYYY so the rest of the parser sees one format. */
export function normalizeDates(q: string): string {
  return q
    // 2026-03-31 → 31-03-2026
    .replace(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g, (_, y, m, d) => `${pad(d)}-${pad(m)}-${y}`)
    // 31/03/2026, 31.3.26 → 31-03-2026
    .replace(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g, (_, d, m, y) => `${pad(d)}-${pad(m)}-${y.length === 2 ? "20" + y : y}`)
    // 31st march 2026, 31 mar 26
    .replace(new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)? (?:of )?${MON},? ('?\d{2}|\d{4})\b`, "g"), (_, d, mo, y) => `${pad(d)}-${pad(monthIndex(mo) + 1)}-${y.replace("'", "").length === 2 ? "20" + y.replace("'", "") : y}`)
    // march 31 2026, march 31st, 2026
    .replace(new RegExp(String.raw`\b${MON} (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})\b`, "g"), (_, mo, d, y) => `${pad(d)}-${pad(monthIndex(mo) + 1)}-${y}`)
}

export type DateResult = { from?: string; to?: string; used: string[]; kind?: "point" | "range" }

/** Find the report period in a normalized question. `today` = branch business date. */
export function parseDates(q: string, today: Date): DateResult {
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate()
  const dmy = (s: string) => { const [dd, mm, yy] = s.split("-"); return `${yy}-${mm}-${dd}` }
  const fyStart = (offset = 0) => (m >= 3 ? y : y - 1) + offset
  const used: string[] = []
  const r = (from: string | undefined, to: string | undefined, phrase: string, kind: "point" | "range" = "range"): DateResult => ({ from, to, used: [...used, phrase], kind })

  let mt: RegExpMatchArray | null
  // explicit ranges
  if ((mt = q.match(new RegExp(`(?:between|from) (${DATE}) (?:and|to|till|-) (${DATE})`)))) return r(dmy(mt[1]), dmy(mt[2]), mt[0])
  if ((mt = q.match(new RegExp(`(${DATE}) (?:to|till|-) (${DATE})`)))) return r(dmy(mt[1]), dmy(mt[2]), mt[0])
  // "as on / for / upto <date>" or a bare date → point in time
  if ((mt = q.match(new RegExp(`(?:as on|as of|as at|upto|up to|till|until|for|on|dated?|date) (${DATE})`)) ?? q.match(new RegExp(`(${DATE})`)))) {
    const onlyThatDay = /^on /.test(mt[0]) || /\b(on that day|that day)\b/.test(q)
    return onlyThatDay ? r(dmy(mt[1]), dmy(mt[1]), mt[0], "range") : r(undefined, dmy(mt[1]), mt[0], "point")
  }
  // financial year: "fy 2025-26", "2025-26", "2025-2026"
  if ((mt = q.match(/\b(?:fy|financial year|year)? ?(20\d{2}) ?[-/] ?(\d{2}|20\d{2})\b/))) {
    const s = Number(mt[1]); return r(`${s}-04-01`, `${s + 1}-03-31`, mt[0])
  }
  const has = (w: string) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(q)
  if (has("today") || has("indru") || has("இன்று")) return r(iso(today), iso(today), "today")
  if (has("yesterday") || has("netru")) { const x = iso(new Date(y, m, d - 1)); return r(x, x, "yesterday") }
  if ((mt = q.match(/\b(last|past|previous) (\d+) days?\b/))) return r(iso(new Date(y, m, d - Number(mt[2]) + 1)), iso(today), mt[0])
  if ((mt = q.match(/\bnext (\d+) days?\b/))) return r(iso(today), iso(new Date(y, m, d + Number(mt[1]))), mt[0])
  if ((mt = q.match(/\b(last|past|previous) (\d+) months?\b/))) return r(iso(new Date(y, m - Number(mt[2]), d + 1)), iso(today), mt[0])
  if ((mt = q.match(/\bnext (\d+) months?\b/))) return r(iso(today), iso(new Date(y, m + Number(mt[1]), d)), mt[0])
  const dow = (today.getDay() + 6) % 7 // Monday = 0
  if (has("this week")) return r(iso(new Date(y, m, d - dow)), iso(new Date(y, m, d - dow + 6)), "this week")
  if (has("last week") || has("previous week")) return r(iso(new Date(y, m, d - dow - 7)), iso(new Date(y, m, d - dow - 1)), "last week")
  if (has("next week")) return r(iso(new Date(y, m, d - dow + 7)), iso(new Date(y, m, d - dow + 13)), "next week")
  if (has("this month") || has("current month")) return r(iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0)), "this month")
  if (has("last month") || has("previous month")) return r(iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0)), "last month")
  if (has("next month")) return r(iso(new Date(y, m + 1, 1)), iso(new Date(y, m + 2, 0)), "next month")
  // FY quarters: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar
  const qStart = (k: number) => new Date(fyStart(), 3 + 3 * k, 1)
  const curQ = Math.floor(((m + 9) % 12) / 3)
  if (has("this quarter") || has("current quarter")) return r(iso(qStart(curQ)), iso(new Date(qStart(curQ).getFullYear(), qStart(curQ).getMonth() + 3, 0)), "this quarter")
  if (has("last quarter") || has("previous quarter")) { const s = new Date(qStart(curQ).getFullYear(), qStart(curQ).getMonth() - 3, 1); return r(iso(s), iso(new Date(s.getFullYear(), s.getMonth() + 3, 0)), "last quarter") }
  if ((mt = q.match(/\bq([1-4])\b/))) { const s = qStart(Number(mt[1]) - 1); return r(iso(s), iso(new Date(s.getFullYear(), s.getMonth() + 3, 0)), mt[0]) }
  if (has("this year") || has("current year") || has("this fy") || has("current fy") || has("ytd")) return r(`${fyStart()}-04-01`, `${fyStart() + 1}-03-31`, "this year")
  if (has("last year") || has("previous year") || has("last fy") || has("previous fy")) return r(`${fyStart(-1)}-04-01`, `${fyStart(-1) + 1}-03-31`, "last year")
  if (has("next year")) return r(`${fyStart(1)}-04-01`, `${fyStart(1) + 1}-03-31`, "next year")
  if ((mt = q.match(/\b(?:calendar year|year) (20\d{2})\b/))) return r(`${mt[1]}-01-01`, `${mt[1]}-12-31`, mt[0])
  // a month name: "march", "march 2026", "upto march 2026"
  if ((mt = q.match(new RegExp(String.raw`\b(upto |up to |till |as on |as of |end of )?${MON}\b(?: (20\d{2}))?`)))) {
    const mi = monthIndex(mt[2])
    const yr = mt[3] ? Number(mt[3]) : mi > m ? y - 1 : y
    const end = iso(new Date(yr, mi + 1, 0))
    return mt[1] ? r(undefined, end, mt[0], "point") : r(iso(new Date(yr, mi, 1)), end, mt[0])
  }
  return { used }
}
