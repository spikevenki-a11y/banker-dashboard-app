// Shapes shared by the Report Bot page and its components.
// They mirror the response of POST /api/report-chat.

export type ReportHeader = { key: string; label: string; type: string }

export type ReportResult = {
  headers: ReportHeader[]
  rows: Record<string, unknown>[]
  totals: Record<string, number>
  rowCount: number
}

export type ChatMessage = {
  id: string
  role: "user" | "bot"
  text: string
  /** Present when the bot ran a report */
  result?: ReportResult
  /** The bot could not answer (network / server error) */
  error?: boolean
  at: Date
}
