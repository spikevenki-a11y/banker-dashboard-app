// Shapes returned by GET /api/report-chat/teach

export type PhraseKind = "rewrite" | "synonym" | "value"

export type TaughtPhrase = {
  id: number
  branch_id: number | null
  phrase: string
  kind: PhraseKind
  rewrite_to: string | null
  dataset: string | null
  field: string | null
  op: string | null
  value: string | null
  created_at: string
}

export type NeedsAttention = {
  question: string
  status: string
  ignored_words: string[] | null
  times: string | number
  last_asked: string
}

export type CatalogField = { key: string; label: string; type: string; amount: boolean }
export type CatalogDataset = { key: string; label: string; fields: CatalogField[] }

export type NewPhrase = {
  phrase: string
  kind: PhraseKind
  rewrite_to?: string
  dataset?: string
  field?: string
  op?: string
  value?: string
  allBranches?: boolean
}

export const KIND_INFO: Record<PhraseKind, { label: string; help: string; example: string }> = {
  rewrite: {
    label: "Rewrite",
    help: "Replace a word or local term with words the bot already knows.",
    example: "\"nagai kadan\" → \"gold loan\"",
  },
  synonym: {
    label: "Synonym",
    help: "Another name for a report, or for one of its columns.",
    example: "\"arrear list\" → Loans",
  },
  value: {
    label: "Filter",
    help: "A phrase that means a condition on a column.",
    example: "\"defaulters\" → Loans · Overdue Amount > 0",
  },
}

export const OPERATORS = [
  { value: "=", label: "equals (=)" },
  { value: "!=", label: "not equal (≠)" },
  { value: ">", label: "greater than (>)" },
  { value: ">=", label: "at least (≥)" },
  { value: "<", label: "less than (<)" },
  { value: "<=", label: "at most (≤)" },
  { value: "ILIKE", label: "contains (use % as wildcard)" },
  { value: "NOT ILIKE", label: "does not contain" },
]
