// Phrases the bank teaches the report bot (table report_bot_phrases, migration 088).
//
//   kind = 'rewrite'  phrase → rewrite_to        "kcc" → "crop loan",  "nagai kadan" → "gold loan"
//   kind = 'synonym'  phrase → dataset [+ field]  "arrear list" → loans,  "bal" → loans.outstanding
//   kind = 'value'    phrase → dataset.field op value   "big loans" → loans.outstanding > 500000
//
// Rows with branch_id NULL apply to every branch; a branch's own rows apply only there.
import type { Pool } from "pg"
import { CATALOG, getDataset, type ValueAlias } from "./catalog"
import type { Teach } from "./parser"

export type PhraseRow = {
  id?: number
  branch_id?: number | null
  phrase: string
  kind: "rewrite" | "synonym" | "value"
  rewrite_to?: string | null
  dataset?: string | null
  field?: string | null
  op?: string | null
  value?: string | null
}

const cache = new Map<string, { at: number; teach: Teach }>()

export function clearTeachCache() { cache.clear() }

export async function loadTeach(pool: Pool, branchId: string | number): Promise<Teach> {
  const key = String(branchId)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.teach
  let rows: PhraseRow[] = []
  try {
    rows = (await pool.query(
      `SELECT phrase, kind, rewrite_to, dataset, field, op, value FROM report_bot_phrases
        WHERE is_active AND (branch_id IS NULL OR branch_id = $1) ORDER BY length(phrase) DESC`, [branchId])).rows
  } catch { /* table not created yet → nothing taught */ }
  const teach: Teach = { rewrites: [], aliases: {}, synonyms: [] }
  for (const r of rows) {
    if (r.kind === "rewrite" && r.rewrite_to) teach.rewrites!.push({ from: r.phrase, to: r.rewrite_to })
    else if (r.kind === "synonym" && r.dataset) teach.synonyms!.push({ dataset: r.dataset, field: r.field ?? undefined, phrase: r.phrase })
    else if (r.kind === "value" && r.dataset && r.field && r.op && r.value != null) {
      const a: ValueAlias = { dataset: [r.dataset], field: r.field, op: r.op as ValueAlias["op"], value: r.value }
      ;(teach.aliases![r.phrase.toLowerCase()] ??= []).push(a)
    }
  }
  cache.set(key, { at: Date.now(), teach })
  return teach
}

/** Validate a phrase before saving, so a bad row can never break parsing. Returns an error message or null. */
export function validatePhrase(p: PhraseRow): string | null {
  const phrase = (p.phrase ?? "").trim()
  if (phrase.length < 2 || phrase.length > 80) return "Phrase must be 2–80 characters"
  if (p.kind === "rewrite") return p.rewrite_to && p.rewrite_to.trim().length > 0 ? null : "Rewrite needs the text to replace it with"
  if (!p.dataset || !CATALOG.some(d => d.key === p.dataset)) return `Unknown report: ${p.dataset}`
  const ds = getDataset(p.dataset)
  if (p.field && !ds.fields.some(f => f.key === p.field)) return `Field ${p.field} is not in ${ds.label}`
  if (p.kind === "value") {
    if (!p.field) return "Value phrases need a field"
    if (!["=", "!=", ">", "<", ">=", "<=", "ILIKE", "NOT ILIKE"].includes(p.op ?? "")) return "Operator must be one of = != > < >= <= ILIKE NOT ILIKE"
    if (p.value == null || String(p.value).length === 0) return "Value phrases need a value"
  }
  return null
}

/** For the teach screen's dropdowns. */
export function catalogOutline() {
  return CATALOG.map(d => ({
    key: d.key, label: d.label,
    fields: d.fields.filter(f => f.key !== "none").map(f => ({ key: f.key, label: f.label, type: f.type, amount: !!f.aggregate })),
  }))
}
