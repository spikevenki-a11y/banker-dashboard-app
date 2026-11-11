"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Landmark, Loader2, Plus, Pencil, Eye, Power, Trash2 } from "lucide-react"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"
import { formatDate, formatDateTime } from "@/lib/date-format"
import {
  COMPOUNDING_FREQUENCIES,
  MATURITY_ROUNDING,
  labelOf,
  parsePolicyInput,
  tenureLabel,
  type PolicyVersion,
} from "@/lib/fd-interest-policy"

type Scheme = { scheme_id: number; scheme_name: string; deposit_type: string; interest_rate: number }
type PolicyRow = PolicyVersion & { scheme_id: number; scheme_name: string | null }
type SlabForm = { from: string; to: string; rate: string }

type FormState = {
  policy_name: string
  scheme_id: string
  slabs: SlabForm[]
  compounding_frequency: string
  effective_from: string
  effective_to: string
  premature_closure_allowed: boolean
  premature_lock_in_days: string
  premature_penal_rate: string
  maturity_rounding: string
  senior_benefit_enabled: boolean
  senior_min_age: string
  senior_additional_rate: string
  senior_effective_from: string
  senior_effective_to: string
  remarks: string
}

const emptySlab: SlabForm = { from: "", to: "", rate: "" }

const emptyForm: FormState = {
  policy_name: "",
  scheme_id: "",
  slabs: [{ ...emptySlab }],
  compounding_frequency: "NONE",
  effective_from: "",
  effective_to: "",
  premature_closure_allowed: true,
  premature_lock_in_days: "0",
  premature_penal_rate: "0",
  maturity_rounding: "NEAREST_RUPEE",
  senior_benefit_enabled: false,
  senior_min_age: "",
  senior_additional_rate: "",
  senior_effective_from: "",
  senior_effective_to: "",
  remarks: "",
}

const formFromPolicy = (p: PolicyRow): FormState => ({
  policy_name: p.policy_name,
  scheme_id: String(p.scheme_id),
  slabs: (p.rate_slabs || []).map((s) => ({
    from: String(s.tenure_from_days),
    to: String(s.tenure_to_days),
    rate: String(s.interest_rate),
  })),
  compounding_frequency: p.compounding_frequency,
  effective_from: p.effective_from,
  effective_to: p.effective_to || "",
  premature_closure_allowed: p.premature_closure_allowed,
  premature_lock_in_days: String(p.premature_lock_in_days ?? 0),
  premature_penal_rate: String(p.premature_penal_rate ?? 0),
  maturity_rounding: p.maturity_rounding,
  ...seniorFormFromPolicy(p),
  remarks: "",
})

// Senior Citizen Benefit fields; versions saved before this setting existed used a
// per-tenure senior rate, shown here as the smallest additional rate it gave
function seniorFormFromPolicy(p: PolicyRow) {
  if (p.senior_benefit_enabled) {
    return {
      senior_benefit_enabled: true,
      senior_min_age: p.senior_min_age != null ? String(p.senior_min_age) : "",
      senior_additional_rate: p.senior_additional_rate != null ? String(p.senior_additional_rate) : "",
      senior_effective_from: p.senior_effective_from || "",
      senior_effective_to: p.senior_effective_to || "",
    }
  }
  const legacy = p.calculation_method === "AGE_WISE"
    ? (p.rate_slabs || []).map((s) => (s.senior_citizen_rate ?? s.interest_rate) - s.interest_rate).filter((x) => x > 0)
    : []
  return {
    senior_benefit_enabled: legacy.length > 0,
    senior_min_age: legacy.length > 0 && p.senior_citizen_age != null ? String(p.senior_citizen_age) : "",
    senior_additional_rate: legacy.length > 0 ? String(Math.round(Math.min(...legacy) * 100) / 100) : "",
    senior_effective_from: legacy.length > 0 ? p.effective_from : "",
    senior_effective_to: "",
  }
}

