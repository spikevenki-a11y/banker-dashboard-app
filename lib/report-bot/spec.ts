// The single contract shared by the chat parser, the manual report builder UI and saved reports.
export type FilterOp = "=" | "!=" | ">" | "<" | ">=" | "<=" | "ILIKE" | "NOT ILIKE" | "BETWEEN"

export type Filter = {
  field: string
  op: FilterOp
  value: string | number
  value2?: string | number // BETWEEN upper bound
  /** "row" (default): each record must match. "group": the group total must match (HAVING) */
  scope?: "row" | "group"
}

export type ReportSpec = {
  dataset: string
  /** dimension keys → GROUP BY (empty = detail listing) */
  groupBy: string[]
  /** true = one totals row (aggregate without GROUP BY) */
  summary?: boolean
  /** measure keys (grouped) or any field keys (detail listing) */
  columns: string[]
  filters: Filter[]
  /** which date field the date range applies to (default: dataset.dateField) */
  dateField?: string
  from?: string // YYYY-MM-DD
  to?: string   // YYYY-MM-DD  ("as on" = to only)
  sort?: { field: string; dir: "ASC" | "DESC" }
  limit?: number
}
