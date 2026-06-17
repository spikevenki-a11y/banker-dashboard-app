"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus, Search, Loader2, AlertCircle, Lock, LockOpen, KeyRound,
  LayoutGrid, Banknote, UserCheck, Settings2, X, Grid3X3,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type LockerDeposit = {
  id: string
  account_number: string
  membership_no: string
  member_name: string
  deposit_amount: number
  interest_rate: number
  period_years: number
  opening_date: string
  expiry_date: string
  status: string
  nominee_name: string | null
  nominee_relation: string | null
  locker_id: string | null
  locker_no: string | null
  locker_location: string | null
  locker_type: string | null
  annual_rent: number | null
}

type LockerInventoryItem = {
  id: string
  locker_no: string
  status: string
  location: string | null
  type_id: number
  type_name: string
  dimensions: string | null
  annual_rent: number
  deposit_account: string | null
  membership_no: string | null
  member_name: string | null
  expiry_date: string | null
}

type LockerType = {
  id: number
  type_name: string
  dimensions: string | null
  annual_rent: number
  no_of_lockers: number
  no_of_rows: number
  no_of_cabinets: number
}

type ListStats = {
  total: string
  active: string
  total_deposit: string
  assigned: string
}

type InventoryStats = {
  total: string
  available: string
  allocated: string
  maintenance: string
}

const fmt = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase()
  const cls =
    s === "ACTIVE" || s === "AVAILABLE"
      ? "bg-teal-100 text-teal-700 border-teal-200"
      : s === "ALLOCATED"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : s === "MAINTENANCE"
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : "bg-gray-100 text-gray-700 border-gray-200"
  return (
    <Badge variant="outline" className={cls}>
      {status}
    </Badge>
  )
}

