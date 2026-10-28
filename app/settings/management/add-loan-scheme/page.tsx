"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, FilePlus2, Search, Loader2, Save, CheckCircle2, AlertCircle, Library, Building2 } from "lucide-react"
import { DashboardWrapper } from "../../../_components/dashboard-wrapper"
import { cn } from "@/lib/utils"

interface MasterScheme {
  id: string
  scheme_id: number
  scheme_name: string
  scheme_description: string | null
  loan_type: string | null
  interest_rate: string | null
  minimum_period_months: number | null
  maximum_period_months: number | null
  scheme_status: string | null
}

interface BranchScheme {
  id: string
  scheme_id: number
  scheme_name: string
  loan_type: string | null
  interest_rate: string | null
  minimum_loan_amount: string | null
  maximum_loan_amount: string | null
  scheme_status: string | null
}

type Message = { type: "success" | "error"; lines: string[] }

const formatRate = (v: string | null) => (v != null ? `${Number(v)}%` : "—")
const formatType = (v: string | null) => v?.replace(/_/g, " ") ?? "—"
const formatAmount = (v: string | null) => (v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—")

function StatusBadge({ status }: { status: string | null }) {
  const active = status === "ACTIVE"
  return (
    <Badge variant={active ? "default" : "secondary"} className={active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
      {status ?? "—"}
    </Badge>
  )
}

export default function AddLoanSchemePage() {
  const router = useRouter()
  const [masters, setMasters] = useState<MasterScheme[]>([])
  const [branchSchemes, setBranchSchemes] = useState<BranchScheme[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  const fetchSchemes = async () => {
    setLoadError("")
    try {
      const res = await fetch("/api/settings/loan-schemes", { credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load loan schemes")
      setMasters(data.masters ?? [])
      setBranchSchemes(data.branchSchemes ?? [])
    } catch (err: any) {
      setLoadError(err.message || "Failed to load loan schemes")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSchemes()
  }, [])

  // A master scheme counts as assigned when the branch already has its scheme_id or name
  const assigned = useMemo(() => {
    const ids = new Set(branchSchemes.map((s) => s.scheme_id))
    const names = new Set(branchSchemes.map((s) => s.scheme_name))
    return (m: MasterScheme) => ids.has(m.scheme_id) || names.has(m.scheme_name)
  }, [branchSchemes])

  const filteredMasters = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return masters
    return masters.filter(
      (m) => m.scheme_name.toLowerCase().includes(q) || String(m.scheme_id).includes(q) || (m.loan_type ?? "").toLowerCase().includes(q)
    )
  }, [masters, search])

  const selectable = filteredMasters.filter((m) => !assigned(m))
  const allVisibleSelected = selectable.length > 0 && selectable.every((m) => selected.has(m.id))

  const toggle = (id: string, on: boolean) => {
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
      selectable.forEach((m) => (on ? next.add(m.id) : next.delete(m.id)))
      return next
    })
  }

  const handleSave = async () => {
    if (selected.size === 0) return
    setIsSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/settings/loan-schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ master_ids: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMessage({ type: "error", lines: [data.error || "Failed to save loan schemes"] })
        return
      }
      const lines: string[] = []
      if (data.added.length > 0) {
        lines.push(`Added ${data.added.length} scheme${data.added.length !== 1 ? "s" : ""} to this branch: ${data.added.map((a: any) => a.scheme_name).join(", ")}`)
      }
      data.skipped.forEach((s: any) => lines.push(`Skipped ${s.scheme_name}: ${s.reason}`))
      setMessage({ type: data.added.length > 0 ? "success" : "error", lines })
      setSelected(new Set())
      await fetchSchemes()
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
            onClick={() => router.push("/settings/management")}
            className="h-10 w-10 bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
              <FilePlus2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Add Loan Scheme</h2>
              <p className="text-muted-foreground">Select schemes from the scheme master and assign them to this branch</p>
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

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Left: Scheme Master ─────────────────────────────── */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Library className="h-4 w-4 text-blue-600" />
                    Scheme Master
                  </CardTitle>
                  <CardDescription>
                    {isLoading ? "Loading…" : `${masters.length} scheme${masters.length !== 1 ? "s" : ""} available · ${selected.size} selected`}
                  </CardDescription>
                </div>
                <Button onClick={handleSave} disabled={selected.size === 0 || isSaving}>
                  {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Save
                </Button>
              </div>
              <div className="relative pt-2">
                <Search className="absolute left-2.5 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name, ID or type"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading scheme master…
                </div>
              ) : filteredMasters.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  {masters.length === 0 ? "No schemes found in the scheme master." : "No schemes match your search."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allVisibleSelected}
                            disabled={selectable.length === 0}
                            onCheckedChange={(v) => toggleAllVisible(v === true)}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Scheme Name</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead className="hidden md:table-cell">Rate</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMasters.map((m) => {
                        const isAssigned = assigned(m)
                        return (
                          <TableRow
                            key={m.id}
                            className={cn(isAssigned ? "opacity-60" : "cursor-pointer")}
                            onClick={() => !isAssigned && toggle(m.id, !selected.has(m.id))}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isAssigned || selected.has(m.id)}
                                disabled={isAssigned}
                                onCheckedChange={(v) => toggle(m.id, v === true)}
                                aria-label={`Select ${m.scheme_name}`}
                              />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{m.scheme_id}</TableCell>
                            <TableCell className="font-medium">{m.scheme_name}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{formatType(m.loan_type)}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{formatRate(m.interest_rate)}</TableCell>
                            <TableCell className="text-right">
                              {isAssigned ? <Badge variant="secondary" className="text-xs">Assigned</Badge> : <StatusBadge status={m.scheme_status} />}
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

          {/* ── Right: Branch Schemes ───────────────────────────── */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Branch Schemes
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading…" : `${branchSchemes.length} scheme${branchSchemes.length !== 1 ? "s" : ""} assigned to this branch`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading branch schemes…
                </div>
              ) : branchSchemes.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No loan schemes are assigned to this branch yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Scheme Name</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead className="hidden md:table-cell">Rate</TableHead>
                        <TableHead className="hidden xl:table-cell">Max Amount</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchSchemes.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm text-muted-foreground">{s.scheme_id}</TableCell>
                          <TableCell className="font-medium">{s.scheme_name}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{formatType(s.loan_type)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{formatRate(s.interest_rate)}</TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">{formatAmount(s.maximum_loan_amount)}</TableCell>
                          <TableCell className="text-right"><StatusBadge status={s.scheme_status} /></TableCell>
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
