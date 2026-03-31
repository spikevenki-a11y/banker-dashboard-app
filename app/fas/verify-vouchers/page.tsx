"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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

export default function VerifyVouchersPage() {
  const router = useRouter()

  const [vouchers, setVouchers] = useState<PendingVoucher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [selectedVoucher, setSelectedVoucher] = useState<PendingVoucher | null>(null)
  const [lines, setLines] = useState<VoucherLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)

  const [confirmAction, setConfirmAction] = useState<"APPROVE" | "REJECT" | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPendingVouchers = useCallback(async () => {
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/fas/pending-vouchers")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to fetch pending vouchers")
        return
      }
      setVouchers(data.data || [])
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingVouchers()
  }, [fetchPendingVouchers])

  async function handleViewDetail(voucher: PendingVoucher) {
    setSelectedVoucher(voucher)
    setLinesLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/fas/voucher-detail?batchId=${voucher.batchId}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to fetch voucher details")
        setLines([])
        return
      }
      setLines(data.lines || [])
    } catch {
      setError("Network error. Please try again.")
      setLines([])
    } finally {
      setLinesLoading(false)
    }
  }

  async function handleVerifyAction() {
    if (!selectedVoucher || !confirmAction) return

    setActionLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/fas/verify-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedVoucher.batchId,
          action: confirmAction,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to process voucher")
        return
      }
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

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })

  const balancedCount = vouchers.filter((v) => v.totalDebit === v.totalCredit).length
  const unbalancedCount = vouchers.length - balancedCount

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
                  Review and verify pending vouchers. Only balanced vouchers can be approved and posted to the general ledger.
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={fetchPendingVouchers}
                disabled={loading}
              >
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
                      <p className="text-2xl font-bold text-foreground">
                        {loading ? "—" : vouchers.length}
                      </p>
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
                      <p className="text-2xl font-bold text-green-700">
                        {loading ? "—" : balancedCount}
                      </p>
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
                      <p className="text-2xl font-bold text-red-700">
                        {loading ? "—" : unbalancedCount}
                      </p>
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

            {/* Main Content */}
            {selectedVoucher ? (
              /* ── Detail View ── */
              <div className="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setSelectedVoucher(null)
                    setLines([])
                    setError("")
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
                </Button>

                {/* Voucher Metadata */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      Voucher Details — Batch #{selectedVoucher.batchId}
                    </CardTitle>
                    <CardDescription>
                      Review the GL transaction lines before approving or rejecting
                    </CardDescription>
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
                        <Badge variant="outline" className="mt-0.5">
                          {selectedVoucher.voucherType}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Created By (Maker)</p>
                        <p className="font-semibold">
                          {selectedVoucher.makerName}
                          {selectedVoucher.makerEmpCode
                            ? ` (${selectedVoucher.makerEmpCode})`
                            : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Debit</p>
                        <p className="font-mono font-semibold text-red-700">
                          ₹{fmt(selectedVoucher.totalDebit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Credit</p>
                        <p className="font-mono font-semibold text-green-700">
                          ₹{fmt(selectedVoucher.totalCredit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Balance Status</p>
                        {selectedVoucher.totalDebit === selectedVoucher.totalCredit ? (
                          <Badge className="mt-0.5 border-green-300 bg-green-50 text-green-700" variant="outline">
                            Balanced
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="mt-0.5">
                            Unbalanced (diff: ₹{fmt(Math.abs(selectedVoucher.totalDebit - selectedVoucher.totalCredit))})
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* GL Lines Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">GL Transaction Lines</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {linesLoading ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Loading voucher lines...
                      </div>
                    ) : lines.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        No transaction lines found.
                      </div>
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
                              <TableCell className="font-mono text-xs pl-6">
                                {line.accountCode}
                              </TableCell>
                              <TableCell className="text-xs">{line.accountName}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {line.refAccountId && line.refAccountId !== "0"
                                  ? line.refAccountId
                                  : "-"}
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
                            <TableCell colSpan={4} className="text-xs font-bold pl-6">
                              Total
                            </TableCell>
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

                {/* Action Buttons */}
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
                          variant="destructive"
                          className="gap-2"
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
              /* ── Voucher List View ── */
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base">Pending Vouchers</CardTitle>
                    <CardDescription>
                      {loading
                        ? "Loading..."
                        : `${vouchers.length} pending voucher${vouchers.length !== 1 ? "s" : ""} awaiting verification`}
                    </CardDescription>
                  </div>
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
                        There are no pending vouchers to verify at this time.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs pl-6">Batch #</TableHead>
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
                        {vouchers.map((v) => {
                          const balanced = v.totalDebit === v.totalCredit
                          return (
                            <TableRow key={v.id} className="hover:bg-muted/50">
                              <TableCell className="font-mono text-xs font-semibold pl-6">
                                {v.batchId}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {v.voucherId}
                              </TableCell>
                              <TableCell className="text-xs">
                                {fmtDate(v.businessDate)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {v.voucherType}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {v.makerName}
                                {v.makerEmpCode ? (
                                  <span className="ml-1 text-muted-foreground">
                                    ({v.makerEmpCode})
                                  </span>
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
                                  <Badge
                                    variant="outline"
                                    className="border-green-300 bg-green-50 text-[10px] text-green-700"
                                  >
                                    Balanced
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Unbalanced
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-xs"
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
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* Confirm Action Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
      >
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
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {confirmAction === "APPROVE" ? "Approve & Post" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardWrapper>
  )
}