export default function LockersPage() {
  const router = useRouter()

  // Locker accounts state
  const [deposits, setDeposits] = useState<LockerDeposit[]>([])
  const [listStats, setListStats] = useState<ListStats | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Inventory state
  const [inventory, setInventory] = useState<LockerInventoryItem[]>([])
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(true)
  const [inventoryError, setInventoryError] = useState("")

  // Locker types (for add-locker dialog)
  const [lockerTypes, setLockerTypes] = useState<LockerType[]>([])

  // Add Locker dialog
  const [addLockerOpen, setAddLockerOpen] = useState(false)
  const [newLockerNo, setNewLockerNo] = useState("")
  const [newLockerTypeId, setNewLockerTypeId] = useState("")
  const [newLockerLocation, setNewLockerLocation] = useState("")
  const [addLockerSubmitting, setAddLockerSubmitting] = useState(false)
  const [addLockerError, setAddLockerError] = useState("")

  // Add Type dialog
  const [addTypeOpen, setAddTypeOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeDimensions, setNewTypeDimensions] = useState("")
  const [newTypeRent, setNewTypeRent] = useState("")
  const [newTypeRows, setNewTypeRows] = useState("")
  const [newTypeCabinets, setNewTypeCabinets] = useState("")
  const [addTypeSubmitting, setAddTypeSubmitting] = useState(false)
  const [addTypeError, setAddTypeError] = useState("")

  // Assign locker dialog (for deposits without a locker)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignDeposit, setAssignDeposit] = useState<LockerDeposit | null>(null)
  const [availableLockers, setAvailableLockers] = useState<LockerInventoryItem[]>([])
  const [selectedLockerId, setSelectedLockerId] = useState("")
  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [assignError, setAssignError] = useState("")
  const [availableLoading, setAvailableLoading] = useState(false)

  const fetchDeposits = useCallback(async () => {
    setListLoading(true)
    setListError("")
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/lockers/list?${params}`, { credentials: "include" })
      const data = await res.json()
      if (data.success) {
        setDeposits(data.deposits || [])
        setListStats(data.stats)
      } else {
        setListError(data.error || "Failed to load")
      }
    } catch {
      setListError("Network error. Please try again.")
    } finally {
      setListLoading(false)
    }
  }, [search, statusFilter])

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true)
    setInventoryError("")
    try {
      const res = await fetch("/api/lockers/inventory", { credentials: "include" })
      const data = await res.json()
      if (data.success) {
        setInventory(data.lockers || [])
        setInventoryStats(data.stats)
      } else {
        setInventoryError(data.error || "Failed to load")
      }
    } catch {
      setInventoryError("Network error. Please try again.")
    } finally {
      setInventoryLoading(false)
    }
  }, [])

  const fetchLockerTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/lockers/types", { credentials: "include" })
      const data = await res.json()
      if (data.success) setLockerTypes(data.types || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchDeposits()
  }, [fetchDeposits])

  useEffect(() => {
    fetchInventory()
    fetchLockerTypes()
  }, [fetchInventory, fetchLockerTypes])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchDeposits(), 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddLocker = async () => {
    if (!newLockerNo.trim() || !newLockerTypeId) return
    setAddLockerSubmitting(true)
    setAddLockerError("")
    console.log("Adding locker with", { newLockerNo, newLockerTypeId, newLockerLocation })
    try {
      const res = await fetch("/api/lockers/inventory", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locker_no: newLockerNo,
          locker_type_id: newLockerTypeId,
          location: newLockerLocation,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAddLockerOpen(false)
        setNewLockerNo("")
        setNewLockerTypeId("")
        setNewLockerLocation("")
        fetchInventory()
      } else {
        setAddLockerError(data.error || "Failed to add locker")
      }
    } catch {
      setAddLockerError("Network error. Please try again.")
    } finally {
      setAddLockerSubmitting(false)
    }
  }

  const handleAddType = async () => {
    if (!newTypeName.trim()) return
    setAddTypeSubmitting(true)
    setAddTypeError("")
    try {
      const res = await fetch("/api/lockers/types", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_name: newTypeName,
          dimensions: newTypeDimensions,
          annual_rent: newTypeRent,
          no_of_rows: newTypeRows,
          no_of_cabinets: newTypeCabinets,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAddTypeOpen(false)
        setNewTypeName("")
        setNewTypeDimensions("")
        setNewTypeRent("")
        setNewTypeRows("")
        setNewTypeCabinets("")
        fetchLockerTypes()
        fetchInventory()
      } else {
        setAddTypeError(data.error || "Failed to create type")
      }
    } catch {
      setAddTypeError("Network error. Please try again.")
    } finally {
      setAddTypeSubmitting(false)
    }
  }

  const openAssignDialog = async (deposit: LockerDeposit) => {
    setAssignDeposit(deposit)
    setSelectedLockerId("")
    setAssignError("")
    setAssignOpen(true)
    setAvailableLoading(true)
    try {
      const res = await fetch("/api/lockers/available", { credentials: "include" })
      const data = await res.json()
      if (data.success) setAvailableLockers(data.lockers || [])
    } catch {}
    setAvailableLoading(false)
  }

  const handleAssign = async () => {
    if (!assignDeposit || !selectedLockerId) return
    setAssignSubmitting(true)
    setAssignError("")
    try {
      const res = await fetch("/api/lockers/assign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deposit_id: assignDeposit.id, locker_id: selectedLockerId }),
      })
      const data = await res.json()
      if (data.success) {
        setAssignOpen(false)
        fetchDeposits()
        fetchInventory()
      } else {
        setAssignError(data.error || "Failed to assign locker")
      }
    } catch {
      setAssignError("Network error. Please try again.")
    } finally {
      setAssignSubmitting(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Lockers</h1>
            <p className="text-muted-foreground">Manage locker allocation, deposits, and inventory</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/lockers/allocation")}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Grid3X3 className="h-4 w-4" />
              Visual Allocation
            </Button>
            <Button onClick={() => router.push("/lockers/create-deposit")} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="h-4 w-4" />
              Create Deposit
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              label: "Total Deposits",
              value: listStats ? String(listStats.total) : "—",
              icon: Banknote,
              color: "bg-amber-50 text-amber-600",
            },
            {
              label: "Active Deposits",
              value: listStats ? String(listStats.active) : "—",
              icon: KeyRound,
              color: "bg-teal-50 text-teal-600",
            },
            {
              label: "Total Deposit Amount",
              value: listStats ? fmt(listStats.total_deposit) : "—",
              icon: Banknote,
              color: "bg-blue-50 text-blue-600",
            },
            {
              label: "Available Lockers",
              value: inventoryStats ? String(inventoryStats.available) : "—",
              icon: LockOpen,
              color: "bg-green-50 text-green-600",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-6">
                <div className={`w-fit rounded-lg p-3 ${color.split(" ")[0]}`}>
                  <Icon className={`h-6 w-6 ${color.split(" ")[1]}`} />
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  {listLoading && inventoryLoading ? (
                    <Skeleton className="mt-1 h-8 w-24" />
                  ) : (
                    <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="accounts">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="accounts" className="gap-1.5">
              <KeyRound className="h-4 w-4" />
              Locker Accounts
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          </TabsList>

          {/* ── Locker Accounts tab ────────────────────────────────── */}
          <TabsContent value="accounts" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search account, member, locker no…"
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); fetchDeposits() }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {listError ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm text-destructive">{listError}</p>
                    <Button variant="outline" size="sm" onClick={fetchDeposits}>Retry</Button>
                  </div>
                ) : listLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : deposits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <KeyRound className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "No deposits found matching your search."
                        : "No locker deposits yet. Create the first one."}
                    </p>
                    {!search && statusFilter === "all" && (
                      <Button variant="outline" size="sm" onClick={() => router.push("/lockers/create-deposit")}>
                        <Plus className="mr-2 h-4 w-4" />Create Deposit
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account No</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Locker</TableHead>
                        <TableHead className="text-right">Deposit</TableHead>
                        <TableHead>Rate / Rent</TableHead>
                        <TableHead>Opening</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map((dep) => (
                        <TableRow key={dep.id}>
                          <TableCell className="font-mono font-medium text-sm">{dep.account_number}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{dep.member_name}</p>
                            <p className="text-xs text-muted-foreground">M# {dep.membership_no}</p>
                          </TableCell>
                          <TableCell>
                            {dep.locker_no ? (
                              <div>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                                  {dep.locker_no}
                                </Badge>
                                {dep.locker_type && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{dep.locker_type}</p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{fmt(dep.deposit_amount)}</TableCell>
                          <TableCell>
                            <p className="text-sm">{dep.interest_rate}% p.a.</p>
                            {dep.annual_rent != null && (
                              <p className="text-xs text-muted-foreground">Rent: {fmt(dep.annual_rent)}/yr</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{dep.opening_date || "—"}</TableCell>
                          <TableCell className="text-sm">{dep.expiry_date || "—"}</TableCell>
                          <TableCell>
                            <StatusBadge status={dep.status} />
                          </TableCell>
                          <TableCell>
                            {dep.status === "ACTIVE" && !dep.locker_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-7 text-amber-700 border-amber-300 hover:bg-amber-50"
                                onClick={() => openAssignDialog(dep)}
                              >
                                <Lock className="h-3 w-3" />
                                Assign
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {!listLoading && deposits.length > 0 && (
                  <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
                    {deposits.length} deposit{deposits.length !== 1 ? "s" : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Inventory tab ─────────────────────────────────────── */}
          <TabsContent value="inventory" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    {inventoryStats && [
                      { label: "Total", value: inventoryStats.total, cls: "bg-gray-100 text-gray-700" },
                      { label: "Available", value: inventoryStats.available, cls: "bg-teal-100 text-teal-700" },
                      { label: "Allocated", value: inventoryStats.allocated, cls: "bg-blue-100 text-blue-700" },
                      { label: "Maintenance", value: inventoryStats.maintenance, cls: "bg-orange-100 text-orange-700" },
                    ].map(({ label, value, cls }) => (
                      <span key={label} className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
                        {label}: {value}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs bg-transparent"
                      onClick={() => { setAddTypeOpen(true); setAddTypeError("") }}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Manage Types
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => { setAddLockerOpen(true); setAddLockerError("") }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Locker
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {inventoryError ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm text-destructive">{inventoryError}</p>
                    <Button variant="outline" size="sm" onClick={fetchInventory}>Retry</Button>
                  </div>
                ) : inventoryLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <LayoutGrid className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No lockers in inventory. Add lockers to get started.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAddLockerOpen(true); setAddLockerError("") }}
                    >
                      <Plus className="mr-2 h-4 w-4" />Add Locker
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Locker No</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Annual Rent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Expiry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((locker) => (
                        <TableRow key={locker.id}>
                          <TableCell className="font-mono font-semibold">{locker.locker_no}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{locker.type_name}</p>
                            {locker.dimensions && (
                              <p className="text-xs text-muted-foreground">{locker.dimensions}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{locker.location || "—"}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{fmt(locker.annual_rent)}</TableCell>
                          <TableCell>
                            <StatusBadge status={locker.status} />
                          </TableCell>
                          <TableCell>
                            {locker.member_name ? (
                              <div>
                                <p className="text-sm font-medium flex items-center gap-1">
                                  <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                                  {locker.member_name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">{locker.deposit_account}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{locker.expiry_date || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Add Locker Dialog ─────────────────────────────────── */}
        <Dialog open={addLockerOpen} onOpenChange={setAddLockerOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                Add Locker to Inventory
              </DialogTitle>
              <DialogDescription>Enter locker details to add it to the branch vault.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="new-locker-no">Locker Number *</Label>
                <Input
                  id="new-locker-no"
                  placeholder="e.g. A-01"
                  value={newLockerNo}
                  onChange={(e) => setNewLockerNo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Locker Type *</Label>
                {lockerTypes.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-3 text-center">
                    <p className="text-sm text-muted-foreground">No locker types defined yet.</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto p-0 text-xs text-amber-600"
                      onClick={() => { setAddLockerOpen(false); setAddTypeOpen(true) }}
                    >
                      Create a type first
                    </Button>
                  </div>
                ) : (
                  <Select value={newLockerTypeId} onValueChange={setNewLockerTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select locker type" />
                    </SelectTrigger>
                    <SelectContent>
                      {lockerTypes.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.type_name} — {fmt(t.annual_rent)}/yr
                          {t.dimensions ? ` (${t.dimensions})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-locker-location">Location (optional)</Label>
                <Input
                  id="new-locker-location"
                  placeholder="e.g. Row A, Cabinet 3"
                  value={newLockerLocation}
                  onChange={(e) => setNewLockerLocation(e.target.value)}
                />
              </div>
              {addLockerError && <p className="text-sm text-destructive">{addLockerError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddLockerOpen(false)}>Cancel</Button>
              <Button
                disabled={!newLockerNo.trim() || !newLockerTypeId || addLockerSubmitting}
                onClick={handleAddLocker}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {addLockerSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Locker
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Manage Types Dialog ───────────────────────────────── */}
        <Dialog open={addTypeOpen} onOpenChange={(open) => {
          setAddTypeOpen(open)
          if (!open) {
            setNewTypeName(""); setNewTypeDimensions(""); setNewTypeRent("")
            setNewTypeRows(""); setNewTypeCabinets(""); setAddTypeError("")
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-amber-600" />
                Create Locker Type
              </DialogTitle>
              <DialogDescription>
                Define a new locker size/category. Lockers are auto-generated from the row and cabinet configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="new-type-name">Type Name *</Label>
                <Input
                  id="new-type-name"
                  placeholder="e.g. Small, Medium, Large"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-type-dimensions">Dimensions (optional)</Label>
                <Input
                  id="new-type-dimensions"
                  placeholder="e.g. 12×8×5 inches"
                  value={newTypeDimensions}
                  onChange={(e) => setNewTypeDimensions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-type-rent">Annual Rent (₹)</Label>
                <Input
                  id="new-type-rent"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newTypeRent}
                  onChange={(e) => setNewTypeRent(e.target.value)}
                />
              </div>

              {/* Locker generation config */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                  Auto-Generate Lockers
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-type-rows" className="text-xs">Number of Rows</Label>
                    <Input
                      id="new-type-rows"
                      type="number"
                      min="0"
                      placeholder="e.g. 3"
                      value={newTypeRows}
                      onChange={(e) => setNewTypeRows(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-type-cabinets" className="text-xs">Cabinets per Row</Label>
                    <Input
                      id="new-type-cabinets"
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={newTypeCabinets}
                      onChange={(e) => setNewTypeCabinets(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                {(parseInt(newTypeRows) > 0 && parseInt(newTypeCabinets) > 0) ? (
                  <div className="flex items-center gap-1.5 rounded-md bg-teal-50 border border-teal-200 px-3 py-2 text-xs text-teal-800">
                    <Grid3X3 className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {parseInt(newTypeRows)} rows × {parseInt(newTypeCabinets)} cabinets ={" "}
                      <strong>{parseInt(newTypeRows) * parseInt(newTypeCabinets)} lockers</strong> will be auto-created
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Leave rows/cabinets blank to skip auto-generation and add lockers manually.
                  </p>
                )}
              </div>

              {lockerTypes.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Existing Types</p>
                  {lockerTypes.map((t) => (
                    <div key={t.id} className="flex justify-between py-1 text-sm">
                      <span className="font-medium">{t.type_name}</span>
                      <span className="text-muted-foreground">
                        {t.no_of_lockers > 0 ? `${t.no_of_lockers} lockers · ` : ""}
                        {fmt(t.annual_rent)}/yr
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {addTypeError && <p className="text-sm text-destructive">{addTypeError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddTypeOpen(false)}>Cancel</Button>
              <Button
                disabled={!newTypeName.trim() || addTypeSubmitting}
                onClick={handleAddType}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {addTypeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {parseInt(newTypeRows) > 0 && parseInt(newTypeCabinets) > 0
                  ? `Create & Generate ${parseInt(newTypeRows) * parseInt(newTypeCabinets)} Lockers`
                  : "Create Type"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Assign Locker Dialog ──────────────────────────────── */}
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                Assign Locker
              </DialogTitle>
              <DialogDescription>
                Select an available locker to assign to this deposit account.
              </DialogDescription>
            </DialogHeader>

            {assignDeposit && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-mono font-medium">{assignDeposit.account_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member</span>
                  <span className="font-medium">{assignDeposit.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit</span>
                  <span className="font-medium">{fmt(assignDeposit.deposit_amount)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Select Locker</Label>
              {availableLoading ? (
                <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading available lockers…</span>
                </div>
              ) : availableLockers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <LockOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">No available lockers at this time.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-border p-2">
                  {availableLockers.map((locker) => (
                    <button
                      key={locker.id}
                      type="button"
                      onClick={() => setSelectedLockerId(locker.id)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedLockerId === locker.id
                          ? "border-amber-400 bg-amber-50 text-amber-800"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold">{locker.locker_no}</span>
                        <Badge variant="outline" className="text-xs">{locker.type_name}</Badge>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{locker.location || "No location specified"}</span>
                        <span>Rent: {fmt(locker.annual_rent)}/yr</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {assignError && <p className="text-sm text-destructive">{assignError}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button
                disabled={!selectedLockerId || assignSubmitting}
                onClick={handleAssign}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {assignSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Locker
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardWrapper>
  )
}
