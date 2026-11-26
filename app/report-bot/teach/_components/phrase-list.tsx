"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatDate } from "@/lib/date-format"
import { KIND_INFO, OPERATORS, type CatalogDataset, type TaughtPhrase } from "./types"

type PhraseListProps = {
  phrases: TaughtPhrase[]
  catalog: CatalogDataset[]
  onDelete: (id: number) => Promise<void>
}

function meaning(p: TaughtPhrase, catalog: CatalogDataset[]) {
  if (p.kind === "rewrite") return `“${p.rewrite_to}”`
  const ds = catalog.find((d) => d.key === p.dataset)
  const field = ds?.fields.find((f) => f.key === p.field)
  const target = [ds?.label ?? p.dataset, field?.label ?? p.field].filter(Boolean).join(" · ")
  if (p.kind === "synonym") return target
  const op = OPERATORS.find((o) => o.value === p.op)?.label.replace(/ \(.*\)$/, "") ?? p.op
  return `${target} ${op} ${p.value}`
}

export function PhraseList({ phrases, catalog, onDelete }: PhraseListProps) {
  const [filter, setFilter] = useState("")
  const [pending, setPending] = useState<TaughtPhrase | null>(null)

  const q = filter.trim().toLowerCase()
  const shown = q
    ? phrases.filter((p) => [p.phrase, p.rewrite_to, meaning(p, catalog)].some((s) => s?.toLowerCase().includes(q)))
    : phrases

  return (
    <div className="space-y-3">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search taught phrases…"
        className="sm:max-w-xs"
        aria-label="Search taught phrases"
      />

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {phrases.length === 0 ? "Nothing taught yet." : "No phrases match your search."}
        </p>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phrase</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Means</TableHead>
                <TableHead className="hidden md:table-cell">Applies to</TableHead>
                <TableHead className="hidden md:table-cell">Added</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.phrase}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{KIND_INFO[p.kind]?.label ?? p.kind}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{meaning(p, catalog)}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.branch_id == null ? "All branches" : "This branch"}</TableCell>
                  <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(p.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setPending(p)}
                      aria-label={`Remove ${p.phrase}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{pending?.phrase}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The bot will stop understanding this phrase
              {pending?.branch_id == null ? " in every branch" : " in this branch"}. You can teach it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) onDelete(pending.id)
                setPending(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
