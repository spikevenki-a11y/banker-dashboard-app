// Turns a ReportSpec into ONE parameterized SELECT. Every identifier comes from the catalog;
// user values only ever travel as $n parameters.
import { getDataset, type Field } from "./catalog"
import type { ReportSpec } from "./spec"

const MAX_ROWS = 5000
const OPS = new Set(["=", "!=", ">", "<", ">=", "<=", "ILIKE", "NOT ILIKE", "BETWEEN"])
const ISO = /^\d{4}-\d{2}-\d{2}$/

export type BuiltQuery = { sql: string; params: unknown[]; headers: { key: string; label: string; type: string }[] }

export function buildSQL(spec: ReportSpec, branchIds: (number | string)[]): BuiltQuery {
  if (!branchIds.length) throw new Error("No branch in session")
  const ds = getDataset(spec.dataset)
  const F = (k: string): Field => {
    const f = ds.fields.find(x => x.key === k)
    if (!f) throw new Error(`Field "${k}" is not available in ${ds.label}`)
    return f
  }

  const params: unknown[] = [branchIds.map(Number)]
  const p = (v: unknown) => { params.push(v); return `$${params.length}` }

  if (spec.to && !ISO.test(spec.to)) throw new Error("Bad to date")
  if (spec.from && !ISO.test(spec.from)) throw new Error("Bad from date")
  // {{AS_ON}} = report date (default today), {{FROM}} = period start (default: beginning of time)
  let from = ds.from
  if (from.includes("{{AS_ON}}")) { const ph = `${p(spec.to ?? new Date().toISOString().slice(0, 10))}::date`; from = from.replaceAll("{{AS_ON}}", ph) }
  if (from.includes("{{FROM}}")) { const ph = `${p(spec.from ?? "1900-01-01")}::date`; from = from.replaceAll("{{FROM}}", ph) }

  const grouped = spec.groupBy.length > 0 || !!spec.summary
  const groupFields = spec.groupBy.map(F)
  if (groupFields.some(f => f.aggregate)) throw new Error("Cannot group by an amount column")

  // ---------- SELECT ----------
  let colFields: Field[]
  if (grouped) {
    colFields = (spec.columns.length ? spec.columns : [ds.defaultMeasure]).map(F).filter(f => f.aggregate)
    if (!colFields.length) colFields = [F(ds.defaultMeasure)]
    if (!colFields.some(f => f.aggregate === "COUNT")) colFields.push(F("count")) // always show count when grouping
  } else {
    // detail listing = the dataset's standard columns + whatever the user asked for
    // ("as on" balance replaces the current-balance column instead of sitting next to it)
    // overdue comes from today's schedule status, so it is meaningless in a past-date report
    const asOnReport = spec.columns.includes("outstanding_as_on")
    const base = ds.defaultColumns.filter(k => !(asOnReport && (k === "outstanding" || k === "overdue_amount")))
    const keys = Array.from(new Set([...base, ...spec.columns]))
    colFields = keys.map(F).filter(f => f.aggregate !== "COUNT")
  }

  const aggExpr = (f: Field) => {
    if (f.aggregate === "COUNT") return f.distinct ? `COUNT(DISTINCT ${f.sql})` : `COUNT(${f.sql})`
    if (f.aggregate === "AVG") return `ROUND(AVG(${f.sql})::numeric, 2)`
    return `${f.aggregate}(${f.sql})`
  }

  // dates leave the DB as plain 'YYYY-MM-DD' strings (no timezone shifts in JSON)
  const show = (f: Field, expr: string) => (f.type === "date" ? `TO_CHAR(${expr}, 'YYYY-MM-DD')` : expr)
  const select = [
    ...groupFields.map(f => `${show(f, f.sql)} AS "${f.key}"`),
    ...colFields.map(f => `${grouped ? aggExpr(f) : show(f, f.sql)} AS "${f.key}"`),
  ]

  // ---------- WHERE / HAVING ----------
  const where = [`${ds.branchColumn} = ANY($1::bigint[])`, ...(ds.baseWhere ?? [])]
  const having: string[] = []

  for (const flt of spec.filters) {
    if (!OPS.has(flt.op)) throw new Error(`Operator not allowed: ${flt.op}`)
    const f = F(flt.field)
    if (f.aggregate === "COUNT") {
      // "villages with more than 50 loans" — a count can only be compared per group
      if (!grouped) throw new Error("A count filter needs a grouped report (e.g. village wise)")
      flt.scope = "group"
    }
    const cast = f.type === "number" ? "::numeric" : f.type === "date" ? "::date" : "::text"
    const lhs = f.type === "text" ? `(${f.sql})::text` : f.aggregate === "COUNT" ? aggExpr(f) : f.sql
    let cond: string
    if (flt.op === "BETWEEN") cond = `${lhs} BETWEEN ${p(flt.value)}${cast} AND ${p(flt.value2)}${cast}`
    else if (flt.op === "ILIKE") cond = `${lhs} ILIKE ${p(String(flt.value))}`
    else if (flt.op === "NOT ILIKE") cond = `COALESCE(${lhs}, '') NOT ILIKE ${p(String(flt.value))}`
    else if (flt.op === "!=" && f.type === "text") cond = `COALESCE(UPPER(${lhs}), '') <> UPPER(${p(String(flt.value))})`
    else if (f.type === "text") cond = `UPPER(${lhs}) ${flt.op} UPPER(${p(String(flt.value))})`
    else cond = `${lhs} ${flt.op} ${p(flt.value)}${cast}`

    // scope "group" → filter on the group total ("villages with total overdue above 10 lakh")
    if (grouped && f.aggregate && flt.scope === "group") having.push(f.aggregate === "COUNT" ? cond : cond.replace(lhs, aggExpr(f)))
    else where.push(cond)
  }

  if (ds.dateMode !== "param") {
    const dateField = F(spec.dateField ?? ds.dateField)
    if (dateField.type !== "date") throw new Error("Date range must use a date field")
    if (spec.from) where.push(`${dateField.sql} >= ${p(spec.from)}::date`)
    if (spec.to) where.push(`${dateField.sql} <= ${p(spec.to)}::date`)
  }

  // ---------- assemble ----------
  let sql = `SELECT ${select.join(",\n       ")}\nFROM ${from}\nWHERE ${where.join("\n  AND ")}`
  if (groupFields.length) sql += `\nGROUP BY ${groupFields.map(f => f.sql).join(", ")}`
  if (having.length) sql += `\nHAVING ${having.join(" AND ")}`

  const shown = [...groupFields, ...colFields]
  if (spec.sort) {
    const sf = shown.find(f => f.key === spec.sort!.field)
    if (sf) sql += `\nORDER BY "${sf.key}" ${spec.sort.dir === "ASC" ? "ASC" : "DESC"} NULLS LAST`
  } else if (groupFields.length) {
    sql += `\nORDER BY ${groupFields.map(f => `"${f.key}"`).join(", ")}`
  }
  sql += `\nLIMIT ${Math.max(1, Math.min(Number(spec.limit) || MAX_ROWS, MAX_ROWS))}`

  return {
    sql,
    params,
    headers: shown.map(f => ({ key: f.key, label: f.label, type: f.type })),
  }
}
