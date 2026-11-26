// Rule-based parser: free text (English / Tanglish / Tamil keywords) → ReportSpec.
// No AI. Three promises:
//   1. Typos and loose wording are corrected (and the corrections are reported).
//   2. Every word is either used or listed in `ignored` — nothing is dropped silently.
//   3. Phrases taught by the bank (report_bot_phrases) are applied before parsing.
import { CATALOG, VALUE_ALIASES, type Dataset, type Field, type ValueAlias } from "./catalog"
import { normalizeDates, parseDates, iso, DATE } from "./dates"
import type { Filter, ReportSpec } from "./spec"

/** Distinct values loaded from the DB for the user's branch, e.g. { scheme: ["JEWEL LOAN", ...], village: [...] } */
export type KnownValues = Record<string, string[]>

/** Phrases taught through the admin screen (see teach.ts). */
export type Teach = {
  rewrites?: { from: string; to: string }[]                    // "kcc" → "crop loan"
  aliases?: Record<string, ValueAlias[]>                         // "nagai" → loans.gold_loan = YES
  synonyms?: { dataset: string; field?: string; phrase: string }[] // extra words for a dataset or a field
}

export type ParseOk = {
  spec: ReportSpec
  dataset: string
  /** words in the question that did not affect the report */
  ignored: string[]
  /** spelling fixes applied, e.g. [{ from: "outstaning", to: "outstanding" }] */
  corrections: { from: string; to: string }[]
  /** other reports the question could also mean */
  alternatives: string[]
}
export type ParseResult = ParseOk | { ask: string; ignored?: string[]; corrections?: { from: string; to: string }[] }

// ---------------------------------------------------------------------------
// vocabulary & normalization
// ---------------------------------------------------------------------------
const STOP = new Set(("all a an the of for in on at to by with and or is are was were be me my our we i you please pls kindly show give get list " +
  "display print report reports detail details statement register want need tell find what which who whose whom where how much " +
  "there their its this that these those from as per column columns field fields wise along including include also only just " +
  "data info information view see about every each any some value values amount amounts no number rs inr rupees " +
  "account accounts holder holders customer customers person persons people entries entry records record items item " +
  "whole complete full entire overall current present existing available running wise list lists register").split(" "))

const PHRASE_FIXES: [RegExp, string][] = [
  [/\b(less|lesser|more|greater|other) then\b/g, "$1 than"],
  [/\b(colum|coulmn|coloumn|colunm|colmn|clumn)s?\b/g, "column"],
  [/\bw(?:ize|ice|se)\b|\bvise\b/g, "wise"],
  [/\b(\w+)wise\b/g, "$1 wise"],               // "branchwise" → "branch wise"
  [/\ba\/c\b|\bac\b|\bacct\b|\bacc\b/g, "account"],
  [/\bo\/s\b|\bos\b/g, "outstanding"],
  [/\bamt\b|\bamnt\b/g, "amount"],
  [/\bmem\b|\bmembr\b/g, "member"],
  [/\bno\.|\bnum\b|\bnbr\b/g, "no"],
  [/\bgms?\b|\bgrams?\b/g, "g"],
  [/\b(\d+(?:\.\d+)?) ?g\b/g, "$1 g"],
  [/\blacs?\b|\blakhs\b/g, "lakh"],
  [/\bcrores\b/g, "crore"],
  [/\bsb\b/g, "savings"],
  [/\bjl\b/g, "jewel loan"],
  [/\bnagai\b|\bnakai\b|\bnaga\b/g, "jewel"],
  [/\bkadan\b|\bkadhan\b/g, "loan"],
  [/\bi want\b|\bcan you\b|\bcould you\b/g, " "],
]

