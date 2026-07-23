"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft, Search, Lock, LockOpen, Loader2, AlertCircle, CheckCircle2,
  RefreshCw, LayoutGrid, Layers, User, Calendar, Banknote,
  KeyRound, Wrench, ChevronRight, X, Info, Filter, CreditCard,
  AlertTriangle, ShieldAlert,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

// ─── Types ────────────────────────────────────────────────────────────────────

type LockerStatus = "AVAILABLE" | "ALLOCATED" | "RESERVED" | "MAINTENANCE" | "BLOCKED"

type LockerItem = {
  id: string
  locker_no: string
  status: LockerStatus
  floor_no: string
  section: string
  row_no: number | null
  cabinet_no: number | null
  location: string | null
  remarks: string | null
  type_id: number
  type_name: string
  dimensions: string | null
  annual_rent: number
  no_of_rows: number
  no_of_cabinets: number
  assignment_id: string | null
  membership_no: string | null
  member_name: string | null
  mobile_no: string | null
  assigned_date: string | null
  expiry_date: string | null
  deposit_amount: number | null
}

type GridStats = {
  total: string
  available: string
  allocated: string
  reserved: string
  maintenance: string
}

type LockerType = {
  id: number
  type_name: string
  no_of_rows: number
  no_of_cabinets: number
}

type MemberResult = {
  membership_no: string
  full_name: string
  status: string
  mobile_no: string
  customer_code: string
  father_name?: string
}

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS: Record<LockerStatus, { bg: string; ring: string; label: string; icon: React.ElementType }> = {
  AVAILABLE:   { bg: "bg-emerald-500 hover:bg-emerald-600", ring: "ring-emerald-700",  label: "Available",   icon: LockOpen },
  ALLOCATED:   { bg: "bg-blue-500 hover:bg-blue-600",       ring: "ring-blue-700",     label: "Allocated",   icon: Lock },
  RESERVED:    { bg: "bg-amber-500 hover:bg-amber-600",     ring: "ring-amber-700",    label: "Reserved",    icon: KeyRound },
  MAINTENANCE: { bg: "bg-red-500 hover:bg-red-600",         ring: "ring-red-700",      label: "Maintenance", icon: Wrench },
  BLOCKED:     { bg: "bg-red-700 hover:bg-red-800",         ring: "ring-red-900",      label: "Blocked",     icon: Wrench },
}

const LEGEND = [
  { dot: "bg-emerald-500", label: "Available" },
  { dot: "bg-blue-500",    label: "Allocated" },
  { dot: "bg-amber-500",   label: "Reserved" },
  { dot: "bg-red-500",     label: "Maintenance/Blocked" },
  { dot: "border-2 border-dashed border-muted-foreground/30 bg-muted/20", label: "Empty slot" },
]

const fmt     = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ─── Locker Card ──────────────────────────────────────────────────────────────

function LockerCard({
  locker,
  isSelected,
  onClick,
}: {
  locker: LockerItem
  isSelected: boolean
  onClick: () => void
}) {
  const cfg = STATUS[locker.status] ?? STATUS.MAINTENANCE
  return (
    <button
      onClick={onClick}
      title={[
        locker.locker_no,
        locker.type_name,
        cfg.label,
        locker.row_no    != null ? `Row ${locker.row_no}`     : "",
        locker.cabinet_no != null ? `Cabinet ${locker.cabinet_no}` : "",
        locker.member_name ?? "",
        locker.expiry_date ? `Exp: ${locker.expiry_date}` : "",
      ].filter(Boolean).join(" · ")}
      className={[
        "relative flex flex-col items-center justify-center gap-0.5",
        "w-[52px] h-[52px] rounded-lg text-white font-semibold",
        "transition-all duration-200 select-none cursor-pointer",
        cfg.bg,
        isSelected
          ? `ring-3 ring-offset-2 ${cfg.ring} scale-110 shadow-xl z-10`
          : "hover:scale-105 hover:shadow-md",
      ].join(" ")}
    >
      <span className="text-[9px] leading-none font-bold text-center px-0.5 break-all">
        {locker.locker_no}
      </span>
      {locker.status === "ALLOCATED"   && <Lock    className="h-2.5 w-2.5 opacity-70" />}
      {locker.status === "RESERVED"    && <KeyRound className="h-2.5 w-2.5 opacity-70" />}
      {(locker.status === "MAINTENANCE" || locker.status === "BLOCKED") && (
        <Wrench className="h-2.5 w-2.5 opacity-70" />
      )}
    </button>
  )
}

// ─── Empty slot ───────────────────────────────────────────────────────────────

function EmptySlot({ row, cab }: { row: number; cab: number }) {
  return (
    <div
      title={`Row ${row}, Cabinet ${cab} — empty`}
      className="w-[52px] h-[52px] rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10"
    />
  )
}

// ─── Type Grid Section ────────────────────────────────────────────────────────

