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
import { ArrowLeft, ClipboardList, Search, Loader2, Pencil, Layers } from "lucide-react"
import { DashboardWrapper } from "../../../_components/dashboard-wrapper"
import { SlabManager } from "./slab-manager"

interface AppraisalMaster {
  id: string
  appraisal_master_id: number | null
  appraisal_name: string | null
  description: string | null
  effective_from: string | null
  effective_to: string | null
  status: string | null
  created_by: string | null
  created_date: string | null
  appraiser_amount_receive_account_number: string | null
  slab_count: number
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString("en-IN") : "-")

const emptyForm = {
  appraisal_name: "",
  description: "",
  effective_from: "",
  effective_to: "",
  appraiser_amount_receive_account_number: "",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
}

export default function AppraisalMasterPage() {
  const router = useRouter()
  const [masters, setMasters] = useState<AppraisalMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")

  const [editing, setEditing] = useState<AppraisalMaster | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [slabMaster, setSlabMaster] = useState<AppraisalMaster | null>(null)

  useEffect(() => {
    fetchMasters()
  }, [])

  const fetchMasters = async () => {
    try {
      setIsLoading(true)
      setLoadError("")
      const res = await fetch("/api/settings/appraisal-masters")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch appraisal masters")
      setMasters(data.appraisalMasters)
    } catch (error: any) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return masters
    return masters.filter((m) =>
      [String(m.appraisal_master_id ?? ""), m.appraisal_name, m.description].some((v) => v?.toLowerCase().includes(q))
    )
  }, [masters, search])

  const openEdit = (m: AppraisalMaster) => {
    setEditing(m)
    setFormData({
      appraisal_name: m.appraisal_name ?? "",
      description: m.description ?? "",
      effective_from: m.effective_from ?? "",
      effective_to: m.effective_to ?? "",
      appraiser_amount_receive_account_number: m.appraiser_amount_receive_account_number ?? "",
      status: m.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    })
    setFormError("")
  }

  const f = (key: keyof typeof emptyForm, value: string) => setFormData((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!editing) return
    if (!formData.appraisal_name.trim()) {
      setFormError("Appraisal name is required")
      return
    }
    if (formData.effective_from && formData.effective_to && formData.effective_to < formData.effective_from) {
      setFormError("Effective To cannot be before Effective From")
      return
    }

    try {
      setIsSaving(true)
      setFormError("")
      const res = await fetch(`/api/settings/appraisal-masters/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save appraisal master")
      setEditing(null)
      await fetchMasters()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const isExpired = (date: string | null) => !!date && new Date(date) < new Date(new Date().toDateString())

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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Appraisal Master Maintenance</h2>
              <p className="text-muted-foreground">View jewel loan appraisal charge masters</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Appraisal Masters</CardTitle>
                <CardDescription>{masters.length} appraisal master(s) configured</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 w-64"
                  placeholder="Search ID, name, description"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading appraisal masters...
              </div>
            ) : loadError ? (
              <div className="text-center py-8 text-destructive">{loadError}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {masters.length === 0 ? "No appraisal masters configured yet." : "No appraisal masters match your search."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Receive A/c</TableHead>
                    <TableHead className="text-right">Slabs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-sm">{m.appraisal_master_id ?? "-"}</TableCell>
                      <TableCell className="font-medium">{m.appraisal_name || "-"}</TableCell>
                      <TableCell className="text-sm max-w-xs">{m.description || "-"}</TableCell>
                      <TableCell>{formatDate(m.effective_from)}</TableCell>
                      <TableCell>
                        <span className={isExpired(m.effective_to) ? "text-destructive font-medium" : ""}>
                          {formatDate(m.effective_to)}
                          {isExpired(m.effective_to) && " (Expired)"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{m.appraiser_amount_receive_account_number || "-"}</TableCell>
                      <TableCell className="text-right">{m.slab_count}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === "ACTIVE" ? "default" : "secondary"}>
                          {m.status === "ACTIVE" ? "Active" : m.status ? "Inactive" : "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Appraisal Master</DialogTitle>
              <DialogDescription>
                {editing && `ID ${editing.appraisal_master_id ?? "-"} · Update the appraisal master's details`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="appraisal_name">Appraisal Name *</Label>
                <Input
                  id="appraisal_name"
                  maxLength={100}
                  value={formData.appraisal_name}
                  onChange={(e) => f("appraisal_name", e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={2}
                  maxLength={500}
                  value={formData.description}
                  onChange={(e) => f("description", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effective_from">Effective From</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => f("effective_from", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effective_to">Effective To</Label>
                <Input
                  id="effective_to"
                  type="date"
                  value={formData.effective_to}
                  onChange={(e) => f("effective_to", e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="appraiser_amount_receive_account_number">Receive Account Number</Label>
                <Input
                  id="appraiser_amount_receive_account_number"
                  maxLength={20}
                  value={formData.appraiser_amount_receive_account_number}
                  onChange={(e) => f("appraiser_amount_receive_account_number", e.target.value)}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="status">Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive masters are kept for history</p>
                </div>
                <Switch
                  id="status"
                  checked={formData.status === "ACTIVE"}
                  onCheckedChange={(checked) => f("status", checked ? "ACTIVE" : "INACTIVE")}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Appraisal Slabs</Label>
                <p className="text-xs text-muted-foreground">
                  {masters.find((m) => m.id === editing?.id)?.slab_count ?? editing?.slab_count ?? 0} slab(s) configured
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => setSlabMaster(editing)}>
                <Layers className="h-4 w-4" />
                Configure Slabs
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SlabManager
          master={slabMaster}
          onOpenChange={(open) => !open && setSlabMaster(null)}
          onChanged={fetchMasters}
        />
      </div>
    </DashboardWrapper>
  )
}
