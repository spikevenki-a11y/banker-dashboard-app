"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Target, Settings2, Search, Loader2, Plus, Pencil } from "lucide-react"
import { DashboardWrapper } from "../../../_components/dashboard-wrapper"

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

export default function LoanPurposeMappingPage() {
  const router = useRouter()
  const [schemes, setSchemes] = useState<LoanScheme[]>([])
  const [purposes, setPurposes] = useState<LoanPurpose[]>([])
  const [mapping, setMapping] = useState<Record<number, number[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [purposeSearch, setPurposeSearch] = useState("")

  // Purpose add/rename dialog (editingPurpose null + open = add)
  const [purposeDialogOpen, setPurposeDialogOpen] = useState(false)
  const [editingPurpose, setEditingPurpose] = useState<LoanPurpose | null>(null)
  const [purposeName, setPurposeName] = useState("")
  const [purposeError, setPurposeError] = useState("")
  const [isSavingPurpose, setIsSavingPurpose] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [toggleError, setToggleError] = useState("")

  useEffect(() => {
    fetchConfiguration()
  }, [])

  const fetchConfiguration = async () => {
    try {
      setIsLoading(true)
      setLoadError("")
      const res = await fetch("/api/settings/loan-purpose-mapping")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch purpose mapping")
      setSchemes(data.schemes)
      setPurposes(data.purposes.map((p: LoanPurpose) => ({ ...p, purpose_id: Number(p.purpose_id) })))
      const grouped: Record<number, number[]> = {}
      for (const m of data.mappings as { scheme_id: number; purpose_id: number }[]) {
        ;(grouped[m.scheme_id] ??= []).push(Number(m.purpose_id))
      }
      setMapping(grouped)
    } catch (error: any) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const purposeById = useMemo(() => new Map(purposes.map((p) => [p.purpose_id, p])), [purposes])

  // How many schemes in this branch use each purpose
  const usageCount = useMemo(() => {
    const counts = new Map<number, number>()
    for (const ids of Object.values(mapping)) for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
    return counts
  }, [mapping])

  const filteredSchemes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return schemes
    return schemes.filter((s) =>
      [String(s.scheme_id), s.scheme_name, s.loan_type].some((v) => v?.toLowerCase().includes(q))
    )
  }, [schemes, search])

  const filteredPurposes = useMemo(() => {
    const q = purposeSearch.trim().toLowerCase()
    if (!q) return purposes
    return purposes.filter((p) => String(p.purpose_id).includes(q) || p.purpose_name.toLowerCase().includes(q))
  }, [purposes, purposeSearch])

  const configuredCount = schemes.filter((s) => (mapping[s.scheme_id]?.length ?? 0) > 0).length
  const activePurposeCount = purposes.filter((p) => p.is_active).length

  // ---- Purpose master ----
  const openAddPurpose = () => {
    setEditingPurpose(null)
    setPurposeName("")
    setPurposeError("")
    setPurposeDialogOpen(true)
  }

  const openRenamePurpose = (purpose: LoanPurpose) => {
    setEditingPurpose(purpose)
    setPurposeName(purpose.purpose_name)
    setPurposeError("")
    setPurposeDialogOpen(true)
  }

  const handleSavePurpose = async () => {
    const name = purposeName.trim()
    if (!name) {
      setPurposeError("Purpose name is required.")
      return
    }
    try {
      setIsSavingPurpose(true)
      setPurposeError("")
      const res = await fetch("/api/settings/loan-purpose-mapping", {
        method: editingPurpose ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingPurpose ? { purpose_id: editingPurpose.purpose_id, purpose_name: name } : { purpose_name: name }
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save loan purpose")
      const saved: LoanPurpose = { ...data.purpose, purpose_id: Number(data.purpose.purpose_id) }
      setPurposes((prev) =>
        editingPurpose
          ? prev.map((p) => (p.purpose_id === saved.purpose_id ? saved : p))
          : [...prev, saved].sort((a, b) => a.purpose_id - b.purpose_id)
      )
      setPurposeDialogOpen(false)
    } catch (error: any) {
      setPurposeError(error.message)
    } finally {
      setIsSavingPurpose(false)
    }
  }

  const handleToggleActive = async (purpose: LoanPurpose, isActive: boolean) => {
    try {
      setTogglingId(purpose.purpose_id)
      setToggleError("")
      const res = await fetch("/api/settings/loan-purpose-mapping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose_id: purpose.purpose_id, is_active: isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update loan purpose")
      setPurposes((prev) => prev.map((p) => (p.purpose_id === purpose.purpose_id ? { ...p, is_active: isActive } : p)))
    } catch (error: any) {
      setToggleError(error.message)
    } finally {
      setTogglingId(null)
    }
  }

  const loadingOrError = isLoading ? (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading configuration...
    </div>
  ) : loadError ? (
    <div className="text-center py-8 text-destructive">{loadError}</div>
  ) : null

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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50">
              <Target className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Loan Purpose Mapping</h2>
              <p className="text-muted-foreground">Maintain loan purposes and choose which ones each loan scheme allows</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="mapping" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mapping">Scheme Mapping</TabsTrigger>
            <TabsTrigger value="master">Purpose Master</TabsTrigger>
          </TabsList>

          <TabsContent value="mapping">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Loan Schemes</CardTitle>
                    <CardDescription>
                      {configuredCount} of {schemes.length} scheme(s) have purposes mapped
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 w-64"
                      placeholder="Search scheme code, name, type"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingOrError ??
                  (filteredSchemes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {schemes.length === 0 ? "No loan schemes found for this branch." : "No schemes match your search."}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scheme Code</TableHead>
                          <TableHead>Scheme Name</TableHead>
                          <TableHead>Loan Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Allowed Purposes</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSchemes.map((s) => {
                          const mapped = mapping[s.scheme_id] ?? []
                          return (
                            <TableRow key={s.scheme_id}>
                              <TableCell className="font-mono text-sm">{s.scheme_id}</TableCell>
                              <TableCell className="font-medium">{s.scheme_name}</TableCell>
                              <TableCell>{s.loan_type}</TableCell>
                              <TableCell>
                                <Badge variant={s.scheme_status === "ACTIVE" ? "default" : "secondary"}>
                                  {s.scheme_status === "ACTIVE" ? "Active" : s.scheme_status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {mapped.length === 0 ? (
                                  <span className="text-sm text-destructive">Not mapped</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {mapped.map((id) => {
                                      const purpose = purposeById.get(id)
                                      return (
                                        <Badge
                                          key={id}
                                          variant="outline"
                                          className={purpose?.is_active === false ? "line-through text-muted-foreground" : ""}
                                        >
                                          {purpose?.purpose_name ?? `#${id}`}
                                        </Badge>
                                      )
                                    })}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push(`/settings/management/loan-purpose-mapping/${s.scheme_id}`)}>
                                  <Settings2 className="h-4 w-4" />
                                  Map Purposes
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="master">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Loan Purposes</CardTitle>
                    <CardDescription>
                      {activePurposeCount} of {purposes.length} purpose(s) active. Purposes are shared by all branches.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8 w-56"
                        placeholder="Search purpose"
                        value={purposeSearch}
                        onChange={(e) => setPurposeSearch(e.target.value)}
                      />
                    </div>
                    <Button className="gap-2" onClick={openAddPurpose} disabled={isLoading || !!loadError}>
                      <Plus className="h-4 w-4" />
                      Add Purpose
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {toggleError && <p className="text-sm text-destructive">{toggleError}</p>}
                {loadingOrError ??
                  (filteredPurposes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {purposes.length === 0 ? "No loan purposes defined yet." : "No purposes match your search."}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Purpose ID</TableHead>
                          <TableHead>Purpose Name</TableHead>
                          <TableHead>Schemes Using (this branch)</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPurposes.map((p) => (
                          <TableRow key={p.purpose_id}>
                            <TableCell className="font-mono text-sm">{p.purpose_id}</TableCell>
                            <TableCell className={p.is_active ? "font-medium" : "font-medium text-muted-foreground"}>
                              {p.purpose_name}
                            </TableCell>
                            <TableCell>{usageCount.get(p.purpose_id) ?? 0}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={p.is_active}
                                  disabled={togglingId === p.purpose_id}
                                  onCheckedChange={(checked) => handleToggleActive(p, checked)}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {p.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => openRenamePurpose(p)}>
                                <Pencil className="h-4 w-4" />
                                Rename
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add or rename a purpose */}
      <Dialog open={purposeDialogOpen} onOpenChange={(open) => !open && !isSavingPurpose && setPurposeDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPurpose ? "Rename Loan Purpose" : "Add Loan Purpose"}</DialogTitle>
            <DialogDescription>
              {editingPurpose
                ? `Purpose ID ${editingPurpose.purpose_id}. The new name applies to all branches.`
                : "The new purpose becomes available to map in every branch."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="purpose-name">Purpose Name *</Label>
            <Input
              id="purpose-name"
              value={purposeName}
              maxLength={255}
              autoFocus
              placeholder="e.g. Business Expansion"
              onChange={(e) => setPurposeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isSavingPurpose && handleSavePurpose()}
            />
          </div>

          {purposeError && <p className="text-sm text-destructive">{purposeError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPurposeDialogOpen(false)} disabled={isSavingPurpose}>
              Cancel
            </Button>
            <Button onClick={handleSavePurpose} disabled={isSavingPurpose}>
              {isSavingPurpose && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingPurpose ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