// Form → API body (numbers where the server expects them)
const bodyFromForm = (f: FormState) => ({
  policy_name: f.policy_name,
  scheme_id: Number(f.scheme_id) || null,
  rate_slabs: f.slabs.map((s) => ({
    tenure_from_days: s.from === "" ? null : Number(s.from),
    tenure_to_days: s.to === "" ? null : Number(s.to),
    interest_rate: s.rate === "" ? null : Number(s.rate),
  })),
  compounding_frequency: f.compounding_frequency,
  effective_from: f.effective_from,
  effective_to: f.effective_to || null,
  premature_closure_allowed: f.premature_closure_allowed,
  premature_lock_in_days: f.premature_lock_in_days === "" ? 0 : Number(f.premature_lock_in_days),
  premature_penal_rate: f.premature_penal_rate === "" ? 0 : Number(f.premature_penal_rate),
  maturity_rounding: f.maturity_rounding,
  senior_benefit_enabled: f.senior_benefit_enabled,
  senior_min_age: f.senior_min_age === "" ? null : Number(f.senior_min_age),
  senior_additional_rate: f.senior_additional_rate === "" ? null : Number(f.senior_additional_rate),
  senior_effective_from: f.senior_effective_from || null,
  senior_effective_to: f.senior_effective_to || null,
  remarks: f.remarks,
})

const rateRange = (p: PolicyVersion) => {
  const rates = (p.rate_slabs || []).map((s) => s.interest_rate)
  if (rates.length === 0) return "—"
  const lo = Math.min(...rates)
  const hi = Math.max(...rates)
  return lo === hi ? `${lo}%` : `${lo}% – ${hi}%`
}

const periodText = (p: { effective_from: string; effective_to: string | null }) =>
  `${formatDate(p.effective_from)} → ${p.effective_to ? formatDate(p.effective_to) : "Open-ended"}`

/** "+0.50% from 60 yrs" (or "Disabled") */
const seniorText = (p: PolicyVersion) => {
  if (p.senior_benefit_enabled) return `+${p.senior_additional_rate}% from ${p.senior_min_age} yrs`
  if (p.calculation_method === "AGE_WISE" && p.senior_citizen_age != null) return `Tenure-wise rates from ${p.senior_citizen_age} yrs`
  return "Disabled"
}

const seniorPeriodText = (p: PolicyVersion) =>
  p.senior_benefit_enabled && p.senior_effective_from
    ? `${formatDate(p.senior_effective_from)} → ${p.senior_effective_to ? formatDate(p.senior_effective_to) : "Open-ended"}`
    : "—"

const CHANGE_LABEL: Record<string, string> = {
  CREATED: "Created",
  EDITED: "Edited",
  ACTIVATED: "Activated",
  DEACTIVATED: "Deactivated",
}