function TypeSection({
  typeName,
  dimensions,
  annualRent,
  noOfRows,
  noOfCabinets,
  lockers,
  selectedId,
  onLockerClick,
}: {
  typeName: string
  dimensions: string | null
  annualRent: number
  noOfRows: number
  noOfCabinets: number
  lockers: LockerItem[]
  selectedId: string | null
  onLockerClick: (l: LockerItem) => void
}) {
  const hasGrid = noOfRows > 0 && noOfCabinets > 0

  // Build position lookup
  const posMap = useMemo(() => {
    const m = new Map<string, LockerItem>()
    for (const l of lockers) {
      if (l.row_no != null && l.cabinet_no != null) {
        m.set(`${l.row_no}-${l.cabinet_no}`, l)
      }
    }
    return m
  }, [lockers])

  const unpositioned = useMemo(
    () => lockers.filter((l) => l.row_no == null || l.cabinet_no == null),
    [lockers]
  )

  // Available / allocated counts for the header badge
  const available = lockers.filter((l) => l.status === "AVAILABLE").length

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* ── Type header ── */}
      <div className="px-4 py-3 bg-muted/30 border-b flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="font-semibold truncate">{typeName}</span>
          {dimensions && (
            <span className="text-xs text-muted-foreground hidden sm:inline">({dimensions})</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          {hasGrid && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {noOfRows} rows × {noOfCabinets} cabinets
            </span>
          )}
          <span>{lockers.length} locker{lockers.length !== 1 ? "s" : ""}</span>
          <span className="text-emerald-700 font-medium">{available} free</span>
          <span className="font-medium">{fmt(annualRent)}/yr</span>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        {hasGrid ? (
          <div className="space-y-1 min-w-max">
            {/* ── Cabinet column headers ── */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-11 shrink-0" />
              {Array.from({ length: noOfCabinets }, (_, ci) => (
                <div
                  key={ci}
                  className="w-[52px] text-center text-[10px] font-medium text-muted-foreground/70"
                >
                  C{String(ci + 1).padStart(2, "0")}
                </div>
              ))}
            </div>

            {/* ── Rows ── */}
            {Array.from({ length: noOfRows }, (_, ri) => ri + 1).map((rowNum) => (
              <div key={rowNum} className="flex items-center gap-2">
                {/* Row label */}
                <div className="w-11 shrink-0 text-right text-[10px] font-semibold text-muted-foreground pr-1">
                  R{String(rowNum).padStart(2, "0")}
                </div>
                {/* Cabinets */}
                {Array.from({ length: noOfCabinets }, (_, ci) => ci + 1).map((cabNum) => {
                  const locker = posMap.get(`${rowNum}-${cabNum}`)
                  return locker ? (
                    <LockerCard
                      key={cabNum}
                      locker={locker}
                      isSelected={selectedId === locker.id}
                      onClick={() => onLockerClick(locker)}
                    />
                  ) : (
                    <EmptySlot key={cabNum} row={rowNum} cab={cabNum} />
                  )
                })}
              </div>
            ))}

            {/* ── Unpositioned lockers within a grid-type ── */}
            {unpositioned.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Manually added (no row/cabinet position)
                </p>
                <div className="flex flex-wrap gap-2">
                  {unpositioned.map((l) => (
                    <LockerCard
                      key={l.id}
                      locker={l}
                      isSelected={selectedId === l.id}
                      onClick={() => onLockerClick(l)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Flat layout for types without grid config ── */
          <div className="flex flex-wrap gap-2">
            {lockers.map((l) => (
              <LockerCard
                key={l.id}
                locker={l}
                isSelected={selectedId === l.id}
                onClick={() => onLockerClick(l)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, colorClass, loading,
}: {
  label: string; value: string; icon: React.ElementType; colorClass: string; loading: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`rounded-lg p-2.5 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading
            ? <Skeleton className="mt-1 h-7 w-14" />
            : <p className="text-xl font-bold">{value}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ locker, onAssign, onBreak }: { locker: LockerItem | null; onAssign: () => void; onBreak: () => void }) {
  if (!locker) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
        <LayoutGrid className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Select a locker to view details</p>
        <p className="text-xs text-muted-foreground/60 max-w-[180px]">
          Click any locker on the grid to see its information here.
        </p>
      </div>
    )
  }

  const cfg = STATUS[locker.status] ?? STATUS.MAINTENANCE

  return (
    <div className="space-y-4">
      {/* Locker identity */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold font-mono">{locker.locker_no}</p>
            <p className="text-sm text-muted-foreground">{locker.type_name}</p>
          </div>
          <Badge
            className={`text-white border-0 text-xs px-2.5 py-1 ${
              locker.status === "AVAILABLE"   ? "bg-emerald-500" :
              locker.status === "ALLOCATED"   ? "bg-blue-500"    :
              locker.status === "RESERVED"    ? "bg-amber-500"   :
              "bg-red-500"
            }`}
          >
            {cfg.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          {locker.dimensions && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dimensions</span>
              <span className="font-medium">{locker.dimensions}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Annual Rent</span>
            <span className="font-semibold text-emerald-700">{fmt(locker.annual_rent)}</span>
          </div>
          {locker.row_no != null && locker.cabinet_no != null ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position</span>
              <span className="font-medium font-mono">
                Row {locker.row_no}, Cabinet {locker.cabinet_no}
              </span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Floor</span>
                <span className="font-medium">
                  {locker.floor_no === "G" ? "Ground" : `Floor ${locker.floor_no}`}
                </span>
              </div>
              {locker.section && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Section</span>
                  <span className="font-medium">{locker.section}</span>
                </div>
              )}
            </>
          )}
          {locker.location && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{locker.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Assignment info */}
      {locker.status === "ALLOCATED" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Current Assignment
          </p>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member</span>
              <span className="font-semibold">{locker.member_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Membership No</span>
              <span className="font-mono text-xs">{locker.membership_no || "—"}</span>
            </div>
            {locker.mobile_no && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mobile</span>
                <span>{locker.mobile_no}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assigned On</span>
              <span>{fmtDate(locker.assigned_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires On</span>
              <span className="font-medium text-orange-600">{fmtDate(locker.expiry_date)}</span>
            </div>
            {locker.deposit_amount != null && locker.deposit_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit</span>
                <span className="font-medium">{fmt(locker.deposit_amount)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {locker.status === "ALLOCATED" && (
        <Button
          variant="outline"
          className="w-full gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
          onClick={onBreak}
        >
          <AlertTriangle className="h-4 w-4" />
          Break / Force Open
        </Button>
      )}

      {locker.status === "RESERVED" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">This locker is reserved</p>
          <p className="text-xs text-muted-foreground">
            Reserved lockers cannot be assigned until the reservation expires or is cancelled.
          </p>
        </div>
      )}

      {(locker.status === "MAINTENANCE" || locker.status === "BLOCKED") && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700 mb-1">
            {locker.status === "BLOCKED" ? "Locker is blocked" : "Under maintenance"}
          </p>
          {locker.remarks && (
            <p className="text-xs text-muted-foreground">{locker.remarks}</p>
          )}
        </div>
      )}

      {locker.status === "AVAILABLE" && (
        <Button
          className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={onAssign}
        >
          <Lock className="h-4 w-4" />
          Assign This Locker
        </Button>
      )}
    </div>
  )
}

// ─── Member Search Dialog ─────────────────────────────────────────────────────

function MemberSearchDialog({
  open, onClose, onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (m: MemberResult) => void
}) {
  const [no, setNo]         = useState("")
  const [name, setName]     = useState("")
  const [results, setResults] = useState<MemberResult[]>([])
  const [searching, setSearching] = useState(false)

  const reset = () => { setNo(""); setName(""); setResults([]) }

  const search = async () => {
    if (!no.trim() && !name.trim()) return
    setSearching(true)
    setResults([])
    try {
      const res = await fetch("/api/savings/member-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberNumber: no.trim(), memberName: name.trim() }),
      })
      const data = await res.json()
      if (data.success) setResults(data.results || [])
    } catch {}
    setSearching(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-600" /> Search Member
          </DialogTitle>
          <DialogDescription>Find a member by membership number or name.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input placeholder="Membership No" value={no} onChange={(e) => setNo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()} />
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()} />
          <Button onClick={search} disabled={searching} className="shrink-0">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border p-2">
            {results.map((m) => (
              <button
                key={m.membership_no}
                onClick={() => { onSelect(m); reset(); onClose() }}
                className="w-full rounded-lg border px-3 py-2 text-left hover:bg-muted/60 transition-colors"
              >
                <p className="font-semibold text-sm">{m.full_name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  M# {m.membership_no} · {m.mobile_no}
                </p>
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Locker Deposit Transaction Window ───────────────────────────────────────

type DepositWindowResult = {
  account_number: string
  deposit_id: string
  expiry_date: string
  voucher_no: number
  batch_id: number
}

function LockerDepositWindow({
  open,
  locker,
  member,
  assignedDate,
  periodYears,
  onClose,
  onAllDone,
}: {
  open: boolean
  locker: LockerItem | null
  member: MemberResult | null
  assignedDate: string
  periodYears: string
  onClose: () => void
  onAllDone: () => void
}) {
  const [depositAmount, setDepositAmount]   = useState("")
  const [interestRate, setInterestRate]     = useState("")
  const [nomineeName, setNomineeName]       = useState("")
  const [nomineeRelation, setNomineeRelation] = useState("")
  const [voucherType, setVoucherType]       = useState<"CASH" | "TRANSFER" | "">("")
  const [selectedBatch, setSelectedBatch]   = useState<number>(0)
  const [narration, setNarration]           = useState("")
  const [batchPopupOpen, setBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])
  const [submitting, setSubmitting]         = useState(false)
  const [submitError, setSubmitError]       = useState("")
  const [result, setResult]                 = useState<DepositWindowResult | null>(null)

  useEffect(() => {
    if (open) {
      setDepositAmount(""); setInterestRate(""); setNomineeName(""); setNomineeRelation("")
      setVoucherType(""); setSelectedBatch(0); setNarration("")
      setSubmitError(""); setResult(null)
    }
  }, [open])

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/fas/incomplete-batches", { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.data) setIncompleteBatches(data.data)
    } catch {}
  }

  const handleSubmit = async () => {
    if (!locker || !member || !depositAmount || !voucherType) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/lockers/create-deposit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: member.membership_no,
          deposit_amount: Number(depositAmount),
          interest_rate: Number(interestRate) || 0,
          opening_date: assignedDate,
          period_years: Number(periodYears) || 1,
          nominee_name: nomineeName || null,
          nominee_relation: nomineeRelation || null,
          locker_id: locker.id,
          voucher_type: voucherType,
          selected_batch: selectedBatch,
          narration: narration || `Locker Deposit - ${locker.locker_no}`,
          already_allocated: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({
          account_number: data.account_number,
          deposit_id: data.deposit_id,
          expiry_date: data.expiry_date,
          voucher_no: data.voucher_no,
          batch_id: data.batch_id,
        })
      } else {
        setSubmitError(data.error || "Failed to create deposit account.")
      }
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!locker || !member) return null

  const annualInterest = (() => {
    const amt = Number(depositAmount) || 0
    const rate = Number(interestRate) || 0
    return amt > 0 && rate > 0 ? (amt * rate) / 100 : null
  })()

  return (
    <>
      {/* GL Batch Selection Dialog */}
      <Dialog open={batchPopupOpen} onOpenChange={setBatchPopupOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Incomplete GL Batch</DialogTitle>
            <DialogDescription>Select an existing batch or create a new one</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {incompleteBatches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No incomplete batches found. A new batch will be created.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Total Debit</TableHead>
                    <TableHead>Total Credit</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incompleteBatches.map((b) => (
                    <TableRow key={b.batch_id}>
                      <TableCell className="font-mono">{b.batch_id}</TableCell>
                      <TableCell>{fmt(b.total_debit)}</TableCell>
                      <TableCell>{fmt(b.total_credit)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline"
                          onClick={() => { setSelectedBatch(b.batch_id); setBatchPopupOpen(false) }}>
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedBatch(0); setBatchPopupOpen(false) }}>
              New Batch
            </Button>
            <Button variant="outline" onClick={() => setBatchPopupOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Transaction Window */}
      <Dialog open={open} onOpenChange={(v) => { if (!v && !result) onClose() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              Locker Deposit Transaction Window
            </DialogTitle>
            {!result && (
              <DialogDescription>
                Create a deposit account for Locker <span className="font-mono font-semibold">{locker.locker_no}</span> — {member.full_name}
              </DialogDescription>
            )}
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              {/* Summary info */}
              <div className="rounded-lg border bg-muted/40 divide-y text-sm">
                {[
                  ["Member", member.full_name],
                  ["Membership No", member.membership_no],
                  ["Locker", locker.locker_no],
                  ["Annual Rent", fmt(locker.annual_rent)],
                  ["Opening Date", fmtDate(assignedDate)],
                  ["Period", `${periodYears} Year${Number(periodYears) > 1 ? "s" : ""}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-3 py-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-medium font-${label === "Membership No" || label === "Locker" ? "mono text-xs" : "sans"}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Deposit & Interest */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Deposit Amount (₹) *</Label>
                  <Input type="number" min="0" placeholder="Enter amount"
                    value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Interest Rate (% p.a.)</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 6.00"
                    value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                </div>
              </div>

              {annualInterest !== null && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Annual interest: <span className="font-semibold">{fmt(annualInterest)}</span>
                  {" "}(acts as locker rent)
                </div>
              )}

              {/* Nominee */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nominee Name</Label>
                  <Input placeholder="Optional" value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Relationship</Label>
                  <Select value={nomineeRelation} onValueChange={setNomineeRelation}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Father","Mother","Spouse","Son","Daughter","Brother","Sister","Other"].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Voucher type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Voucher Type *</Label>
                  <Select value={voucherType} onValueChange={(v) => {
                    setVoucherType(v as "CASH" | "TRANSFER")
                    if (v !== "TRANSFER") setSelectedBatch(0)
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {voucherType === "TRANSFER" && (
                  <div className="space-y-1.5">
                    <Label>GL Batch ID</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={selectedBatch && selectedBatch !== 0 ? String(selectedBatch) : "New Batch"} />
                      <Button variant="outline" onClick={() => { fetchBatches(); setBatchPopupOpen(true) }}>
                        Select
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Narration */}
              <div className="space-y-1.5">
                <Label>Narration</Label>
                <Input placeholder={`Locker Deposit - ${locker.locker_no}`}
                  value={narration} onChange={(e) => setNarration(e.target.value)} />
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{submitError}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={submitting}>Skip</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !depositAmount || !voucherType}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Create Deposit Account</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* ── Success state ── */
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold">Deposit Account Created!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Locker deposit account opened and linked to{" "}
                  <span className="font-mono font-semibold">{locker.locker_no}</span>.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 divide-y text-sm text-left">
                {[
                  ["Account Number", result.account_number],
                  ["Locker", locker.locker_no],
                  ["Member", member.full_name],
                  ["Voucher No", String(result.voucher_no)],
                  ["Expiry Date", fmtDate(result.expiry_date)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium font-mono text-xs">{value}</span>
                  </div>
                ))}
              </div>
              <DialogFooter className="justify-center">
                <Button onClick={onAllDone} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Assignment Wizard ────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5

function AssignmentWizard({
  open, locker, onClose, onSuccess,
}: {
  open: boolean
  locker: LockerItem | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep]             = useState<WizardStep>(1)
  const [member, setMember]         = useState<MemberResult | null>(null)
  const [memberSearch, setMemberSearch] = useState("")
  const [memberLookupLoading, setMemberLookupLoading] = useState(false)
  const [memberError, setMemberError]   = useState("")
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const [periodYears, setPeriodYears]   = useState("1")
  const [depositAmount, setDepositAmount] = useState("")
  const [assignedDate, setAssignedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  )
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState("")
  const [result, setResult]             = useState<{ expiry_date: string; locker_no: string } | null>(null)
  const [availabilityWarning, setAvailabilityWarning] = useState("")
  const [depositWindowOpen, setDepositWindowOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(1); setMember(null); setMemberSearch(""); setMemberError("")
      setPeriodYears("1"); setDepositAmount("")
      setAssignedDate(new Date().toISOString().split("T")[0])
      setSubmitError(""); setAvailabilityWarning(""); setResult(null)
    }
  }, [open])

  const expiryDate = useMemo(() => {
    if (!assignedDate || !periodYears) return null
    const d = new Date(assignedDate)
    d.setFullYear(d.getFullYear() + Number(periodYears))
    return d.toISOString().split("T")[0]
  }, [assignedDate, periodYears])

  const lookupMember = async () => {
    const term = memberSearch.trim()
    if (!term) return
    setMemberLookupLoading(true)
    setMemberError("")
    setMember(null)
    try {
      const res = await fetch("/api/savings/member-lookup", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: term }),
      })
      const data = await res.json()
      if (res.ok && data.member) {
        setMember(data.member)
      } else {
        setMemberError(data.error || "Member not found")
      }
    } catch {
      setMemberError("Failed to search member")
    } finally {
      setMemberLookupLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!locker || !member) return
    setSubmitting(true)
    setSubmitError("")
    setAvailabilityWarning("")

    try {
      const checkRes = await fetch("/api/lockers/check-availability", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locker_id: locker.id }),
      })
      const checkData = await checkRes.json()
      if (checkData.success && checkData.locker.status !== "AVAILABLE") {
        setAvailabilityWarning(
          `Locker ${locker.locker_no} is no longer available — it was just allocated to ${checkData.locker.member_name || "another customer"}.`
        )
        setSubmitting(false)
        return
      }
    } catch {}

    try {
      const res = await fetch("/api/lockers/allocate", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locker_id: locker.id,
          membership_no: member.membership_no,
          period_years: Number(periodYears),
          deposit_amount: Number(depositAmount || 0),
          assigned_date: assignedDate,
        }),
      })
      const data = await res.json()
      console.log("Allocation response:", data)
      if (data.success) {
        setResult({ expiry_date: data.expiry_date, locker_no: data.locker_no })
        setStep(5)
      } else {
        if (res.status === 409) setAvailabilityWarning(data.error)
        else setSubmitError(data.error || "Allocation failed. Please try again.")
      }
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!locker) return null

  return (
    <>
      <MemberSearchDialog
        open={memberPickerOpen}
        onClose={() => setMemberPickerOpen(false)}
        onSelect={(m) => { setMember(m); setMemberSearch(m.membership_no); setMemberError("") }}
      />

      <LockerDepositWindow
        open={depositWindowOpen}
        locker={locker}
        member={member}
        assignedDate={assignedDate}
        periodYears={periodYears}
        onClose={() => setDepositWindowOpen(false)}
        onAllDone={() => { setDepositWindowOpen(false); onSuccess(); onClose() }}
      />

      <Dialog open={open} onOpenChange={(v) => { if (!v && step < 5) onClose() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Locker Allocation
            </DialogTitle>
            {step < 5 && (
              <DialogDescription>
                Step {step} of 4 —{" "}
                {step === 1 ? "Confirm Locker" : step === 2 ? "Select Customer" : step === 3 ? "Assignment Details" : "Review & Confirm"}
              </DialogDescription>
            )}
          </DialogHeader>

          {step < 5 && (
            <div className="flex gap-1">
              {([1, 2, 3, 4] as const).map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? "bg-amber-500" : "bg-muted"}`} />
              ))}
            </div>
          )}

          {/* Step 1 — Locker Confirmation */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Locker No</span>
                  <span className="font-bold font-mono text-lg">{locker.locker_no}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{locker.type_name}</span>
                </div>
                {locker.dimensions && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span>{locker.dimensions}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Annual Rent</span>
                  <span className="font-semibold text-emerald-700">{fmt(locker.annual_rent)}</span>
                </div>
                {locker.row_no != null && locker.cabinet_no != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Position</span>
                    <span className="font-mono">Row {locker.row_no}, Cabinet {locker.cabinet_no}</span>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800">
                  This locker is available and can be assigned to a customer.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setStep(2)} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                  Select Customer <ChevronRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2 — Select Customer */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Membership Number</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter membership no…"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookupMember()}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={lookupMember} disabled={memberLookupLoading}>
                    {memberLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" onClick={() => setMemberPickerOpen(true)} title="Search by name">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
                {memberError && <p className="mt-1.5 text-xs text-destructive">{memberError}</p>}
              </div>

              {member && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-blue-900">{member.full_name}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Membership No</span>
                    <span className="font-mono font-medium">{member.membership_no}</span>
                    <span className="text-muted-foreground">Mobile</span>
                    <span>{member.mobile_no || "—"}</span>
                    <span className="text-muted-foreground">Status</span>
                    <span className={member.status === "ACTIVE" ? "text-emerald-700 font-medium" : "text-red-600 font-medium"}>
                      {member.status}
                    </span>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button
                  disabled={!member || member.status !== "ACTIVE"}
                  onClick={() => setStep(3)}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Set Details <ChevronRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3 — Assignment Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="assign-date">Assigned Date</Label>
                  <Input id="assign-date" type="date" value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Period</Label>
                  <Select value={periodYears} onValueChange={setPeriodYears}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "5"].map((y) => (
                        <SelectItem key={y} value={y}>{y} Year{Number(y) > 1 ? "s" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deposit">Security Deposit (₹)</Label>
                <Input id="deposit" type="number" min="0" placeholder="0"
                  value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                <p className="text-xs text-muted-foreground">Optional. Leave blank if no deposit collected.</p>
              </div>

              {expiryDate && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-amber-800">
                    <Calendar className="h-4 w-4" /> Expiry Date
                  </span>
                  <span className="font-semibold text-amber-900">{fmtDate(expiryDate)}</span>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button
                  disabled={!assignedDate || !periodYears}
                  onClick={() => setStep(4)}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Review <ChevronRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 4 — Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              {availabilityWarning && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{availabilityWarning}</p>
                </div>
              )}

              <div className="rounded-xl border bg-muted/40 divide-y text-sm">
                {[
                  ["Locker", `${locker.locker_no} (${locker.type_name})`],
                  locker.row_no != null
                    ? ["Position", `Row ${locker.row_no}, Cabinet ${locker.cabinet_no}`]
                    : ["Floor / Section", `${locker.floor_no === "G" ? "Ground" : `Floor ${locker.floor_no}`} / ${locker.section}`],
                  ["Annual Rent",    fmt(locker.annual_rent)],
                  ["Customer",       member?.full_name ?? "—"],
                  ["Membership No",  member?.membership_no ?? "—"],
                  ["Assigned Date",  fmtDate(assignedDate)],
                  ["Period",         `${periodYears} Year${Number(periodYears) > 1 ? "s" : ""}`],
                  ["Expiry Date",    fmtDate(expiryDate)],
                  depositAmount ? ["Security Deposit", fmt(depositAmount)] : null,
                ]
                  .filter((row): row is [string, string] => row !== null)
                  .map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-right">{value}</span>
                    </div>
                  ))}
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(3)} disabled={submitting}>Back</Button>
                <Button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Allocating…</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Confirm Allocation</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 5 — Success + prompt to create deposit account */}
          {step === 5 && result && (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold">Locker Allocated!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Locker <span className="font-mono font-bold">{result.locker_no}</span> has been successfully assigned.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 divide-y text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{member?.full_name}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Expires On</span>
                  <span className="font-medium text-orange-600">{fmtDate(result.expiry_date)}</span>
                </div>
              </div>

              {/* Deposit account creation prompt */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" />
                  Create Locker Deposit Account
                </p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Open a deposit account linked to this locker. Interest earned acts as the annual rent collection.
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { onSuccess(); onClose() }}>
                  Skip
                </Button>
                <Button
                  onClick={() => setDepositWindowOpen(true)}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <CreditCard className="h-4 w-4" />
                  Create Deposit Account
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Break Locker Wizard ─────────────────────────────────────────────────────

const BREAK_REASONS = [
  "Lost Master Key",
  "Key Damaged / Broken",
  "Emergency Access Required",
  "Court Order / Legal Requirement",
  "Customer Request",
  "Other",
]

type BreakStep = 1 | 2 | 3 | 4
type BreakResult = { break_event_id: string; locker_no: string; voucher_no: number | null; batch_id: number | null }

function BreakLockerWizard({
  open, locker, onClose, onSuccess,
}: {
  open: boolean
  locker: LockerItem | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep]               = useState<BreakStep>(1)
  const [reason, setReason]           = useState("")
  const [customReason, setCustomReason] = useState("")
  const [breakingCharge, setBreakingCharge] = useState("")
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [remarks, setRemarks]         = useState("")
  const [batchPopupOpen, setBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [result, setResult]           = useState<BreakResult | null>(null)

  useEffect(() => {
    if (open) {
      setStep(1); setReason(""); setCustomReason(""); setBreakingCharge("")
      setVoucherType(""); setSelectedBatch(0); setRemarks("")
      setSubmitError(""); setResult(null)
    }
  }, [open])

  const charge = Number(breakingCharge) || 0
  const effectiveReason = reason === "Other" ? customReason.trim() : reason

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/fas/incomplete-batches", { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.data) setIncompleteBatches(data.data)
    } catch {}
  }

  const handleBreak = async () => {
    if (!locker || !effectiveReason) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/lockers/break-locker", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locker_id: locker.id,
          reason: effectiveReason,
          breaking_charge: charge,
          voucher_type: charge > 0 ? voucherType : null,
          selected_batch: selectedBatch,
          remarks: remarks || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({ break_event_id: data.break_event_id, locker_no: data.locker_no, voucher_no: data.voucher_no, batch_id: data.batch_id })
        setStep(4)
      } else {
        setSubmitError(data.error || "Break locker failed.")
      }
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!locker) return null

  return (
    <>
      {/* GL Batch Selection Dialog */}
      <Dialog open={batchPopupOpen} onOpenChange={setBatchPopupOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Incomplete GL Batch</DialogTitle>
            <DialogDescription>Select an existing batch or create a new one</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {incompleteBatches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No incomplete batches. A new batch will be created.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Total Debit</TableHead>
                    <TableHead>Total Credit</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incompleteBatches.map((b) => (
                    <TableRow key={b.batch_id}>
                      <TableCell className="font-mono">{b.batch_id}</TableCell>
                      <TableCell>{fmt(b.total_debit)}</TableCell>
                      <TableCell>{fmt(b.total_credit)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline"
                          onClick={() => { setSelectedBatch(b.batch_id); setBatchPopupOpen(false) }}>
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedBatch(0); setBatchPopupOpen(false) }}>New Batch</Button>
            <Button variant="outline" onClick={() => setBatchPopupOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => { if (!v && step < 4) onClose() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="h-5 w-5" />
              Break / Force Open Locker
            </DialogTitle>
            {step < 4 && (
              <DialogDescription>
                Step {step} of 3 —{" "}
                {step === 1 ? "Confirm Action" : step === 2 ? "Break Details" : "Review & Confirm"}
              </DialogDescription>
            )}
          </DialogHeader>

          {step < 4 && (
            <div className="flex gap-1">
              {([1, 2, 3] as const).map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? "bg-red-500" : "bg-muted"}`} />
              ))}
            </div>
          )}

          {/* ── Step 1: Warning ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800">This action is irreversible</p>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      Breaking this locker will permanently close the assignment and deposit account.
                      The locker will be placed under maintenance and unavailable for reallocation until maintenance is completed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/40 divide-y text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Locker</span>
                  <span className="font-bold font-mono">{locker.locker_no}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{locker.type_name}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Member</span>
                  <span className="font-medium">{locker.member_name || "—"}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Membership No</span>
                  <span className="font-mono text-xs">{locker.membership_no || "—"}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Assigned On</span>
                  <span>{fmtDate(locker.assigned_date)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 space-y-1">
                <p className="font-semibold">What will happen:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Locker status → MAINTENANCE (unavailable)</li>
                  <li>Current assignment will be closed</li>
                  <li>Associated deposit account will be closed</li>
                  <li>Breaking charge (if any) posted to GL</li>
                  <li>Audit record created with user, date &amp; reason</li>
                </ul>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setStep(2)} className="gap-1.5 bg-red-600 hover:bg-red-700 text-white">
                  <ChevronRight className="h-4 w-4" /> Proceed
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Step 2: Break Details ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Reason for Breaking *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                  <SelectContent>
                    {BREAK_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reason === "Other" && (
                <div className="space-y-1.5">
                  <Label>Specify Reason *</Label>
                  <Input
                    placeholder="Describe the reason…"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Breaking Charge (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0 — leave blank to waive"
                  value={breakingCharge}
                  onChange={(e) => setBreakingCharge(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave as 0 to waive the breaking charge.</p>
              </div>

              {charge > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Voucher Type *</Label>
                    <Select value={voucherType} onValueChange={(v) => {
                      setVoucherType(v as "CASH" | "TRANSFER")
                      if (v !== "TRANSFER") setSelectedBatch(0)
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {voucherType === "TRANSFER" && (
                    <div className="space-y-1.5">
                      <Label>GL Batch</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={selectedBatch && selectedBatch !== 0 ? String(selectedBatch) : "New Batch"} />
                        <Button variant="outline" onClick={() => { fetchBatches(); setBatchPopupOpen(true) }}>
                          Select
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Remarks</Label>
                <Textarea
                  placeholder="Additional notes or observations…"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button
                  disabled={!reason || (reason === "Other" && !customReason.trim()) || (charge > 0 && !voucherType)}
                  onClick={() => setStep(3)}
                  className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                >
                  Review <ChevronRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 divide-y text-sm">
                {[
                  ["Locker", locker.locker_no],
                  ["Member", locker.member_name || "—"],
                  ["Membership No", locker.membership_no || "—"],
                  ["Reason", effectiveReason],
                  ["Breaking Charge", charge > 0 ? fmt(charge) : "Waived"],
                  ...(charge > 0 ? [["Voucher Type", voucherType]] : []),
                  ...(remarks ? [["Remarks", remarks]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between px-4 py-2.5 gap-3">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right break-words max-w-[200px]">{value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> After confirmation:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Locker <strong>{locker.locker_no}</strong> → MAINTENANCE</li>
                  <li>Assignment closed for <strong>{locker.member_name}</strong></li>
                  <li>Deposit account closed</li>
                  {charge > 0 && <li>Breaking charge {fmt(charge)} posted via {voucherType}</li>}
                  <li>Audit trail entry created</li>
                </ul>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{submitError}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>Back</Button>
                <Button
                  onClick={handleBreak}
                  disabled={submitting}
                  className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Breaking…</>
                  ) : (
                    <><ShieldAlert className="h-4 w-4" /> Confirm Break Locker</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Step 4: Result ── */}
          {step === 4 && result && (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
                <CheckCircle2 className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold">Locker Break Recorded</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Locker <span className="font-mono font-bold">{result.locker_no}</span> has been set to maintenance.
                  The assignment and deposit account have been closed.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 divide-y text-sm text-left">
                {[
                  ["Break Event ID", result.break_event_id.slice(0, 8) + "…"],
                  ["Locker", result.locker_no],
                  ...(result.voucher_no ? [["Voucher No", String(result.voucher_no)]] : []),
                  ...(result.batch_id   ? [["Batch ID",   String(result.batch_id)]]   : []),
                  ["New Status", "MAINTENANCE"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium font-mono text-xs">{value}</span>
                  </div>
                ))}
              </div>
              <DialogFooter className="justify-center">
                <Button onClick={() => { onSuccess(); onClose() }} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LockerAllocationPage() {
  const router = useRouter()

  const [lockers, setLockers]   = useState<LockerItem[]>([])
  const [stats, setStats]       = useState<GridStats | null>(null)
  const [types, setTypes]       = useState<LockerType[]>([])
  const [floors, setFloors]     = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")

  const [search, setSearch]             = useState("")
  const [typeFilter, setTypeFilter]     = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [floorFilter, setFloorFilter]   = useState("all")
  const [sectionFilter, setSectionFilter] = useState("all")

  const [selectedLocker, setSelectedLocker] = useState<LockerItem | null>(null)
  const [wizardOpen, setWizardOpen]         = useState(false)
  const [breakWizardOpen, setBreakWizardOpen] = useState(false)

  const fetchGrid = useCallback(async (overrides?: Record<string, string>) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      const s  = overrides?.search  ?? search
      const t  = overrides?.type    ?? typeFilter
      const st = overrides?.status  ?? statusFilter
      const fl = overrides?.floor   ?? floorFilter
      const sc = overrides?.section ?? sectionFilter
      if (s  && s  !== "")    params.set("search",  s)
      if (t  && t  !== "all") params.set("type",    t)
      if (st && st !== "all") params.set("status",  st)
      if (fl && fl !== "all") params.set("floor",   fl)
      if (sc && sc !== "all") params.set("section", sc)

      const res  = await fetch(`/api/lockers/grid?${params}`, { credentials: "include" })
      const data = await res.json()
      if (data.success) {
        setLockers(data.lockers ?? [])
        setStats(data.stats)
        setTypes(data.types ?? [])
        setFloors(data.floors ?? [])
        setSections(data.sections ?? [])
        if (selectedLocker) {
          const still = (data.lockers ?? []).find((l: LockerItem) => l.id === selectedLocker.id)
          if (still) setSelectedLocker(still)
        }
      } else {
        setError(data.error || "Failed to load lockers")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, floorFilter, sectionFilter, selectedLocker])

  useEffect(() => {
    const t = setTimeout(() => fetchGrid(), 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchGrid()
  }, [typeFilter, statusFilter, floorFilter, sectionFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Group lockers by type_id → preserve insertion order from the API (sorted by type_name)
  const typeGrouped = useMemo(() => {
    const map = new Map<number, { type: LockerType | undefined; lockers: LockerItem[] }>()
    for (const l of lockers) {
      if (!map.has(l.type_id)) {
        map.set(l.type_id, {
          type: types.find((t) => t.id === l.type_id),
          lockers: [],
        })
      }
      map.get(l.type_id)!.lockers.push(l)
    }
    return map
  }, [lockers, types])

  const handleLockerClick = (locker: LockerItem) => {
    setSelectedLocker((prev) => (prev?.id === locker.id ? null : locker))
  }

  const handleWizardSuccess = () => {
    setSelectedLocker(null)
    fetchGrid()
  }

  return (
    <DashboardWrapper>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Locker Allocation</h1>
              <p className="text-sm text-muted-foreground">
                Visual locker grid — grouped by type · click to select and assign
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchGrid()} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total Lockers" value={stats?.total ?? "—"}       icon={LayoutGrid} colorClass="bg-gray-100 text-gray-600"       loading={loading} />
          <StatCard label="Available"     value={stats?.available ?? "—"}   icon={LockOpen}   colorClass="bg-emerald-100 text-emerald-600"  loading={loading} />
          <StatCard label="Allocated"     value={stats?.allocated ?? "—"}   icon={Lock}       colorClass="bg-blue-100 text-blue-600"        loading={loading} />
          <StatCard label="Reserved"      value={stats?.reserved ?? "—"}    icon={KeyRound}   colorClass="bg-amber-100 text-amber-600"      loading={loading} />
          <StatCard label="Maintenance"   value={stats?.maintenance ?? "—"} icon={Wrench}     colorClass="bg-red-100 text-red-600"          loading={loading} />
        </div>

        {/* ── Filters ── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search locker no or member name…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.type_name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="ALLOCATED">Allocated</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>

              {floors.length > 1 && (
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Floors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((f) => (
                      <SelectItem key={f} value={f}>{f === "G" ? "Ground Floor" : `Floor ${f}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {sections.length > 1 && (
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {(search || typeFilter !== "all" || statusFilter !== "all" || floorFilter !== "all" || sectionFilter !== "all") && (
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground"
                  onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); setFloorFilter("all"); setSectionFilter("all") }}>
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-sm">
          {LEGEND.map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${dot}`} />
              <span className="text-muted-foreground">{label}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Hover for details · Click to select
          </span>
        </div>

        {/* ── Grid + Detail Panel ── */}
        <div className="flex gap-5 items-start">

          {/* Left: type-grouped grids */}
          <div className="flex-1 min-w-0">
            {error ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchGrid()}>Retry</Button>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b">
                      <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="p-4 space-y-2">
                      {[1, 2, 3].map((r) => (
                        <div key={r} className="flex gap-2">
                          <Skeleton className="h-[52px] w-10" />
                          {Array.from({ length: 8 }).map((_, j) => (
                            <Skeleton key={j} className="w-[52px] h-[52px] rounded-lg" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : lockers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <LayoutGrid className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No lockers found</p>
                <p className="text-xs text-muted-foreground/60">
                  {search || typeFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters."
                    : "Add lockers from the Inventory tab first."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...typeGrouped.entries()].map(([typeId, { type, lockers: typeLockers }]) => (
                  <TypeSection
                    key={typeId}
                    typeName={type?.type_name ?? "Unknown Type"}
                    dimensions={typeLockers[0]?.dimensions ?? null}
                    annualRent={typeLockers[0]?.annual_rent ?? 0}
                    noOfRows={type?.no_of_rows ?? 0}
                    noOfCabinets={type?.no_of_cabinets ?? 0}
                    lockers={typeLockers}
                    selectedId={selectedLocker?.id ?? null}
                    onLockerClick={handleLockerClick}
                  />
                ))}

                <p className="text-xs text-muted-foreground border-t pt-3">
                  Showing {lockers.length} locker{lockers.length !== 1 ? "s" : ""}
                  {search || typeFilter !== "all" || statusFilter !== "all" ? " (filtered)" : ""}
                  {" · "}{typeGrouped.size} type{typeGrouped.size !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          <div className="w-72 shrink-0 sticky top-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-600" />
                  Locker Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetailPanel
                  locker={selectedLocker}
                  onAssign={() => setWizardOpen(true)}
                  onBreak={() => setBreakWizardOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AssignmentWizard
        open={wizardOpen}
        locker={selectedLocker}
        onClose={() => setWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />

      <BreakLockerWizard
        open={breakWizardOpen}
        locker={selectedLocker}
        onClose={() => setBreakWizardOpen(false)}
        onSuccess={() => {
          setSelectedLocker(null)
          fetchGrid()
        }}
      />
    </DashboardWrapper>
  )
}
