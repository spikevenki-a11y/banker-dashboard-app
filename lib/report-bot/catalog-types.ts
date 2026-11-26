// Shared catalog types
export type FieldType = "text" | "number" | "date"
export type Agg = "SUM" | "COUNT" | "AVG" | "MAX" | "MIN"

export type Field = {
  key: string
  sql: string
  label: string
  type: FieldType
  synonyms: string[]
  /** measures only: how to aggregate when grouping */
  aggregate?: Agg
  /** COUNT(DISTINCT …) instead of COUNT(…) */
  distinct?: boolean
}

export type Dataset = {
  key: string
  label: string
  synonyms: string[]
  from: string
  /** column holding branch_id of the base table */
  branchColumn: string
  /** FROM may contain {{AS_ON}} — replaced by the report date parameter */
  /** always-on conditions (e.g. passed vouchers only) */
  baseWhere?: string[]
  /** "row" (default): from/to filter rows on dateField. "param": dates only feed {{FROM}} / {{AS_ON}} (trial balance, assets) */
  dateMode?: "row" | "param"
  /** default date field key for "as on" / "between" */
  dateField: string
  /** columns shown for a plain listing ("list jewel loans") */
  defaultColumns: string[]
  /** default measure when the user names none */
  defaultMeasure: string
  fields: Field[]
}

