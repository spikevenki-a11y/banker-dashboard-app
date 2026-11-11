"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Coins, Loader2 } from "lucide-react"
import { DashboardWrapper } from "../../../_components/dashboard-wrapper"
import { formatDate, formatDateTime } from "@/lib/date-format"
import type { GoldGuideline } from "@/lib/gold-guideline"

const formatAmount = (n: number) =>
  `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function GoldGuidelinePage() {
  const router = useRouter()
  const [current, setCurrent] = useState<GoldGuideline | null>(null)
  const [history, setHistory] = useState<GoldGuideline[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [value, setValue] = useState("")
  const [remarks, setRemarks] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved] = useState(false)

  const apply = (data: any) => {
    setCurrent(data.current ?? null)
    setHistory(data.history ?? [])
  }

  useEffect(() => {
    fetch("/api/settings/gold-guideline", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load")
        apply(data)
      })
      .catch((e) => setLoadError(e.message || "Failed to load gold guidelines value"))
      .finally(() => setLoading(false))
  }, [])

  // Same rules as the server: greater than zero, at most 2 decimals
  const trimmed = value.trim()
  const valueError =
    trimmed === ""
      ? ""
      : !/^\d+(\.\d{1,2})?$/.test(trimmed) || Number(trimmed) <= 0
        ? "Enter an amount greater than zero, with at most 2 decimal places."
        : current && Number(trimmed) === Number(current.value_per_gram)
          ? "This is already the current guidelines value."
          : ""

  const handleSave = async () => {
    if (!trimmed || valueError) return
    setSaving(true)
    setSaveError("")
    setSaved(false)
    try {
      const res = await fetch("/api/settings/gold-guideline", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value_per_gram: trimmed, remarks }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      apply(data)
      setValue("")
      setRemarks("")
      setSaved(true)
    } catch (e: any) {
      setSaveError(e.message || "Failed to save gold guidelines value")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/settings/management")}
            className="h-10 w-10 bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-50">
              <Coins className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Gold Guidelines Value</h2>
              <p className="text-muted-foreground">
                Guidelines value per gram used to cap gold loans (Maximum Sanction Amount = value × net weight)
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Current Value</CardTitle>
                  <CardDescription>Applied to new gold loan applications in this branch</CardDescription>
                </CardHeader>
                <CardContent>
                  {current ? (
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-yellow-700">
                        {formatAmount(current.value_per_gram)}
                        <span className="ml-1 text-base font-medium text-muted-foreground">/ gram</span>
                      </p>
                      <p className="text-sm text-muted-foreground">Effective from {formatDate(current.effective_from)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">
                      Not set yet. Gold loan applications cannot be submitted until a value is set.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{current ? "Change Value" : "Set Value"}</CardTitle>
                  <CardDescription>
                    Takes effect for applications submitted from now on; existing applications keep the value they were made with
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="gold-guideline-value">Guidelines Value per Gram (₹) *</Label>
                    <Input
                      id="gold-guideline-value"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="e.g. 5500.00"
                      value={value}
                      aria-invalid={!!valueError || undefined}
                      onChange={(e) => {
                        setValue(e.target.value)
                        setSaved(false)
                      }}
                    />
                    {valueError && <p className="text-xs text-destructive">{valueError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gold-guideline-remarks">Remarks</Label>
                    <Input
                      id="gold-guideline-remarks"
                      maxLength={255}
                      placeholder="Optional, e.g. reason for the change"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                  {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                  {saved && <p className="text-sm text-emerald-700">Guidelines value saved.</p>}
                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving || !trimmed || !!valueError}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
                <CardDescription>Every value set for this branch, newest first</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No values set yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">Value / Gram</TableHead>
                        <TableHead>Effective From</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Set On</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-right font-mono">{formatAmount(h.value_per_gram)}</TableCell>
                          <TableCell>{formatDate(h.effective_from)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{h.remarks || "—"}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(h.created_at)}</TableCell>
                          <TableCell>{current?.id === h.id && <Badge>Current</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardWrapper>
  )
}