export default function FdInterestPolicyPage() {
  const router = useRouter()
  const [policies, setPolicies] = useState<PolicyRow[]>([])
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [schemeFilter, setSchemeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Add / Edit
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PolicyRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

  // View
  const [viewing, setViewing] = useState<PolicyRow | null>(null)
  const [history, setHistory] = useState<PolicyVersion[]>([])
  const [accountsOpened, setAccountsOpened] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Activate / Deactivate
  const [statusTarget, setStatusTarget] = useState<PolicyRow | null>(null)
  const [statusRemarks, setStatusRemarks] = useState("")
  const [statusError, setStatusError] = useState("")
  const [statusSaving, setStatusSaving] = useState(false)

  const loadPolicies = async () => {
    const res = await fetch("/api/settings/fd-interest-policy", { credentials: "include" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to load interest policies")
    setPolicies(data.policies || [])
  }

  useEffect(() => {
    Promise.all([
      loadPolicies(),
      fetch("/api/deposits/schemes", { credentials: "include" })
        .then((r) => r.json())
        .then((d) =>
          setSchemes((d.schemes || []).filter((s: Scheme) => s.deposit_type === "TERM" || s.deposit_type === "T"))
        ),
    ])
      .catch((e) => setLoadError(e.message || "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () =>
      policies.filter(
        (p) =>
          (schemeFilter === "all" || String(p.scheme_id) === schemeFilter) &&
          (statusFilter === "all" || p.status === statusFilter)
      ),
    [policies, schemeFilter, statusFilter]
  )

  const up = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const upSlab = (i: number, patch: Partial<SlabForm>) =>
    setForm((f) => ({ ...f, slabs: f.slabs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }))

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm, slabs: [{ ...emptySlab }] })
    setFormError("")
    setFormOpen(true)
  }
  const openEdit = (p: PolicyRow) => {
    setEditing(p)
    setForm(formFromPolicy(p))
    setFormError("")
    setFormOpen(true)
  }

  const handleSave = async () => {
    const body = bodyFromForm(form)
    // Same checks as the server, so problems show before saving
    const parsed = parsePolicyInput(body)
    if ("error" in parsed) {
      setFormError(parsed.error)
      return
    }
    setSaving(true)
    setFormError("")
    try {
      const res = await fetch(
        editing ? `/api/settings/fd-interest-policy/${editing.policy_id}` : "/api/settings/fd-interest-policy",
        {
          method: editing ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      await loadPolicies()
      setFormOpen(false)
    } catch (e: any) {
      setFormError(e.message || "Failed to save interest policy")
    } finally {
      setSaving(false)
    }
  }

  const openView = async (p: PolicyRow) => {
    setViewing(p)
    setHistory([])
    setAccountsOpened(0)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/settings/fd-interest-policy/${p.policy_id}`, { credentials: "include" })
      const data = await res.json()
      if (res.ok) {
        setHistory(data.history || [])
        setAccountsOpened(data.accounts_opened || 0)
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  const openStatus = (p: PolicyRow) => {
    setStatusTarget(p)
    setStatusRemarks("")
    setStatusError("")
  }

  const handleStatus = async () => {
    if (!statusTarget) return
    setStatusSaving(true)
    setStatusError("")
    try {
      const res = await fetch(`/api/settings/fd-interest-policy/${statusTarget.policy_id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: statusTarget.status === "ACTIVE" ? "DEACTIVATE" : "ACTIVATE",
          remarks: statusRemarks,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to change status")
      await loadPolicies()
      setStatusTarget(null)
    } catch (e: any) {
      setStatusError(e.message || "Failed to change status")
    } finally {
      setStatusSaving(false)
    }
  }

  // Benefit period defaults to the policy period
  const toggleSenior = (on: boolean) =>
    setForm((f) => ({
      ...f,
      senior_benefit_enabled: on,
      senior_effective_from: on && !f.senior_effective_from ? f.effective_from : f.senior_effective_from,
      senior_effective_to: on && !f.senior_effective_to ? f.effective_to : f.senior_effective_to,
    }))
  const highestRate = Math.max(0, ...form.slabs.map((s) => Number(s.rate) || 0))
  const viewTerms = history[0] ?? viewing

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push("/settings")} className="h-10 w-10 bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50">
                <Landmark className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Interest Policy Configuration</h2>
                <p className="text-muted-foreground">
                  Fixed deposit interest policies by scheme, tenure and age. New deposits use the policy in force when they are opened.
                </p>
              </div>
            </div>
          </div>
          <Button onClick={openAdd} className="gap-2" disabled={loading || schemes.length === 0}>
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        </div>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Policies</CardTitle>
              <CardDescription>Edits and status changes are kept as versions; existing deposits keep the terms they were opened with</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={schemeFilter} onValueChange={setSchemeFilter}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Scheme" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All schemes</SelectItem>
                  {schemes.map((s) => (
                    <SelectItem key={s.scheme_id} value={String(s.scheme_id)}>{s.scheme_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : schemes.length === 0 && policies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active fixed deposit schemes in this branch. Add one in Scheme Maintenance first.</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interest policies yet. Use Add Policy to create one.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy</TableHead>
                      <TableHead>Scheme</TableHead>
                      <TableHead>Senior Citizen</TableHead>
                      <TableHead>Rates</TableHead>
                      <TableHead>Compounding</TableHead>
                      <TableHead>Effective Period</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.policy_id}>
                        <TableCell className="font-medium">{p.policy_name}</TableCell>
                        <TableCell>{p.scheme_name || `Scheme ${p.scheme_id}`}</TableCell>
                        <TableCell className="text-sm">{seniorText(p)}</TableCell>
                        <TableCell className="text-sm">
                          {rateRange(p)}
                          <span className="ml-1 text-xs text-muted-foreground">({p.rate_slabs?.length || 0} tenure{p.rate_slabs?.length === 1 ? "" : "s"})</span>
                        </TableCell>
                        <TableCell className="text-sm">{labelOf(COMPOUNDING_FREQUENCIES, p.compounding_frequency)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{periodText(p)}</TableCell>
                        <TableCell className="text-sm">v{p.version_no}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>{p.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View" onClick={() => openView(p)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 gap-1 ${p.status === "ACTIVE" ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"}`}
                              onClick={() => openStatus(p)}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Add / Edit ─────────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(o) => !saving && setFormOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Policy — ${editing.policy_name}` : "Add Interest Policy"}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Saving creates version ${editing.version_no + 1}. Deposits already opened keep the version they were opened with.`
                : "Applies to new fixed deposits of the scheme opened within the effective period."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pol-name">Policy Name *</Label>
                <Input id="pol-name" maxLength={100} value={form.policy_name} onChange={(e) => up({ policy_name: e.target.value })} placeholder="e.g. FD rates 2026-27" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pol-scheme">Deposit Scheme *</Label>
                <Select value={form.scheme_id} onValueChange={(v) => up({ scheme_id: v })} disabled={!!editing}>
                  <SelectTrigger id="pol-scheme" className="w-full"><SelectValue placeholder="Select fixed deposit scheme" /></SelectTrigger>
                  <SelectContent>
                    {schemes.map((s) => (
                      <SelectItem key={s.scheme_id} value={String(s.scheme_id)}>{s.scheme_name}</SelectItem>
                    ))}
                    {editing && !schemes.some((s) => String(s.scheme_id) === form.scheme_id) && (
                      <SelectItem value={form.scheme_id}>{editing.scheme_name || `Scheme ${editing.scheme_id}`}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {editing && <p className="text-xs text-muted-foreground">The scheme cannot be changed; add a new policy for another scheme.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pol-from">Effective From *</Label>
                <Input id="pol-from" type="date" value={form.effective_from} onChange={(e) => up({ effective_from: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pol-to">Effective To</Label>
                <Input id="pol-to" type="date" min={form.effective_from || undefined} value={form.effective_to} onChange={(e) => up({ effective_to: e.target.value })} />
                <p className="text-xs text-muted-foreground">Leave empty for no end date.</p>
              </div>
            </div>

            {/* Interest rates */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="space-y-2">
                <Label>Tenure &amp; Regular Interest Rate *</Label>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Tenure From (days)</TableHead>
                        <TableHead className="text-xs">Tenure To (days)</TableHead>
                        <TableHead className="text-xs">Interest Rate (% p.a.)</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.slabs.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell><Input className="h-8" type="number" min="1" step="1" value={s.from} onChange={(e) => upSlab(i, { from: e.target.value })} placeholder="7" /></TableCell>
                          <TableCell><Input className="h-8" type="number" min="1" step="1" value={s.to} onChange={(e) => upSlab(i, { to: e.target.value })} placeholder="365" /></TableCell>
                          <TableCell><Input className="h-8" type="number" min="0.01" step="0.01" value={s.rate} onChange={(e) => upSlab(i, { rate: e.target.value })} placeholder="0.00" /></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" aria-label="Remove row"
                              disabled={form.slabs.length === 1}
                              onClick={() => setForm((f) => ({ ...f, slabs: f.slabs.filter((_, idx) => idx !== i) }))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setForm((f) => ({ ...f, slabs: [...f.slabs, { ...emptySlab }] }))}>
                  <Plus className="h-3.5 w-3.5" /> Add Tenure
                </Button>
                <p className="text-xs text-muted-foreground">Tenure is the deposit period in days (e.g. 1 year ≈ 365). Ranges must not overlap.</p>
              </div>
            </div>

            {/* Senior Citizen Benefit */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="pol-senior">Senior Citizen Benefit</Label>
                  <p className="text-xs text-muted-foreground">
                    Extra interest for members at or above the minimum age on the deposit opening date.
                  </p>
                </div>
                <Switch id="pol-senior" checked={form.senior_benefit_enabled} onCheckedChange={toggleSenior} />
              </div>
              {form.senior_benefit_enabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pol-senior-age">Minimum Eligible Age (years) *</Label>
                    <Input id="pol-senior-age" type="number" min="1" max="120" step="1" value={form.senior_min_age}
                      onChange={(e) => up({ senior_min_age: e.target.value })} placeholder="e.g. 60" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pol-senior-rate">Additional Interest Rate (% p.a.) *</Label>
                    <Input id="pol-senior-rate" type="number" min="0.01" step="0.01" value={form.senior_additional_rate}
                      onChange={(e) => up({ senior_additional_rate: e.target.value })} placeholder="e.g. 0.50" />
                    {highestRate > 0 && Number(form.senior_additional_rate) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Senior citizen rate = regular rate + {Number(form.senior_additional_rate)}% (e.g. {highestRate}% → {Math.round((highestRate + Number(form.senior_additional_rate)) * 100) / 100}%)
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pol-senior-from">Benefit Effective From *</Label>
                    <Input id="pol-senior-from" type="date" min={form.effective_from || undefined} max={form.effective_to || undefined}
                      value={form.senior_effective_from} onChange={(e) => up({ senior_effective_from: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pol-senior-to">Benefit Effective To</Label>
                    <Input id="pol-senior-to" type="date" min={form.senior_effective_from || form.effective_from || undefined} max={form.effective_to || undefined}
                      value={form.senior_effective_to} onChange={(e) => up({ senior_effective_to: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Must fall within the policy period. Empty = until the policy ends.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Maturity rules */}
            <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pol-compound">Compounding Frequency *</Label>
                <Select value={form.compounding_frequency} onValueChange={(v) => up({ compounding_frequency: v })}>
                  <SelectTrigger id="pol-compound" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPOUNDING_FREQUENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Applied when interest is paid at maturity; periodic payouts use simple interest.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pol-rounding">Maturity Amount Rounding *</Label>
                <Select value={form.maturity_rounding} onValueChange={(v) => up({ maturity_rounding: v })}>
                  <SelectTrigger id="pol-rounding" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATURITY_ROUNDING.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Interest uses actual days ÷ 365.</p>
              </div>
            </div>

            {/* Premature closure rules */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="pol-premature">Premature Closure Allowed</Label>
                  <p className="text-xs text-muted-foreground">Whether the deposit can be closed before maturity.</p>
                </div>
                <Switch id="pol-premature" checked={form.premature_closure_allowed} onCheckedChange={(c) => up({ premature_closure_allowed: c })} />
              </div>
              {form.premature_closure_allowed && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pol-lockin">Lock-in Period (days)</Label>
                    <Input id="pol-lockin" type="number" min="0" step="1" value={form.premature_lock_in_days} onChange={(e) => up({ premature_lock_in_days: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Premature closure is allowed only after this many days. 0 = any time.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pol-penal">Premature Penal Rate (% of interest earned)</Label>
                    <Input id="pol-penal" type="number" min="0" max="100" step="0.01" value={form.premature_penal_rate} onChange={(e) => up({ premature_penal_rate: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pol-remarks">Remarks</Label>
              <Input id="pol-remarks" maxLength={255} value={form.remarks} onChange={(e) => up({ remarks: e.target.value })} placeholder="Optional, e.g. board resolution reference" />
            </div>

            {formError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save as New Version" : "Save Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View ───────────────────────────────────────────────────────── */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewTerms?.policy_name}</DialogTitle>
            <DialogDescription>
              {viewing?.scheme_name || `Scheme ${viewing?.scheme_id}`} · Version {viewTerms?.version_no} ·{" "}
              {viewTerms?.status === "ACTIVE" ? "Active" : "Inactive"} · {accountsOpened} deposit{accountsOpened === 1 ? "" : "s"} opened under this policy
            </DialogDescription>
          </DialogHeader>
          {viewTerms && (
            <div className="space-y-5 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Effective Period" value={periodText(viewTerms)} />
                <Info label="Senior Citizen Benefit" value={seniorText(viewTerms)} />
                {viewTerms.senior_benefit_enabled && <Info label="Senior Benefit Period" value={seniorPeriodText(viewTerms)} />}
                <Info label="Compounding" value={labelOf(COMPOUNDING_FREQUENCIES, viewTerms.compounding_frequency)} />
                <Info label="Maturity Rounding" value={labelOf(MATURITY_ROUNDING, viewTerms.maturity_rounding)} />
                <Info
                  label="Premature Closure"
                  value={
                    viewTerms.premature_closure_allowed
                      ? `Allowed${viewTerms.premature_lock_in_days ? ` after ${viewTerms.premature_lock_in_days} days` : ""} · penal ${viewTerms.premature_penal_rate}% of interest`
                      : "Not allowed"
                  }
                />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Tenure</TableHead>
                      <TableHead className="text-xs">Regular Rate</TableHead>
                      {(viewTerms.senior_benefit_enabled || viewTerms.calculation_method === "AGE_WISE") && <TableHead className="text-xs">Senior Citizen Rate</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewTerms.rate_slabs || []).map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{tenureLabel(s.tenure_from_days, s.tenure_to_days)}</TableCell>
                        <TableCell className="text-xs">{s.interest_rate}% p.a.</TableCell>
                        {(viewTerms.senior_benefit_enabled || viewTerms.calculation_method === "AGE_WISE") && (
                          <TableCell className="text-xs">
                            {viewTerms.senior_benefit_enabled
                              ? Math.round((s.interest_rate + Number(viewTerms.senior_additional_rate || 0)) * 100) / 100
                              : s.senior_citizen_rate ?? s.interest_rate}% p.a.
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">History</p>
                {historyLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Version</TableHead>
                          <TableHead className="text-xs">Change</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Rates</TableHead>
                          <TableHead className="text-xs">Senior Citizen</TableHead>
                          <TableHead className="text-xs">Effective Period</TableHead>
                          <TableHead className="text-xs">Changed On</TableHead>
                          <TableHead className="text-xs">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((h) => (
                          <TableRow key={h.version_id}>
                            <TableCell className="text-xs">v{h.version_no}</TableCell>
                            <TableCell className="text-xs">{CHANGE_LABEL[h.change_type] || h.change_type}</TableCell>
                            <TableCell className="text-xs">{h.status === "ACTIVE" ? "Active" : "Inactive"}</TableCell>
                            <TableCell className="text-xs">{rateRange(h)}</TableCell>
                            <TableCell className="text-xs">{seniorText(h)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs">{periodText(h)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs">{formatDateTime(h.created_at)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{h.change_remarks || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Activate / Deactivate ──────────────────────────────────────── */}
      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && !statusSaving && setStatusTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"} Policy</DialogTitle>
            <DialogDescription>
              {statusTarget?.status === "ACTIVE"
                ? `"${statusTarget?.policy_name}" will no longer apply to new deposits. Deposits already opened are not affected.`
                : `"${statusTarget?.policy_name}" will apply to new deposits within its effective period.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="status-remarks">Remarks</Label>
            <Input id="status-remarks" maxLength={255} value={statusRemarks} onChange={(e) => setStatusRemarks(e.target.value)} placeholder="Optional reason" />
          </div>
          {statusError && <p className="text-sm text-destructive">{statusError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)} disabled={statusSaving}>Cancel</Button>
            <Button variant={statusTarget?.status === "ACTIVE" ? "destructive" : "default"} onClick={handleStatus} disabled={statusSaving}>
              {statusSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
