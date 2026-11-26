// Human-readable "Understood as …" line and chips for the UI. Built only from the spec + catalog.
import { getDataset } from "./catalog"
import type { ReportSpec } from "./spec"

const fmtDate = (d?: string) => (d ? d.split("-").reverse().join("-") : "")
const fmtNum = (key: string, v: unknown) => {
  const n = Number(v)
  if (/weight/.test(key)) return `${n} g`
  if (/days/.test(key)) return `${n} days`
  if (/rate|karat/.test(key)) return String(n)
  if (/count|items|quantity|installment_no/.test(key)) return String(n)
  return "₹" + n.toLocaleString("en-IN")
}
const OP_TEXT: Record<string, string> = { "=": "is", "!=": "is not", ">": ">", "<": "<", ">=": "≥", "<=": "≤", ILIKE: "contains", "NOT ILIKE": "does not contain", BETWEEN: "between" }

export type Chip = { kind: "dataset" | "group" | "column" | "filter" | "date" | "sort"; label: string; index?: number }

export function describe(spec: ReportSpec): { text: string; chips: Chip[] } {
  const ds = getDataset(spec.dataset)
  const label = (k: string) => ds.fields.find(f => f.key === k)?.label ?? k
  const chips: Chip[] = [{ kind: "dataset", label: ds.label }]
  spec.groupBy.forEach(g => chips.push({ kind: "group", label: `${label(g)}-wise` }))
  if (spec.summary) chips.push({ kind: "group", label: "Totals only" })
  spec.filters.forEach((f, i) => {
    const fd = ds.fields.find(x => x.key === f.field)
    const val = (v: unknown) => (fd?.type === "number" ? fmtNum(f.field, v) : fd?.type === "date" ? fmtDate(String(v)) : String(v).replace(/%/g, ""))
    const starts = /ILIKE/.test(f.op) && /^[^%].*%$/.test(String(f.value))
    const text = starts ? `${label(f.field)} ${f.op === "ILIKE" ? "starts with" : "does not start with"} ${val(f.value)}` : f.op === "BETWEEN" ? `${label(f.field)} ${val(f.value)} – ${val(f.value2)}` : `${label(f.field)} ${OP_TEXT[f.op] ?? f.op} ${val(f.value)}`
    chips.push({ kind: "filter", label: f.scope === "group" ? `${text} (group total)` : text, index: i })
  })
  const dateLabel = spec.dateField ? label(spec.dateField) : ""
  if (spec.from && spec.to) chips.push({ kind: "date", label: `${dateLabel ? dateLabel + " " : ""}${fmtDate(spec.from)} to ${fmtDate(spec.to)}` })
  else if (spec.to) chips.push({ kind: "date", label: `${dateLabel ? dateLabel + " up to" : "As on"} ${fmtDate(spec.to)}` })
  spec.columns.forEach(c => chips.push({ kind: "column", label: label(c) }))
  if (spec.sort) chips.push({ kind: "sort", label: `${spec.sort.dir === "DESC" ? "Highest" : "Lowest"} ${label(spec.sort.field)}${spec.limit ? ` (top ${spec.limit})` : ""}` })
  const text = chips.filter(c => c.kind !== "column").map(c => c.label).join(" · ")
  return { text, chips }
}