let VOCAB: Set<string> | undefined
function vocab(extra: string[] = []): Set<string> {
  if (!VOCAB) {
    VOCAB = new Set<string>()
    const add = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2).forEach(w => VOCAB!.add(w))
    for (const ds of CATALOG) { ds.synonyms.forEach(add); add(ds.label); for (const f of ds.fields) { f.synonyms.forEach(add); add(f.label) } }
    Object.keys(VALUE_ALIASES).forEach(add)
    STOP.forEach(add)
    ;("today yesterday tomorrow week month months year years quarter days day last next previous this current between upto till until above below " +
      "over under less more than greater lesser equal least most exceeding within top bottom highest lowest largest smallest maximum minimum total sum count " +
      "summary lakh crore thousand financial calendar january february march april may june july august september october november december " +
      "jan feb mar apr jun jul aug sep sept oct nov dec end dated date wise monthly daily " +
      "recovered collected opened closed joined paid unpaid marked sold matured maturing expired expiring released pledged " +
      "sanctioned disbursed received refunded withdrawn deposited transferred issued renewed allotted vacant pending " +
      "please kindly give show list details report statement").split(" ").forEach(add)
  }
  if (!extra.length) return VOCAB
  const v = new Set(VOCAB); extra.forEach(s => s.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2).forEach(w => v.add(w))); return v
}

