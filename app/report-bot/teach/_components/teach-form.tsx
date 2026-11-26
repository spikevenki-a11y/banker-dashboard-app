"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { KIND_INFO, OPERATORS, type CatalogDataset, type NewPhrase, type PhraseKind } from "./types"

// Radix Select can't hold an empty value, so "whole report" gets a sentinel
const WHOLE_REPORT = "__report"

type TeachFormProps = {
  catalog: CatalogDataset[]
  /** Set from the "Needs attention" list to start teaching a word */
  prefill?: { phrase: string; nonce: number } | null
  onSave: (p: NewPhrase) => Promise<string | null>
}

export function TeachForm({ catalog, prefill, onSave }: TeachFormProps) {
  const [kind, setKind] = useState<PhraseKind>("rewrite")
  const [phrase, setPhrase] = useState("")
  const [rewriteTo, setRewriteTo] = useState("")
  const [dataset, setDataset] = useState("")
  const [field, setField] = useState(WHOLE_REPORT)
  const [op, setOp] = useState("=")
  const [value, setValue] = useState("")
  const [allBranches, setAllBranches] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (prefill) {
      setPhrase(prefill.phrase)
      setError(null)
      document.getElementById("teach-phrase")?.focus()
    }
  }, [prefill])

  const fields = catalog.find((d) => d.key === dataset)?.fields ?? []
  const needsDataset = kind !== "rewrite"
  const needsField = kind === "value"

  const reset = () => {
    setPhrase("")
    setRewriteTo("")
    setValue("")
    setField(WHOLE_REPORT)
    setOp("=")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const p: NewPhrase = { phrase: phrase.trim(), kind, allBranches }
    if (kind === "rewrite") p.rewrite_to = rewriteTo.trim()
    if (needsDataset) {
      if (!dataset) return setError("Choose a report")
      p.dataset = dataset
      if (field !== WHOLE_REPORT) p.field = field
    }
    if (needsField) {
      if (field === WHOLE_REPORT) return setError("Choose a column for the filter")
      p.op = op
      p.value = value.trim()
    }
    setSaving(true)
    const err = await onSave(p)
    setSaving(false)
    if (err) setError(err)
    else reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Teach a phrase</CardTitle>
        <CardDescription>Words your staff use that the bot doesn&apos;t understand yet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {/* Kind */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Phrase type">
              {(Object.keys(KIND_INFO) as PhraseKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => {
                    setKind(k)
                    setError(null)
                    if (k === "synonym") setField(WHOLE_REPORT)
                  }}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    kind === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted",
                  )}
                >
                  <div className="text-sm font-medium">{KIND_INFO[k].label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{KIND_INFO[k].help}</div>
                  <div className="mt-1.5 text-xs text-muted-foreground">e.g. {KIND_INFO[k].example}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teach-phrase">When someone types</Label>
              <Input
                id="teach-phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="e.g. nagai kadan"
                maxLength={80}
                required
              />
            </div>

            {kind === "rewrite" && (
              <div className="space-y-2">
                <Label htmlFor="teach-rewrite">Read it as</Label>
                <Input
                  id="teach-rewrite"
                  value={rewriteTo}
                  onChange={(e) => setRewriteTo(e.target.value)}
                  placeholder="e.g. gold loan"
                  maxLength={200}
                  required
                />
              </div>
            )}

            {needsDataset && (
              <div className="space-y-2">
                <Label>Report</Label>
                <Select
                  value={dataset}
                  onValueChange={(v) => {
                    setDataset(v)
                    setField(WHOLE_REPORT)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a report" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((d) => (
                      <SelectItem key={d.key} value={d.key}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsDataset && (
              <div className="space-y-2">
                <Label>{needsField ? "Column" : "Column (optional)"}</Label>
                <Select value={field} onValueChange={setField} disabled={!dataset}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {!needsField && <SelectItem value={WHOLE_REPORT}>The whole report</SelectItem>}
                    {fields.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsField && (
              <>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={op} onValueChange={setOp}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teach-value">Value</Label>
                  <Input
                    id="teach-value"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={op.includes("ILIKE") ? "e.g. %SENIOR%" : "e.g. 500000"}
                    maxLength={200}
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="teach-all" checked={allBranches} onCheckedChange={(c) => setAllBranches(c === true)} />
            <Label htmlFor="teach-all" className="font-normal">
              Apply to all branches (otherwise only this branch)
            </Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={saving || !phrase.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save phrase
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
