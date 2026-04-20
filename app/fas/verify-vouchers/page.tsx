"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import {
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Clock,
  FileCheck,
  FileX,
  CheckCheck,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

interface PendingVoucher {
  id: string
  batchId: number
  voucherId: number
  businessDate: string
  voucherType: string
  status: string
  makerId: string
  makerName: string
  makerEmpCode: string
  createdAt: string
  totalDebit: number
  totalCredit: number
}

interface VoucherLine {
  id: string
  accountCode: number
  accountName: string
  refAccountId: string
  debitAmount: number
  creditAmount: number
  narration: string
}

interface BulkResult {
  batchId: number
  voucherId?: number
  success: boolean
  error?: string
  newStatus?: string
}

export default function VerifyVouchersPage() {
  const router = useRouter()

  const [vouchers, setVouchers] = useState<PendingVoucher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Single-voucher detail state
  const [selectedVoucher, setSelectedVoucher] = useState<PendingVoucher | null>(null)
  const [lines, setLines] = useState<VoucherLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"APPROVE" | "REJECT" | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<"APPROVE" | "REJECT" | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10)

  const fetchPendingVouchers = useCallback(async () => {
    setLoading(true)
    setError("")
    setSuccess("")
    setSelectedIds(new Set())
    setBulkResults(null)
    setPage(1)
    try {
      const res = await fetch("/api/fas/pending-vouchers")
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to fetch pending vouchers"); return }
      setVouchers(data.data || [])
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPendingVouchers() }, [fetchPendingVouchers])

  async function handleViewDetail(voucher: PendingVoucher) {
    setSelectedVoucher(voucher)
    setLinesLoading(true)
    setError("")
    setSuccess("")
    setBulkResults(null)
    try {
      const res = await fetch(`/api/fas/voucher-detail?batchId=${voucher.batchId}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to fetch voucher details"); setLines([]); return }
      setLines(data.lines || [])
    } catch {
      setError("Network error. Please try again.")
      setLines([])
    } finally {
      setLinesLoading(false)
    }
  }

  // ── Single verify ─────────────────────────────────────────────────────
  async function handleVerifyAction() {
    if (!selectedVoucher || !confirmAction) return
    setActionLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/fas/verify-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selectedVoucher.batchId, action: confirmAction }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to process voucher"); return }
      setSuccess(data.message)
      setSelectedVoucher(null)
      setLines([])
      fetchPendingVouchers()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  // ── Bulk verify ───────────────────────────────────────────────────────
  async function handleBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return
    setBulkLoading(true)
    setError("")
    setSuccess("")
    setBulkResults(null)
    try {
      const res = await fetch("/api/fas/verify-voucher/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchIds: Array.from(selectedIds), action: bulkAction }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Bulk action failed"); return }
      setBulkResults(data.results || [])
      if (data.failed === 0) {
        setSuccess(data.message)
      } else {
        setError(data.message)
      }
      fetchPendingVouchers()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBulkLoading(false)
      setBulkAction(null)
    }
  }

  // ── Pagination derived values (needed by selection helpers) ─────────────
  const totalPages  = Math.max(1, Math.ceil(vouchers.length / pageSize))
  const safePage    = Math.min(page, totalPages)
  const pageSlice   = vouchers.slice((safePage - 1) * pageSize, safePage * pageSize)
  const start       = vouchers.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end         = Math.min(safePage * pageSize, vouchers.length)

  // ── Selection helpers (scoped to current page) ────────────────────────
  const balancedVouchers   = vouchers.filter((v) => v.totalDebit === v.totalCredit)
  const unbalancedVouchers = vouchers.filter((v) => v.totalDebit !== v.totalCredit)

  const selectedBalanced   = vouchers.filter((v) => selectedIds.has(v.batchId) && v.totalDebit === v.totalCredit)
  const selectedUnbalanced = vouchers.filter((v) => selectedIds.has(v.batchId) && v.totalDebit !== v.totalCredit)

  // Current-page items only
  const pageIds             = pageSlice.map((v) => v.batchId)
  const pageBalancedIds     = pageSlice.filter((v) => v.totalDebit === v.totalCredit).map((v) => v.batchId)
  const allPageSelected     = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected    = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected

  function toggleOne(batchId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(batchId) ? next.delete(batchId) : next.add(batchId)
      return next
    })
  }

  function selectCurrentPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  function selectAllBalanced() {
    setSelectedIds(new Set(pageBalancedIds))
  }

  function clearPageSelection() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      pageIds.forEach((id) => next.delete(id))
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  const noneSelected = selectedIds.size === 0

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">

            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/fas")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-blue-600" />
                  Verify Vouchers
                </h1>
                <p className="text-muted-foreground">
                  Review, select and verify pending vouchers. Balanced vouchers can be approved individually or in bulk.
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={fetchPendingVouchers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Vouchers</p>
                      <p className="text-2xl font-bold">{loading ? "—" : vouchers.length}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Balanced (Ready)</p>
                      <p className="text-2xl font-bold text-green-700">{loading ? "—" : balancedVouchers.length}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3">
                      <FileCheck className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Unbalanced</p>
                      <p className="text-2xl font-bold text-red-700">{loading ? "—" : unbalancedVouchers.length}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3">
                      <FileX className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Messages */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 border-green-300 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Bulk Results Detail */}
            {bulkResults && bulkResults.some((r) => !r.success) && (
              <Card className="mb-4 border-yellow-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Bulk Action Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6 text-xs">Batch #</TableHead>
                        <TableHead className="text-xs">Voucher #</TableHead>
                        <TableHead className="text-xs">Result</TableHead>
                        <TableHead className="text-xs pr-6">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResults.map((r) => (
                        <TableRow key={r.batchId}>
                          <TableCell className="pl-6 font-mono text-xs">{r.batchId}</TableCell>
                          <TableCell className="font-mono text-xs">{r.voucherId ?? "—"}</TableCell>
                          <TableCell>
                            {r.success ? (
                              <Badge variant="outline" className="border-green-300 bg-green-50 text-[10px] text-green-700">Success</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Failed</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground pr-6">
                            {r.success ? r.newStatus : r.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* ── List or Detail View ── */}
            {selectedVoucher ? (

              /* ══════════════ DETAIL VIEW ══════════════ */
              <div className="space-y-4">
                <Button
                  variant="outline" size="sm" className="gap-2"
                  onClick={() => { setSelectedVoucher(null); setLines([]); setError("") }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
                </Button>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      Voucher Details — Batch #{selectedVoucher.batchId}
                    </CardTitle>
                    <CardDescription>Review the GL transaction lines before approving or rejecting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Batch No</p>
                        <p className="font-semibold font-mono">{selectedVoucher.batchId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Voucher No</p>
                        <p className="font-semibold font-mono">{selectedVoucher.voucherId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Business Date</p>
                        <p className="font-semibold">{fmtDate(selectedVoucher.businessDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Voucher Type</p>
                        <Badge variant="outline" className="mt-0.5">{selectedVoucher.voucherType}</Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Created By (Maker)</p>
                        <p className="font-semibold">
                          {selectedVoucher.makerName}
                          {selectedVoucher.makerEmpCode ? ` (${selectedVoucher.makerEmpCode})` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Debit</p>
                        <p className="font-mono font-semibold text-red-700">₹{fmt(selectedVoucher.totalDebit)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Credit</p>
                        <p className="font-mono font-semibold text-green-700">₹{fmt(selectedVoucher.totalCredit)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Balance Status</p>
                        {selectedVoucher.totalDebit === selectedVoucher.totalCredit ? (
                          <Badge className="mt-0.5 border-green-300 bg-green-50 text-green-700" variant="outline">Balanced</Badge>
                        ) : (
                          <Badge variant="destructive" className="mt-0.5">
                            Unbalanced (diff: ₹{fmt(Math.abs(selectedVoucher.totalDebit - selectedVoucher.totalCredit))})
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">GL Transaction Lines</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {linesLoading ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading voucher lines...
                      </div>
                    ) : lines.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">No transaction lines found.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-28 text-xs pl-6">GL Code</TableHead>
                            <TableHead className="text-xs">Account Name</TableHead>
                            <TableHead className="text-xs">Ref A/c</TableHead>
                            <TableHead className="text-xs">Narration</TableHead>
                            <TableHead className="text-right text-xs">Debit (Rs.)</TableHead>
                            <TableHead className="text-right text-xs pr-6">Credit (Rs.)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell className="font-mono text-xs pl-6">{line.accountCode}</TableCell>
                              <TableCell className="text-xs">{line.accountName}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {line.refAccountId && line.refAccountId !== "0" ? line.refAccountId : "-"}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                {line.narration || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-red-600">
                                {line.debitAmount > 0 ? fmt(line.debitAmount) : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-green-600 pr-6">
                                {line.creditAmount > 0 ? fmt(line.creditAmount) : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={4} className="text-xs font-bold pl-6">Total</TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold text-red-700">
                              {fmt(lines.reduce((s, l) => s + l.debitAmount, 0))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold text-green-700 pr-6">
                              {fmt(lines.reduce((s, l) => s + l.creditAmount, 0))}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {lines.length > 0 && (
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Button
                          className="gap-2 bg-green-600 hover:bg-green-700"
                          onClick={() => setConfirmAction("APPROVE")}
                          disabled={selectedVoucher.totalDebit !== selectedVoucher.totalCredit}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve & Post
                        </Button>
                        <Button
                          variant="destructive" className="gap-2"
                          onClick={() => setConfirmAction("REJECT")}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject Voucher
                        </Button>
                        {selectedVoucher.totalDebit !== selectedVoucher.totalCredit && (
                          <p className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Voucher is unbalanced — cannot be approved
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

            ) : (

              /* ══════════════ LIST VIEW ══════════════ */
              <div className="space-y-3">

                {/* ── Bulk Action Bar ── */}
                {vouchers.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">

                    {/* Left: selection shortcuts (current page only) */}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Select on this page:</span>
                      <button
                        onClick={allPageSelected ? clearPageSelection : selectCurrentPage}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        {allPageSelected ? "None" : "All"}
                      </button>
                      <span className="text-muted-foreground">·</span>
                      <button
                        onClick={selectAllBalanced}
                        className="text-xs font-medium text-green-600 hover:underline"
                      >
                        Balanced ({pageBalancedIds.length})
                      </button>
                      {!noneSelected && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <button onClick={clearSelection} className="text-xs font-medium text-muted-foreground hover:underline">
                            Clear all
                          </button>
                        </>
                      )}
                    </div>

                    {/* Right: selection count + action buttons */}
                    <div className="flex items-center gap-3">
                      {!noneSelected && (
                        <span className="text-xs text-muted-foreground">
                          <strong className="text-foreground">{selectedIds.size}</strong> selected
                          {selectedUnbalanced.length > 0 && (
                            <span className="ml-1 text-yellow-600">
                              ({selectedUnbalanced.length} unbalanced)
                            </span>
                          )}
                        </span>
                      )}
                      <Button
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700 text-xs"
                        disabled={noneSelected || selectedBalanced.length === 0 || bulkLoading}
                        onClick={() => setBulkAction("APPROVE")}
                        title={selectedBalanced.length === 0 ? "No balanced vouchers selected" : undefined}
                      >
                        {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                        Approve Selected
                        {selectedBalanced.length > 0 && (
                          <span className="ml-1 rounded-full bg-green-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                            {selectedBalanced.length}
                          </span>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2 text-xs"
                        disabled={noneSelected || bulkLoading}
                        onClick={() => setBulkAction("REJECT")}
                      >
                        {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Reject Selected
                        {selectedIds.size > 0 && (
                          <span className="ml-1 rounded-full bg-red-400/30 px-1.5 py-0.5 text-[10px] font-bold">
                            {selectedIds.size}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Voucher Table ── */}
                {(() => {
                  return (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                          <CardTitle className="text-base">Pending Vouchers</CardTitle>
                          <CardDescription>
                            {loading
                              ? "Loading..."
                              : vouchers.length === 0
                              ? "No pending vouchers awaiting verification"
                              : `Showing ${start}–${end} of ${vouchers.length} voucher${vouchers.length !== 1 ? "s" : ""} awaiting verification`}
                          </CardDescription>
                        </div>
                        {/* Page-size selector */}
                        {!loading && vouchers.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Rows per page:</span>
                            <div className="flex overflow-hidden rounded-md border">
                              {([10, 20, 50] as const).map((n) => (
                                <button
                                  key={n}
                                  onClick={() => { setPageSize(n); setPage(1) }}
                                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                                    pageSize === n
                                      ? "bg-blue-600 text-white"
                                      : "bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-0">
                        {loading ? (
                          <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            Loading pending vouchers...
                          </div>
                        ) : vouchers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                              <CheckCircle className="h-9 w-9 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">All clear!</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              No pending vouchers to verify at this time.
                            </p>
                          </div>
                        ) : (
                          <>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {/* Select-all checkbox — current page only */}
                                  <TableHead className="w-10 pl-4">
                                    <Checkbox
                                      checked={allPageSelected}
                                      onCheckedChange={(v) => (v ? selectCurrentPage() : clearPageSelection())}
                                      aria-label="Select all vouchers on this page"
                                      className={somePageSelected ? "data-[state=unchecked]:bg-muted" : ""}
                                      data-state={somePageSelected ? "indeterminate" : allPageSelected ? "checked" : "unchecked"}
                                    />
                                  </TableHead>
                                  <TableHead className="text-xs">Batch #</TableHead>
                                  <TableHead className="text-xs">Voucher #</TableHead>
                                  <TableHead className="text-xs">Business Date</TableHead>
                                  <TableHead className="text-xs">Type</TableHead>
                                  <TableHead className="text-xs">Created By</TableHead>
                                  <TableHead className="text-right text-xs">Debit (Rs.)</TableHead>
                                  <TableHead className="text-right text-xs">Credit (Rs.)</TableHead>
                                  <TableHead className="text-xs">Balance</TableHead>
                                  <TableHead className="text-right text-xs pr-6">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pageSlice.map((v) => {
                                  const balanced   = v.totalDebit === v.totalCredit
                                  const isSelected = selectedIds.has(v.batchId)
                                  return (
                                    <TableRow
                                      key={v.id}
                                      className={`hover:bg-muted/50 ${isSelected ? "bg-blue-50/60" : ""}`}
                                    >
                                      <TableCell className="pl-4">
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleOne(v.batchId)}
                                          aria-label={`Select batch ${v.batchId}`}
                                        />
                                      </TableCell>
                                      <TableCell className="font-mono text-xs font-semibold">{v.batchId}</TableCell>
                                      <TableCell className="font-mono text-xs">{v.voucherId}</TableCell>
                                      <TableCell className="text-xs">{fmtDate(v.businessDate)}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-[10px]">{v.voucherType}</Badge>
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {v.makerName}
                                        {v.makerEmpCode ? (
                                          <span className="ml-1 text-muted-foreground">({v.makerEmpCode})</span>
                                        ) : null}
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-xs text-red-600">
                                        {fmt(v.totalDebit)}
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-xs text-green-600">
                                        {fmt(v.totalCredit)}
                                      </TableCell>
                                      <TableCell>
                                        {balanced ? (
                                          <Badge variant="outline" className="border-green-300 bg-green-50 text-[10px] text-green-700">
                                            Balanced
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive" className="text-[10px]">Unbalanced</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right pr-6">
                                        <Button
                                          variant="outline" size="sm" className="gap-1.5 text-xs"
                                          onClick={() => handleViewDetail(v)}
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          Review
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>

                            {/* Pagination bar */}
                            <div className="flex items-center justify-between border-t px-4 py-3">
                              <p className="text-xs text-muted-foreground">
                                {start}–{end} of {vouchers.length} records
                                {selectedIds.size > 0 && (
                                  <span className="ml-2 font-medium text-blue-600">
                                    · {selectedIds.size} selected
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm" variant="outline" className="h-7 w-7 p-0"
                                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                                  disabled={safePage === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                  .filter((p) =>
                                    p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
                                  )
                                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                                      acc.push("…")
                                    }
                                    acc.push(p)
                                    return acc
                                  }, [])
                                  .map((p, i) =>
                                    p === "…" ? (
                                      <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                                    ) : (
                                      <Button
                                        key={p}
                                        size="sm"
                                        variant={safePage === p ? "default" : "outline"}
                                        className={`h-7 w-7 p-0 text-xs ${safePage === p ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                                        onClick={() => setPage(p as number)}
                                      >
                                        {p}
                                      </Button>
                                    )
                                  )}
                                <Button
                                  size="sm" variant="outline" className="h-7 w-7 p-0"
                                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                  disabled={safePage === totalPages}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })()}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Single verify dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "APPROVE" ? "Approve & Post Voucher?" : "Reject Voucher?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "APPROVE"
                ? `This will post Batch #${selectedVoucher?.batchId} (Voucher #${selectedVoucher?.voucherId}) to the general ledger and update all account balances. This action cannot be undone.`
                : `This will reject Batch #${selectedVoucher?.batchId} (Voucher #${selectedVoucher?.voucherId}). All related transactions will be marked as rejected.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerifyAction}
              disabled={actionLoading}
              className={
                confirmAction === "REJECT"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-green-600 text-white hover:bg-green-700"
              }
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmAction === "APPROVE" ? "Approve & Post" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk verify dialog */}
      <AlertDialog open={!!bulkAction} onOpenChange={(open) => { if (!open) setBulkAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "APPROVE"
                ? `Approve ${selectedBalanced.length} Voucher${selectedBalanced.length !== 1 ? "s" : ""}?`
                : `Reject ${selectedIds.size} Voucher${selectedIds.size !== 1 ? "s" : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {bulkAction === "APPROVE" ? (
                  <>
                    <p>
                      This will post <strong>{selectedBalanced.length} balanced voucher{selectedBalanced.length !== 1 ? "s" : ""}</strong> to
                      the general ledger and update all account balances.
                    </p>
                    {selectedUnbalanced.length > 0 && (
                      <p className="text-yellow-700">
                        <strong>{selectedUnbalanced.length} unbalanced voucher{selectedUnbalanced.length !== 1 ? "s" : ""}</strong>{" "}
                        in your selection will be <strong>skipped</strong> (cannot approve unbalanced vouchers).
                      </p>
                    )}
                    <p className="text-destructive font-medium">This action cannot be undone.</p>
                  </>
                ) : (
                  <>
                    <p>
                      This will reject <strong>{selectedIds.size} voucher{selectedIds.size !== 1 ? "s" : ""}</strong> and
                      mark all related transactions as rejected.
                    </p>
                    <p className="text-destructive font-medium">This action cannot be undone.</p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAction}
              disabled={bulkLoading}
              className={
                bulkAction === "REJECT"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-green-600 text-white hover:bg-green-700"
              }
            >
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkAction === "APPROVE"
                ? `Approve ${selectedBalanced.length} Voucher${selectedBalanced.length !== 1 ? "s" : ""}`
                : `Reject ${selectedIds.size} Voucher${selectedIds.size !== 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardWrapper>
  )
}