function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      // transposition (outstnading → outstanding)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[j] = Math.min(dp[j], prev)
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Correct misspelt words against the report vocabulary. Only ASCII words ≥ 4 letters; ties are left alone. */
function fuzzyFix(q: string, v: Set<string>, corrections: { from: string; to: string }[]): string {
  return q.replace(/[a-z]{4,}/g, w => {
    if (v.has(w) || v.has(w.replace(/e?s$/, ""))) return w
    const max = w.length >= 8 ? 2 : 1
    let best = "", bestD = 9, tie = false
    for (const c of v) {
      if (Math.abs(c.length - w.length) > max) continue
      const dd = lev(w, c)
      if (dd < bestD) { best = c; bestD = dd; tie = false } else if (dd === bestD && c !== best) tie = true
    }
    if (bestD <= max && !tie) { corrections.push({ from: w, to: best }); return best }
    return w
  })
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
function has(q: string, word: string) {
  return new RegExp(`(^|[^a-z0-9\\u0B80-\\u0BFF])${esc(word.toLowerCase())}(e?s)?([^a-z0-9\\u0B80-\\u0BFF]|$)`, "i").test(q)
}

function amount(num: string, unit = ""): number {
  let n = parseFloat(num.replace(/,/g, ""))
  const u = unit.toLowerCase()
  if (/^(l|lakh)$/.test(u)) n *= 1e5
  else if (/^(cr|crore)$/.test(u)) n *= 1e7
  else if (/^(k|thousand)$/.test(u)) n *= 1e3
  return n
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
export function parseQuestion(text: string, known: KnownValues = {}, today = new Date(), teach: Teach = {}): ParseResult {
  const corrections: { from: string; to: string }[] = []
  const used: string[] = []
  const use = (phrase: string) => { used.push(phrase.toLowerCase()); return true }

  // ---- 1. normalize
  let q = " " + text.toLowerCase().replace(/[“”"'`]/g, "").replace(/\s+/g, " ").trim() + " "
  for (const r of teach.rewrites ?? []) q = q.replace(new RegExp(`(^|[^a-z0-9])${esc(r.from.toLowerCase())}(?=[^a-z0-9]|$)`, "g"), `$1${r.to.toLowerCase()}`)
  for (const [re, to] of PHRASE_FIXES) q = q.replace(re, to)
  q = normalizeDates(q)
  const knownWords = Object.values(known).flat()
  q = fuzzyFix(q, vocab([...knownWords, ...(teach.synonyms ?? []).map(s => s.phrase), ...Object.keys(teach.aliases ?? {})]), corrections)
  q = " " + q.replace(/\s+/g, " ").trim() + " "

  // effective synonyms (catalog + taught)
  const dsSyn = (ds: Dataset) => [...ds.synonyms, ...(teach.synonyms ?? []).filter(s => s.dataset === ds.key && !s.field).map(s => s.phrase.toLowerCase())]
  const fSyn = (ds: Dataset, f: Field) => [...f.synonyms, ...(teach.synonyms ?? []).filter(s => s.dataset === ds.key && s.field === f.key).map(s => s.phrase.toLowerCase())]
  const aliases: Record<string, ValueAlias[]> = { ...VALUE_ALIASES }
  for (const [w, rules] of Object.entries(teach.aliases ?? {})) aliases[w.toLowerCase()] = [...rules, ...(aliases[w.toLowerCase()] ?? [])]

  // ---- 2. dataset: longest specific synonym hits win; aliases and field words add a little
  //      ("member no 101" names a record, it doesn't choose the report)
  const qDs = q.replace(/\b(member|membership|account|loan|locker|voucher) no ?:? ?[a-z]*\d+\b/g, (_, w) => (w === "loan" || w === "locker" ? w : " "))
  // every report word found anywhere; a word inside a longer report word ("collection" inside "share collection") is shadowed
  const allHits = new Set(CATALOG.flatMap(ds => dsSyn(ds).filter(s => has(qDs, s))))
  const shadowed = (h: string) => [...allHits].some(o => o !== h && o.length > h.length && o.includes(h))
  const scored = CATALOG.map(ds => {
    // an alias that only exists for this report ("defaulters", "npa", "creditors") also identifies it — weighted lower
    const aliasHits = Object.entries(aliases).filter(([w, rules]) => rules.some(r => r.dataset?.includes(ds.key)) && has(qDs, w)).map(([w]) => w)
    const synHits = dsSyn(ds).filter(s => has(qDs, s))
    const hits = [...synHits, ...aliasHits]
    const own = hits.filter(h => !hits.some(o => o !== h && o.includes(h)))
    let score = own.reduce((sc, h) => sc + (shadowed(h) ? 0 : synHits.includes(h) ? h.length * 2 : h.length), 0)
    for (const f of ds.fields) if (fSyn(ds, f).some(s => s.length > 3 && has(qDs, s))) score += 1
    return { ds, score, hits: own }
  }).filter(x => x.hits.length).sort((a, b) => b.score - a.score)

  if (!scored.length) {
    return {
      ask: `I couldn't tell which report you need. I can report on: ${CATALOG.map(d => d.label).join("; ")}. ` +
        `Try "branch wise gold loan outstanding", "FD maturing next month" or "trial balance as on 31-03-2026".`,
      corrections,
    }
  }
  const ds = scored[0].ds
  scored[0].hits.forEach(use)
  // only offer an alternative that matched a word the winner did not ("loan" alone is shared by all loan reports)
  const alternatives = scored.slice(1)
    .filter(x => x.score >= scored[0].score * 0.8 && x.hits.some(h => !scored[0].hits.some(w => w.replace(/e?s$/, "") === h.replace(/e?s$/, ""))))
    .map(x => x.ds.label).slice(0, 3)

  const spec: ReportSpec = { dataset: ds.key, groupBy: [], columns: [], filters: [] }
  const dims = ds.fields.filter(f => !f.aggregate && f.key !== "none")

  // ---- 3. group by: "<x> wise", "by <x>", "<x>-wise", "month wise", "daily"
  for (const f of dims) {
    for (const s of fSyn(ds, f)) {
      const base = s.replace(/[ -]?wise$/, "")
      const pat = [`${base} wise`, `${base}-wise`, `by ${base}`, `per ${base}`, `group by ${base}`].find(p => has(q, p))
      if (pat && !spec.groupBy.includes(f.key)) { spec.groupBy.push(f.key); use(pat) }
    }
  }
  const monthKey = /matur/.test(q) && ds.fields.some(f => f.key === "maturity_month") ? "maturity_month" : "month"
  if ((has(q, "monthly") || has(q, "month wise") || has(q, "per month")) && ds.fields.some(f => f.key === monthKey)) {
    spec.groupBy = spec.groupBy.filter(g => !g.endsWith("month")); spec.groupBy.push(monthKey); use("monthly"); use("month wise"); use("per month")
  }
  if (spec.groupBy.includes("maturity_month")) spec.groupBy = spec.groupBy.filter(g => g !== "month")
  const dayKey = ds.fields.find(f => ["txn_date", "date"].includes(f.key))?.key
  if ((has(q, "daily") || has(q, "day wise") || has(q, "date wise")) && dayKey && !spec.groupBy.includes(dayKey)) { spec.groupBy.push(dayKey); use("daily"); use("day wise"); use("date wise") }

  // ---- 4. measures named (drop "overdue" when "overdue days" also matched, etc.)
  const matched = ds.fields.filter(f => f.aggregate).map(f => ({ f, hits: fSyn(ds, f).filter(s => has(q, s)) })).filter(x => x.hits.length)
  const kept = matched.filter(x => !matched.some(o => o !== x && o.hits.some(oh => x.hits.every(h => oh !== h && oh.includes(h)))))
  spec.columns = kept.map(x => x.f.key)
  matched.forEach(x => x.hits.forEach(use))

  // ---- 5. value filters: aliases (gold, npa, fd, closed, creditors …)
  for (const [word, rules] of Object.entries(aliases)) {
    if (!has(q, word)) continue
    for (const r of rules) {
      if (r.dataset && !r.dataset.includes(ds.key)) continue
      if (!ds.fields.some(f => f.key === r.field)) continue
      if (!spec.filters.some(x => x.field === r.field)) spec.filters.push({ field: r.field, op: r.op, value: r.value })
      use(word)
      break
    }
  }
  // "not closed", "except npa", "excluding dormant", "without lien"
  for (const f of spec.filters) {
    const word = Object.keys(aliases).find(w => aliases[w].some(r => r.field === f.field && r.value === f.value) && new RegExp(`\\b(not|non|except|excluding|other than|without) ${esc(w)}`).test(q))
    if (word) { f.op = f.op === "ILIKE" ? ("NOT ILIKE" as any) : "!="; use("not"); use("non"); use("except"); use("excluding"); use("without"); use("other than") }
  }
  // real values from the DB (scheme names, villages …), longest first
  for (const [field, values] of Object.entries(known)) {
    if (!ds.fields.some(f => f.key === field) || spec.groupBy.includes(field)) continue
    const v = [...values].sort((a, b) => b.length - a.length).find(v => v && v.length > 2 && has(q, v))
    if (v) {
      // an alias already covers it ("jewel loan" scheme vs gold_loan flag) → keep the alias only
      const covered = spec.filters.some(x => ds.key === "loans" && x.field === "gold_loan") && /jewel|gold|நகை/i.test(v)
      if (!covered) { spec.filters = spec.filters.filter(x => x.field !== field); spec.filters.push({ field, op: "=", value: v }) }
      use(v)
    }
  }
  // "member no 101", "account no 5001", "loan no 77"
  for (const mt of q.matchAll(/\b(member|membership|account|loan|locker|voucher) no ?:? ?([a-z]*\d+)\b/g)) {
    const key = { member: "membership_no", membership: "membership_no", account: ds.fields.some(f => f.key === "account_no") ? "account_no" : "account_number", loan: "loan_no", locker: "locker_no", voucher: "voucher_no" }[mt[1]]!
    if (ds.fields.some(f => f.key === key)) { spec.filters.push({ field: key, op: "=", value: mt[2] }); use(mt[0]) }
  }

  // ---- 6. numeric conditions, each tied to the amount named just before it
  const U = String.raw`(lakh|l|crore|cr|k|thousand|g|days?|months?|%)?`
  const CMP = String.raw`(greater than or equal to|less than or equal to|not more than|not less than|at least|at most|minimum of|maximum of|upto|up to|above|over|more than|greater than|exceeding|exceeds|>=|<=|>|<|=|below|under|less than|lesser than|within|equal to|equals|exactly)`
  const NUM = String.raw`(?:rs\.? ?|₹ ?)?([\d.,]*\d) ?${U}(?![-\d])`
  const mainAmt = spec.columns.find(k => ds.fields.find(f => f.key === k)?.aggregate === "SUM") ?? ds.defaultMeasure
  const scope = /total (above|over|more th|greater th|exceeding|below|under|less th|between|upto)/.test(q) ? "group" as const : "row" as const
  if (scope === "group") use("total")
  const measureSyn = ds.fields.filter(f => f.type === "number").flatMap(f => fSyn(ds, f).map(syn => ({ f, syn: syn.toLowerCase() })))
  const fieldBefore = (pos: number, unit: string) => {
    if (/^d/.test(unit) && ds.fields.some(f => f.key === "overdue_days")) return "overdue_days"
    if (unit === "%") return ds.fields.find(f => ["interest_rate", "rate"].includes(f.key))?.key ?? mainAmt
    const head = q.slice(0, pos)
    let best: { key: string; end: number; len: number } | undefined
    for (const { f, syn } of measureSyn) {
      const at = head.lastIndexOf(syn)
      if (at < 0 || !has(head.slice(Math.max(0, at - 1), at + syn.length + 3), syn)) continue
      const end = at + syn.length
      if (!best || end > best.end || (end === best.end && syn.length > best.len)) best = { key: f.key, end, len: syn.length }
    }
    if (unit === "g" && (!best || !/weight/.test(best.key))) return ds.fields.find(f => f.key === "gross_weight" || f.key === "net_weight")?.key ?? best?.key ?? mainAmt
    return best?.key ?? mainAmt
  }
  const opOf = (w: string): Filter["op"] =>
    /greater than or equal|not less|at least|minimum of/.test(w) || w === ">=" ? ">=" :
    /less than or equal|not more|at most|maximum of|upto|up to|within/.test(w) || w === "<=" ? "<=" :
    /equal|exactly|^=$/.test(w) ? "=" :
    /above|over|more|greater|exceed|>/.test(w) ? ">" : "<"
  const toValue = (num: string, unit = "") => (/^(g|days?|months?|%)$/.test(unit) ? parseFloat(num.replace(/,/g, "")) : amount(num, unit))

  let rest = q.replace(new RegExp(DATE, "g"), m => " ".repeat(m.length)) // dates are not amounts
  for (const mt of rest.matchAll(new RegExp(String.raw`between ${NUM} (?:and|to|-) ${NUM}`, "g"))) {
    const field = fieldBefore(mt.index!, mt[2] || mt[4] || "")
    // a unit written once applies to both ends only for g / days / % ("between 10 and 20 g"), never for lakh
    const shared = (u?: string) => (u && /^(g|days?|%)$/.test(u) ? u : "")
    spec.filters.push({ field, op: "BETWEEN", value: toValue(mt[1], mt[2] || shared(mt[4])), value2: toValue(mt[3], mt[4] || shared(mt[2])), scope }); use(mt[0])
    rest = rest.replace(mt[0], " ".repeat(mt[0].length))
  }
  for (const mt of rest.matchAll(new RegExp(String.raw`${CMP} ${NUM}`, "g"))) {
    const unit = mt[3] ?? ""
    if (/^months?$/.test(unit)) continue // "next 3 months" is a date phrase
    const field = fieldBefore(mt.index!, unit)
    spec.filters.push({ field, op: opOf(mt[1]), value: toValue(mt[2], unit), scope: field === "overdue_days" ? "row" : scope }); use(mt[0])
  }
  for (const f of spec.filters) {
    const fd = ds.fields.find(x => x.key === f.field)
    if (fd?.type === "number" && fd.aggregate !== "COUNT" && !spec.columns.includes(f.field)) spec.columns.push(f.field)
  }
  // "overdue loans" with no amount → only loans that actually have overdue
  if (ds.key === "loans" && (has(q, "overdue") || has(q, "arrear")) && !spec.filters.some(f => f.field === "overdue_days" || f.field === "overdue_amount")) {
    spec.filters.push({ field: "overdue_amount", op: ">", value: 0 })
    if (!spec.columns.includes("overdue_amount")) spec.columns.push("overdue_amount")
  }
  // "pending dues", "unpaid instalments"
  if (["loan_demand", "rd_installments"].includes(ds.key) && /\b(pending|unpaid|not paid|defaulters?|balance due)\b/.test(q)) {
    const field = ds.key === "loan_demand" ? "payment_status" : "paid_status"
    if (!spec.filters.some(f => f.field === field)) spec.filters.push(ds.key === "loan_demand" ? { field, op: "!=", value: "PAID" } : { field, op: "=", value: "PENDING" })
    ;["pending", "unpaid", "not paid", "defaulter", "defaulters", "balance due", "due", "dues"].forEach(use)
  }
  if (["loan_demand", "rd_installments"].includes(ds.key) && /\bpaid\b/.test(q) && !/\b(unpaid|not paid)\b/.test(q) && !spec.filters.some(f => /status/.test(f.field))) {
    spec.filters.push({ field: ds.key === "loan_demand" ? "payment_status" : "paid_status", op: "=", value: "PAID" }); use("paid")
  }
  if (ds.key === "lockers" && /\b(vacant|available|free|empty)\b/.test(q)) { spec.filters.push({ field: "locker_status", op: "=", value: "AVAILABLE" }); use("vacant"); use("available"); use("free"); use("empty") }

  // ---- 7. dates
  if (/matur/.test(q) && ds.fields.some(f => f.key === "maturity_date")) { spec.dateField = "maturity_date"; use("maturity"); use("maturing"); use("matured") }
  if (/\bexpir|renewal/.test(q) && ds.fields.some(f => f.key === "expiry_date")) { spec.dateField = "expiry_date"; ["expiry", "expiring", "expired", "expires", "renewal"].forEach(use) }
  if (/\b(opened|opening|new accounts?|joined|admitted)\b/.test(q)) {
    const k = ds.fields.find(f => ["opening_date", "open_date", "join_date", "opened_date"].includes(f.key))?.key
    if (k) { spec.dateField = k; ["opened", "opening", "new", "account", "accounts", "joined", "admitted"].forEach(use) }
  }
  if (/\bclosed (on|during|in|between|this|last)\b/.test(q)) { const k = ds.fields.find(f => /clos/.test(f.key) && f.type === "date")?.key; if (k) { spec.dateField = k; use("closed") } }
  const dr = parseDates(q, today)
  dr.used.forEach(use)
  // the date column the period applies to was named too ("due this month", "maturing next month")
  if (dr.from || dr.to) { const df = ds.fields.find(f => f.key === (spec.dateField ?? ds.dateField)); if (df) fSyn(ds, df).filter(s => has(q, s)).forEach(use) }
  spec.from = dr.from; spec.to = dr.to
  if (!spec.from) delete spec.from
  if (!spec.to) delete spec.to

  // balances (loans/members/savings/deposits/ledgers): a period means "as on its end", unless the question is about events in it
  const isEvent = !!spec.dateField || /join|admit|open|sanction|disburs|closed|new |matur/.test(q)
  if (["loans", "members", "savings", "deposits", "ledgers", "lockers", "securities"].includes(ds.key) && dr.kind !== "point" && !isEvent && spec.from && spec.to && spec.from !== spec.to) delete spec.from
  // trial balance: a point date means "from beginning to that date" (opening = 0) — use FY start as period start
  if (ds.key === "gl_balances" && spec.to && !spec.from) {
    const t = new Date(spec.to); const fy = t.getMonth() >= 3 ? t.getFullYear() : t.getFullYear() - 1
    spec.from = `${fy}-04-01`
  }

  // Loans "as on <past date>": loan_outstanding is today's balance → ledger-rebuilt balance instead
  if (ds.key === "loans" && spec.to && spec.to < iso(today) && !spec.from) {
    spec.columns = spec.columns.length ? spec.columns.map(c => (c === "outstanding" ? "outstanding_as_on" : c)) : ["outstanding_as_on"]
    if (!spec.groupBy.length && !spec.summary) spec.columns = Array.from(new Set(["outstanding_as_on", ...spec.columns]))
    if (!spec.filters.some(f => f.field === "outstanding_as_on")) spec.filters.push({ field: "outstanding_as_on", op: ">", value: 0 })
  }

  // ---- 8. top N / highest / lowest
  const top = q.match(/\btop (\d+)\b/) ?? q.match(/\b(\d+) (?:highest|largest|biggest)\b/)
  const bottom = q.match(/\b(?:bottom|lowest|least) (\d+)\b/)
  const sortField = spec.columns[0] ?? ds.defaultMeasure
  if (top || /\b(highest|largest|maximum|biggest|descending|desc)\b/.test(q)) { spec.sort = { field: sortField, dir: "DESC" }; spec.limit = top ? Number(top[1]) : 10; use(top?.[0] ?? "highest"); ["largest", "maximum", "biggest", "descending", "desc"].forEach(use) }
  else if (bottom || /\b(lowest|smallest|minimum|ascending|asc)\b/.test(q)) { spec.sort = { field: sortField, dir: "ASC" }; spec.limit = Number(bottom?.[1] ?? 10); use(bottom?.[0] ?? "lowest"); ["smallest", "minimum", "ascending", "asc"].forEach(use) }
  if (/\b(sort|order) by\b/.test(q)) {
    const f = ds.fields.find(f => fSyn(ds, f).some(s => has(q, `by ${s}`)))
    if (f) { spec.sort = { field: f.key, dir: /\b(desc|descending|high to low)\b/.test(q) ? "DESC" : "ASC" }; use("sort by"); use("order by"); fSyn(ds, f).forEach(s => use(`by ${s}`)) }
  }

  // ---- 9. summary vs listing, extra columns
  const summaryWords = /\b(total|grand total|sum|how many|number of|count|summary|abstract|consolidated)\b|எத்தனை|ethanai|mothham|மொத்தம்/
  if (!spec.groupBy.length && summaryWords.test(q) && !top && !bottom) { spec.summary = true; ["total", "grand total", "sum", "how many", "number of", "count", "summary", "abstract", "consolidated", "எத்தனை", "ethanai", "mothham", "மொத்தம்"].forEach(use) }
  // "… with mobile and village", "include father name" → add those columns to a listing
  if (!spec.groupBy.length && !spec.summary) {
    const tail = q.match(/\b(?:with|include|including|along with|show|and)\b(.*)$/)?.[1] ?? ""
    for (const f of dims) {
      const s = fSyn(ds, f).find(s => s.length > 2 && has(tail, s))
      if (s && !spec.columns.includes(f.key)) { spec.columns.push(f.key); use(s) }
    }
  }
  if ((spec.groupBy.length || spec.summary) && !spec.columns.length) spec.columns = [ds.defaultMeasure]
  // words that only describe the dataset ("loan", "deposit") were used to pick it
  dims.concat(ds.fields.filter(f => f.aggregate)).forEach(f => {
    if (spec.filters.some(x => x.field === f.key) || spec.groupBy.includes(f.key) || spec.columns.includes(f.key)) fSyn(ds, f).filter(s => has(q, s)).forEach(use)
  })
  dsSyn(ds).filter(s => has(q, s)).forEach(use)

  // ---- 10. what was not understood
  const usedWords = new Set(used.flatMap(p => p.split(/[^a-z0-9஀-௿%₹]+/)).filter(Boolean))
  const ignored = Array.from(new Set(
    q.split(/[^a-z0-9஀-௿%₹.]+/).map(w => w.replace(/\.$/, "")).filter(w =>
      w && !STOP.has(w) && !usedWords.has(w) && !usedWords.has(w.replace(/e?s$/, "")) &&
      !/^[\d.,]+$/.test(w) && !/^\d{1,2}-\d{1,2}-\d{4}$/.test(w) && w.length > 1)
  ))

  return { spec, dataset: ds.label, ignored, corrections, alternatives }
}
