"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Gem, Plus, Pencil, Search, Loader2, History } from "lucide-react"
import { DashboardWrapper } from "../../../_components/dashboard-wrapper"

interface Appraiser {
  appraiser_id: number
  appraiser_code: string
  appraiser_name: string
  license_no: string | null
  license_valid_till: string | null
  mobile_no: string | null
  email: string | null
  address: string | null
  status: "ACTIVE" | "INACTIVE"
}

interface AppraiserHistoryEntry {
  history_id: number
  action: "CREATED" | "UPDATED" | "ACTIVATED" | "DEACTIVATED"
  changes: Record<string, { old: string | null; new: string | null }> | null
  appraiser_code: string
  appraiser_name: string
  license_no: string | null
  license_valid_till: string | null
  mobile_no: string | null
  email: string | null
  address: string | null
  status: "ACTIVE" | "INACTIVE"
  changed_by_name: string | null
  changed_at: string
}

const FIELD_LABELS: Record<string, string> = {
  appraiser_code: "Appraiser Code",
  appraiser_name: "Appraiser Name",
  license_no: "License No",
  license_valid_till: "License Valid Till",
  mobile_no: "Mobile No",
  email: "Email",
  address: "Address",
  status: "Status",
}

const ACTION_STYLES: Record<AppraiserHistoryEntry["action"], { label: string; className: string }> = {
  CREATED: { label: "Created", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
  UPDATED: { label: "Updated", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  ACTIVATED: { label: "Activated", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
  DEACTIVATED: { label: "Deactivated", className: "bg-slate-200 text-slate-800 hover:bg-slate-200" },
}

const formatHistoryValue = (field: string, value: string | null) => {
  if (value === null || value === "") return "—"
  if (field === "license_valid_till") return new Date(value).toLocaleDateString("en-IN")
  if (field === "status") return value === "ACTIVE" ? "Active" : "Inactive"
  return value
}

const emptyForm = {
  appraiser_code: "",
  appraiser_name: "",
  license_no: "",
  license_valid_till: "",
  mobile_no: "",
  email: "",
  address: "",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
}

export default function AppraisersPage() {
  const router = useRouter()
  const [appraisers, setAppraisers] = useState<Appraiser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const [historyFor, setHistoryFor] = useState<Appraiser | null>(null)
  const [history, setHistory] = useState<AppraiserHistoryEntry[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState("")

  useEffect(() => {
    fetchAppraisers()
  }, [])

  const fetchAppraisers = async () => {
    try {
      setIsLoading(true)
      setLoadError("")
      const res = await fetch("/api/settings/appraisers")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch appraisers")
      setAppraisers(data.appraisers)
    } catch (error: any) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return appraisers
    return appraisers.filter((a) =>
      [a.appraiser_code, a.appraiser_name, a.license_no, a.mobile_no].some((v) => v?.toLowerCase().includes(q))
    )
  }, [appraisers, search])

  const openAdd = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setFormError("")
    setIsDialogOpen(true)
  }

  const openEdit = (a: Appraiser) => {
    setEditingId(a.appraiser_id)
    setFormData({
      appraiser_code: a.appraiser_code,
      appraiser_name: a.appraiser_name,
      license_no: a.license_no ?? "",
      license_valid_till: a.license_valid_till ?? "",
      mobile_no: a.mobile_no ?? "",
      email: a.email ?? "",
      address: a.address ?? "",
      status: a.status,
    })
    setFormError("")
    setIsDialogOpen(true)
  }

  const f = (key: keyof typeof emptyForm, value: string) => setFormData((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!formData.appraiser_code.trim() || !formData.appraiser_name.trim()) {
      setFormError("Appraiser code and name are required")
      return
    }
    if (formData.mobile_no && !/^\d{10}$/.test(formData.mobile_no.trim())) {
      setFormError("Mobile number must be 10 digits")
      return
    }

    try {
      setIsSaving(true)
      setFormError("")
      const res = await fetch(
        editingId ? `/api/settings/appraisers/${editingId}` : "/api/settings/appraisers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save appraiser")
      setIsDialogOpen(false)
      await fetchAppraisers()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const openHistory = async (a: Appraiser) => {
    setHistoryFor(a)
    setHistory([])
    setHistoryError("")
    try {
      setIsHistoryLoading(true)
      const res = await fetch(`/api/settings/appraisers/${a.appraiser_id}/history`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch appraiser history")
      setHistory(data.history)
    } catch (error: any) {
      setHistoryError(error.message)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const isLicenseExpired = (date: string | null) => !!date && new Date(date) < new Date(new Date().toDateString())

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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50">
              <Gem className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Manage Appraiser Details</h2>
              <p className="text-muted-foreground">Maintain jewel loan appraisers for this branch</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Appraisers</CardTitle>
                <CardDescription>{appraisers.length} appraiser(s) registered</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 w-64"
                    placeholder="Search code, name, license, mobile"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button className="gap-2" onClick={openAdd}>
                  <Plus className="h-4 w-4" />
                  Add Appraiser
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading appraisers...
              </div>
            ) : loadError ? (
              <div className="text-center py-8 text-destructive">{loadError}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {appraisers.length === 0 ? "No appraisers added yet." : "No appraisers match your search."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>License No</TableHead>
                    <TableHead>Valid Till</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.appraiser_id}>
                      <TableCell className="font-mono text-sm">{a.appraiser_code}</TableCell>
                      <TableCell className="font-medium">{a.appraiser_name}</TableCell>
                      <TableCell>{a.license_no || "-"}</TableCell>
                      <TableCell>
                        {a.license_valid_till ? (
                          <span className={isLicenseExpired(a.license_valid_till) ? "text-destructive font-medium" : ""}>
                            {new Date(a.license_valid_till).toLocaleDateString("en-IN")}
                            {isLicenseExpired(a.license_valid_till) && " (Expired)"}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{a.mobile_no || "-"}</TableCell>
                      <TableCell className="text-sm">{a.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "ACTIVE" ? "default" : "secondary"}>
                          {a.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="History" onClick={() => openHistory(a)}>
                          <History className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Appraiser" : "Add Appraiser"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update the appraiser's details" : "Register a new jewel loan appraiser"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appraiser_code">Appraiser Code *</Label>
                <Input
                  id="appraiser_code"
                  placeholder="APR001"
                  value={formData.appraiser_code}
                  onChange={(e) => f("appraiser_code", e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appraiser_name">Appraiser Name *</Label>
                <Input
                  id="appraiser_name"
                  placeholder="Full name"
                  value={formData.appraiser_name}
                  onChange={(e) => f("appraiser_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_no">License No</Label>
                <Input
                  id="license_no"
                  placeholder="License number"
                  value={formData.license_no}
                  onChange={(e) => f("license_no", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_valid_till">License Valid Till</Label>
                <Input
                  id="license_valid_till"
                  type="date"
                  value={formData.license_valid_till}
                  onChange={(e) => f("license_valid_till", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_no">Mobile No</Label>
                <Input
                  id="mobile_no"
                  placeholder="10-digit mobile"
                  maxLength={10}
                  value={formData.mobile_no}
                  onChange={(e) => f("mobile_no", e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => f("email", e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => f("address", e.target.value)}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="status">Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive appraisers are kept for history</p>
                </div>
                <Switch
                  id="status"
                  checked={formData.status === "ACTIVE"}
                  onCheckedChange={(checked) => f("status", checked ? "ACTIVE" : "INACTIVE")}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? "Save Changes" : "Add Appraiser"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!historyFor} onOpenChange={(open) => !open && setHistoryFor(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Appraiser History</DialogTitle>
              <DialogDescription>
                {historyFor && `${historyFor.appraiser_code} — ${historyFor.appraiser_name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {isHistoryLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading history...
                </div>
              ) : historyError ? (
                <div className="text-center py-8 text-destructive">{historyError}</div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No history recorded for this appraiser.</div>
              ) : (
                <ol className="space-y-3">
                  {history.map((h) => (
                    <li key={h.history_id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge className={ACTION_STYLES[h.action]?.className}>
                          {ACTION_STYLES[h.action]?.label ?? h.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.changed_at).toLocaleString("en-IN")}
                          {h.changed_by_name && ` · by ${h.changed_by_name}`}
                        </span>
                      </div>
                      {h.action === "CREATED" || !h.changes ? (
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {Object.keys(FIELD_LABELS).map((field) => (
                            <div key={field} className="flex gap-2">
                              <dt className="text-muted-foreground shrink-0">{FIELD_LABELS[field]}:</dt>
                              <dd className="break-words">
                                {formatHistoryValue(field, h[field as keyof AppraiserHistoryEntry] as string | null)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <Table className="mt-2">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8">Field</TableHead>
                              <TableHead className="h-8">Old Value</TableHead>
                              <TableHead className="h-8">New Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(h.changes).map(([field, change]) => (
                              <TableRow key={field}>
                                <TableCell className="py-1.5 font-medium">{FIELD_LABELS[field] ?? field}</TableCell>
                                <TableCell className="py-1.5 text-muted-foreground line-through">
                                  {formatHistoryValue(field, change.old)}
                                </TableCell>
                                <TableCell className="py-1.5">{formatHistoryValue(field, change.new)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardWrapper>
  )
}
