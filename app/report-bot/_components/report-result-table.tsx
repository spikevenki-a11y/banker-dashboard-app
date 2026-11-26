"use client"

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatAmount, formatCount } from "@/lib/number-format"
import { formatDate } from "@/lib/date-format"
import { cn } from "@/lib/utils"
import type { ReportHeader, ReportResult } from "./types"

// Long reports stay readable in a chat bubble; the rest are summarised in the reply text.
const MAX_ROWS = 200

function formatCell(header: ReportHeader, value: unknown) {
  if (value === null || value === undefined || value === "") return "-"
  if (header.type === "number") return header.key === "count" ? formatCount(value as number) : formatAmount(value as number)
  if (header.type === "date") return formatDate(value as string)
  return String(value)
}

export function ReportResultTable({ result }: { result: ReportResult }) {
  const { headers, rows, totals } = result
  if (rows.length === 0) return null

  const shown = rows.slice(0, MAX_ROWS)
  const hasTotals = headers.some((h) => totals[h.key] !== undefined)

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
      <div className="max-h-96 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h.key} className={cn("whitespace-nowrap", h.type === "number" && "text-right")}>
                  {h.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((row, i) => (
              <TableRow key={i}>
                {headers.map((h) => (
                  <TableCell
                    key={h.key}
                    className={cn("whitespace-nowrap", h.type === "number" && "text-right tabular-nums")}
                  >
                    {formatCell(h, row[h.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {hasTotals && (
            <TableFooter>
              <TableRow>
                {headers.map((h, i) => (
                  <TableCell
                    key={h.key}
                    className={cn("whitespace-nowrap font-semibold", h.type === "number" && "text-right tabular-nums")}
                  >
                    {totals[h.key] !== undefined ? formatCell(h, totals[h.key]) : i === 0 ? "Total" : ""}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      {rows.length > MAX_ROWS && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Showing first {MAX_ROWS} of {rows.length} rows. Totals cover all rows.
        </p>
      )}
    </div>
  )
}
