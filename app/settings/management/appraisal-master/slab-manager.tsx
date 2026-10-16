"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Pencil, Plus, Search } from "lucide-react"

interface AppraisalSlab {
  id: string
  appraisal_slab_id: number | null
  loan_amount_from: string
  loan_amount_to: string
  charge_type: "FIXED" | "PERCENTAGE"
  charge_value: string
  minimum_charge: string | null
  maximum_charge: string | null
  status: string | null
}

interface SlabManagerProps {
  master: { id: string; appraisal_master_id: number | null; appraisal_name: string | null } | null
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

const emptySlab = {
  loan_amount_from: "",
  loan_amount_to: "",
  charge_type: "FIXED" as "FIXED" | "PERCENTAGE",
  charge_value: "",
  minimum_charge: "",
  maximum_charge: "",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
}

const formatAmount = (value: string | null) =>
  value === null || value === "" ? "-" : Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })

export function SlabManager({ master, onOpenChange, onChanged }: SlabManagerProps) {
  const [slabs, setSlabs] = useState<AppraisalSlab[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [amountFilter, setAmountFilter] = useState("")

  // null = form hidden, "new" = adding, otherwise the slab row id being edited
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptySlab)
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!master) return
    setAmountFilter("")
    setEditingId(null)
    fetchSlabs(master.id)
  }, [master?.id])

  const fetchSlabs = async (masterId: string) => {
    try {
      setIsLoading(true)
      setLoadError("")
      const res = await fetch(`/api/settings/appraisal-masters/${masterId}/slabs`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch appraisal slabs")
      setSlabs(data.slabs)
    } catch (error: any) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const amount = Number(amountFilter)
    if (!amountFilter.trim() || Number.isNaN(amount)) return slabs
    return slabs.filter((s) => Number(s.loan_amount_from) <= amount && Number(s.loan_amount_to) >= amount)
  }, [slabs, amountFilter])

  const openAdd = () => {
    // Default the new slab to start right after the highest existing range
    const lastTo = slabs.reduce((max, s) => Math.max(max, Number(s.loan_amount_to)), 0)
    setFormData({ ...emptySlab, loan_amount_from: slabs.length ? String(lastTo + 1) : "" })
    setFormError("")
    setEditingId("new")
  }

  const openEdit = (s: AppraisalSlab) => {
    setFormData({
      loan_amount_from: String(Number(s.loan_amount_from)),
      loan_amount_to: String(Number(s.loan_amount_to)),
      charge_type: s.charge_type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
      charge_value: String(Number(s.charge_value)),
      minimum_charge: s.minimum_charge === null ? "" : String(Number(s.minimum_charge)),
      maximum_charge: s.maximum_charge === null ? "" : String(Number(s.maximum_charge)),
      status: s.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    })
    setFormError("")
    setEditingId(s.id)
  }

  const f = (key: keyof typeof emptySlab, value: string) => setFormData((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!master || !editingId) return
    const from = Number(formData.loan_amount_from)
    const to = Number(formData.loan_amount_to)
    if (!formData.loan_amount_from || !formData.loan_amount_to || to < from) {
      setFormError("Enter a valid loan amount range (To must be greater than or equal to From)")
      return
    }
    if (formData.charge_value === "") {
      setFormError("Charge value is required")
      return
    }

    try {
      setIsSaving(true)
      setFormError("")
      const isNew = editingId === "new"
      const res = await fetch(
        isNew
          ? `/api/settings/appraisal-masters/${master.id}/slabs`
          : `/api/settings/appraisal-masters/${master.id}/slabs/${editingId}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save appraisal slab")
      setEditingId(null)
      await fetchSlabs(master.id)
      onChanged()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!master} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configure Appraisal Slabs</DialogTitle>
          <DialogDescription>
            {master && `ID ${master.appraisal_master_id ?? "-"} · ${master.appraisal_name ?? ""}`}
          </DialogDescription>
        </DialogHeader>

        {master?.appraisal_master_id == null ? (
          <div className="text-center py-8 text-muted-foreground">
            This appraisal master has no master ID, so slabs cannot be configured.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 w-64"
                  type="number"
                  placeholder="Find slab for loan amount"
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                />
              </div>
              <Button className="gap-2" onClick={openAdd} disabled={isLoading}>
                <Plus className="h-4 w-4" />
                Add Slab
              </Button>
            </div>

            {editingId && (
              <div className="rounded-md border p-4 space-y-4">
                <h4 className="text-sm font-semibold">{editingId === "new" ? "New Slab" : "Edit Slab"}</h4>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="loan_amount_from">Loan Amount From *</Label>
                    <Input
                      id="loan_amount_from"
                      type="number"
                      min={0}
                      value={formData.loan_amount_from}
                      onChange={(e) => f("loan_amount_from", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan_amount_to">Loan Amount To *</Label>
                    <Input
                      id="loan_amount_to"
                      type="number"
                      min={0}
                      value={formData.loan_amount_to}
                      onChange={(e) => f("loan_amount_to", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="charge_type">Charge Type *</Label>
                    <Select value={formData.charge_type} onValueChange={(v) => f("charge_type", v)}>
                      <SelectTrigger id="charge_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                        <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="charge_value">
                      {formData.charge_type === "PERCENTAGE" ? "Charge (%) *" : "Charge Amount *"}
                    </Label>
                    <Input
                      id="charge_value"
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.charge_value}
                      onChange={(e) => f("charge_value", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum_charge">Minimum Charge</Label>
                    <Input
                      id="minimum_charge"
                      type="number"
                      min={0}
                      value={formData.minimum_charge}
                      onChange={(e) => f("minimum_charge", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maximum_charge">Maximum Charge</Label>
                    <Input
                      id="maximum_charge"
                      type="number"
                      min={0}
                      value={formData.maximum_charge}
                      onChange={(e) => f("maximum_charge", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <Label htmlFor="slab_status">Active</Label>
                      <p className="text-xs text-muted-foreground">Only active slabs are used for charges</p>
                    </div>
                    <Switch
                      id="slab_status"
                      checked={formData.status === "ACTIVE"}
                      onCheckedChange={(checked) => f("status", checked ? "ACTIVE" : "INACTIVE")}
                    />
                  </div>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingId(null)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingId === "new" ? "Add Slab" : "Save Slab"}
                  </Button>
                </div>
              </div>
            )}

            <div className="max-h-[45vh] overflow-y-auto rounded-md border">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading slabs...
                </div>
              ) : loadError ? (
                <div className="text-center py-8 text-destructive">{loadError}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {slabs.length === 0 ? "No slabs configured yet." : "No slab covers this loan amount."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Slab ID</TableHead>
                      <TableHead className="text-right">Amount From</TableHead>
                      <TableHead className="text-right">Amount To</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Charge</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Max</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.id} className={editingId === s.id ? "bg-muted/50" : ""}>
                        <TableCell className="font-mono text-sm">{s.appraisal_slab_id ?? "-"}</TableCell>
                        <TableCell className="text-right">{formatAmount(s.loan_amount_from)}</TableCell>
                        <TableCell className="text-right">{formatAmount(s.loan_amount_to)}</TableCell>
                        <TableCell>{s.charge_type === "PERCENTAGE" ? "Percentage" : "Fixed"}</TableCell>
                        <TableCell className="text-right">
                          {s.charge_type === "PERCENTAGE"
                            ? `${Number(s.charge_value)}%`
                            : formatAmount(s.charge_value)}
                        </TableCell>
                        <TableCell className="text-right">{formatAmount(s.minimum_charge)}</TableCell>
                        <TableCell className="text-right">{formatAmount(s.maximum_charge)}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>
                            {s.status === "ACTIVE" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {slabs.length} slab(s)
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
