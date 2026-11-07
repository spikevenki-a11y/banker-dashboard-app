"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Target, Search, Loader2, Save, CheckCircle2, AlertCircle, Library, Link2, RotateCcw } from "lucide-react"
import { DashboardWrapper } from "../../../../_components/dashboard-wrapper"
import { cn } from "@/lib/utils"

interface LoanScheme {
  scheme_id: number
  scheme_name: string
  loan_type: string
  scheme_status: string
}

interface LoanPurpose {
  purpose_id: number
  purpose_name: string
  is_active: boolean
}

type Message = { type: "success" | "error"; lines: string[] }

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((id) => b.includes(id))
const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`
const formatType = (v: string | null) => v?.replace(/_/g, " ") ?? "—"

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "secondary"} className={active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
      {active ? "ACTIVE" : "INACTIVE"}
    </Badge>
  )
}

export default function MapLoanPurposesPage() {
  const router = useRouter()
  const { schemeId } = useParams<{ schemeId: string }>()

  const [scheme, setScheme] = useState<LoanScheme | null>(null)
  const [purposes, setPurposes] = useState<LoanPurpose[]>([])
  const [mapped, setMapped] = useState<number[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  // Loads the scheme, all purposes and this branch's saved mapping for the scheme
  const loadMapping = useCallback(async () => {
    const res = await fetch(`/api/settings/loan-purpose-mapping?schemeId=${encodeURIComponent(schemeId)}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to load purpose mapping")
    const saved = [...new Set((data.mappings as { purpose_id: number }[]).map((m) => Number(m.purpose_id)))]
    setScheme(data.schemes[0])
    setPurposes(data.purposes.map((p: LoanPurpose) => ({ ...p, purpose_id: Number(p.purpose_id) })))
    setMapped(saved)
    return saved
  }, [schemeId])

  useEffect(() => {
    ;(async () => {
      try {
        setLoadError("")
        setSelected(new Set(await loadMapping()))
      } catch (error: any) {
        setLoadError(error.message || "Failed to load purpose mapping")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [loadMapping])

  const purposeById = useMemo(() => new Map(purposes.map((p) => [p.purpose_id, p])), [purposes])

  // Active purposes, plus inactive ones already mapped so they can be unchecked
  const available = useMemo(
    () => purposes.filter((p) => p.is_active || mapped.includes(p.purpose_id)),
    [purposes, mapped]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return available
    return available.filter((p) => p.purpose_name.toLowerCase().includes(q) || String(p.purpose_id).includes(q))
  }, [available, search])

  const mappedPurposes = useMemo(
    () => [...mapped].sort((a, b) => a - b).map((id) => purposeById.get(id) ?? { purpose_id: id, purpose_name: `Purpose #${id}`, is_active: false }),
    [mapped, purposeById]
  )

  const isDirty = !sameSet([...selected], mapped)
  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.purpose_id))

  const toggle = (id: number, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllVisible = (on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      // Select all only adds active purposes; clearing removes any visible one
      filtered.forEach((p) => (on ? p.is_active && next.add(p.purpose_id) : next.delete(p.purpose_id)))
      return next
    })
  }

  const handleSave = async () => {
    if (!isDirty) return
    setIsSaving(true)
    setMessage(null)
    const ids = [...selected]
    const added = ids.filter((id) => !mapped.includes(id))
    const removed = mapped.filter((id) => !selected.has(id))
    const names = (list: number[]) => list.map((id) => purposeById.get(id)?.purpose_name ?? `#${id}`).join(", ")
    try {
      const res = await fetch("/api/settings/loan-purpose-mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheme_id: Number(schemeId), purpose_ids: ids }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: "error", lines: [data.error || "Failed to save purpose mapping"] })
        return
      }
      const lines: string[] = []
      if (added.length > 0) lines.push(`Mapped ${plural(added.length, "purpose")}: ${names(added)}`)
      if (removed.length > 0) lines.push(`Removed ${plural(removed.length, "purpose")}: ${names(removed)}`)
      setMessage({ type: "success", lines })
      // Re-read from the database so the right column shows what was stored
      setSelected(new Set(await loadMapping()))
    } catch {
      setMessage({ type: "error", lines: ["Network error. Please try again."] })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/settings/management/loan-purpose-mapping")}
            className="h-10 w-10 bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50">
              <Target className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Map Loan Purposes</h2>
              <p className="text-muted-foreground">
                {scheme
                  ? `${scheme.scheme_id} – ${scheme.scheme_name} (${formatType(scheme.loan_type)}) · applies to this branch only`
                  : "Select purposes from the purpose master and map them to this scheme"}
              </p>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </div>
        )}

        {message && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
              message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <div className="space-y-0.5">
              {message.lines.map((l, i) => <p key={i}>{l}</p>)}
            </div>
          </div>
        )}

        {isDirty && selected.size === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Saving with nothing selected removes all purposes from this scheme.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Left: Purpose Master ────────────────────────────── */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Library className="h-4 w-4 text-blue-600" />
                    Available Purposes
                  </CardTitle>
                  <CardDescription>
                    {isLoading ? "Loading…" : `${plural(available.length, "purpose")} available · ${selected.size} selected`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    title="Reset to saved mapping"
                    onClick={() => {
                      setSelected(new Set(mapped))
                      setMessage(null)
                    }}
                    disabled={!isDirty || isSaving}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleSave} disabled={!isDirty || isSaving || isLoading || !!loadError}>
                    {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                    Save
                  </Button>
                </div>
              </div>
              <div className="relative pt-2">
                <Search className="absolute left-2.5 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading purpose master…
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  {available.length === 0 ? "No active loan purposes. Add them in the Purpose Master tab." : "No purposes match your search."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allVisibleSelected}
                            disabled={isSaving}
                            onCheckedChange={(v) => toggleAllVisible(v === true)}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Purpose Name</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => {
                        const isMapped = mapped.includes(p.purpose_id)
                        return (
                          <TableRow
                            key={p.purpose_id}
                            className={cn("cursor-pointer", !p.is_active && "opacity-60")}
                            onClick={() => !isSaving && toggle(p.purpose_id, !selected.has(p.purpose_id))}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selected.has(p.purpose_id)}
                                disabled={isSaving}
                                onCheckedChange={(v) => toggle(p.purpose_id, v === true)}
                                aria-label={`Select ${p.purpose_name}`}
                              />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.purpose_id}</TableCell>
                            <TableCell className="font-medium">
                              {p.purpose_name}
                              {!p.is_active && <span className="block text-xs font-normal text-muted-foreground">Inactive · uncheck to remove</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              {isMapped ? <Badge variant="secondary" className="text-xs">Mapped</Badge> : <ActiveBadge active={p.is_active} />}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Right: Mapped Purposes ──────────────────────────── */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4 text-emerald-600" />
                Mapped Purposes
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading…" : `${plural(mapped.length, "purpose")} mapped to this scheme in this branch`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading mapped purposes…
                </div>
              ) : mappedPurposes.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No loan purposes are mapped to this scheme yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Purpose Name</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappedPurposes.map((p) => (
                        <TableRow key={p.purpose_id}>
                          <TableCell className="text-sm text-muted-foreground">{p.purpose_id}</TableCell>
                          <TableCell className={cn("font-medium", !p.is_active && "line-through text-muted-foreground")}>
                            {p.purpose_name}
                          </TableCell>
                          <TableCell className="text-right"><ActiveBadge active={p.is_active} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardWrapper>
  )
}
