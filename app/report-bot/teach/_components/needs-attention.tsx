"use client"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/date-format"
import type { NeedsAttention as Item } from "./types"

type Props = {
  items: Item[]
  /** Start teaching a word (fills the form) */
  onTeach: (phrase: string) => void
}

function statusBadge(status: string) {
  if (status === "OK") return <Badge variant="secondary">Partly understood</Badge>
  if (status === "UNMATCHED") return <Badge variant="outline">Not understood</Badge>
  return <Badge variant="destructive">Error</Badge>
}

export function NeedsAttentionList({ items, onTeach }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nothing to fix — every question in the last 30 days was understood.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Questions from the last 30 days the bot didn&apos;t fully understand. Click a word to teach it.
      </p>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Words to teach</TableHead>
              <TableHead className="text-right">Asked</TableHead>
              <TableHead className="hidden md:table-cell">Last asked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, i) => {
              // UNMATCHED logs every word of the question; the whole question is a better starting point there
              const words = it.status === "UNMATCHED" ? [it.question] : (it.ignored_words ?? [])
              return (
                <TableRow key={i}>
                  <TableCell className="max-w-xs whitespace-normal break-words">{it.question}</TableCell>
                  <TableCell>{statusBadge(it.status)}</TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      {words.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => onTeach(w)}
                          className="rounded-full border border-border px-2 py-0.5 text-xs transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                          title={`Teach “${w}”`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.times)}×</TableCell>
                  <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(it.last_asked)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
