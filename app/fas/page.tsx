"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Calculator,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

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

export default function FASPage() {
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [vouchers, setVouchers] = useState<PendingVoucher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Detail view
  const [selectedVoucher, setSelectedVoucher] = useState<PendingVoucher | null>(null)
  const [lines, setLines] = useState<VoucherLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)

  // Confirm dialog
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

  function handleOpenVerify() {
    setVerifyOpen(true)
    setSelectedVoucher(null)
    setLines([])
    setError("")
    setSuccess("")
    fetchPendingVouchers()
  }

  async function handleViewDetail(voucher: PendingVoucher) {
    setSelectedVoucher(voucher)
    setLinesLoading(true)
    setError("")
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

  return (
    <DashboardWrapper>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">FAS</h1>
          <p className="text-muted-foreground">Financial Accounting System</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={handleOpenVerify}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verify Vouchers</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {"Verify Vouchers & Cancel Vouchers"}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">DayEnd</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Close the current Financial Day
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Record financial transactions
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Trial Balance</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">View account balances</p>
            </CardContent>
          </Card>

          <Card className="hidden cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Financial Reports</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Generate financial statements
              </p>
            </CardContent>
          </Card>

          <Card className="hidden cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Budget Management</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Plan and track budgets</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Audit</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Audit Module</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verify Vouchers Dialog */}
      <Dialog
        open={verifyOpen}
        onOpenChange={(open) => {
          setVerifyOpen(open)
          if (!open) {
            setSelectedVoucher(null)
            setLines([])
            setError("")
            setSuccess("")
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <ShieldCheck className="h-5 w-5" />
              {selectedVoucher ? "Voucher Details" : "Verify Vouchers"}
            </DialogTitle>
            <DialogDescription className="text-pretty">
              {selectedVoucher
                ? `Batch #${selectedVoucher.batchId} | Voucher #${selectedVoucher.voucherId} | ${fmtDate(selectedVoucher.businessDate)}`
                : "Review and verify pending vouchers. Only balanced vouchers can be approved."}
            </DialogDescription>
          </DialogHeader>

          {/* Messages */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-300 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Detail View */}
          {selectedVoucher ? (
            <div className="space-y-4">
              {/* Back button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={() => {
                    setSelectedVoucher(null)
                    setLines([])
                    setError("")
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
                </Button>
              </div>

              {/* Voucher meta */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Batch No
                      </span>
                      <p className="font-semibold">{selectedVoucher.batchId}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Voucher No
                      </span>
                      <p className="font-semibold">{selectedVoucher.voucherId}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Date
                      </span>
                      <p className="font-semibold">
                        {fmtDate(selectedVoucher.businessDate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Type
                      </span>
                      <Badge variant="outline" className="mt-0.5">
                        {selectedVoucher.voucherType}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Created By
                      </span>
                      <p className="font-semibold">
                        {selectedVoucher.makerName}
                        {selectedVoucher.makerEmpCode
                          ? ` (${selectedVoucher.makerEmpCode})`
                          : ""}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Total Debit
                      </span>
                      <p className="font-mono font-semibold">
                        {fmt(selectedVoucher.totalDebit)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Total Credit
                      </span>
                      <p className="font-mono font-semibold">
                        {fmt(selectedVoucher.totalCredit)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Balance
                      </span>
                      {selectedVoucher.totalDebit === selectedVoucher.totalCredit ? (
                        <Badge className="mt-0.5 border-green-300 bg-green-50 text-green-700" variant="outline">
                          Balanced
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="mt-0.5">
                          Unbalanced ({fmt(Math.abs(selectedVoucher.totalDebit - selectedVoucher.totalCredit))})
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* GL Lines Table */}
              {linesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading voucher lines...
                </div>
              ) : lines.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28 text-xs">GL Code</TableHead>
                      <TableHead className="text-xs">Account Name</TableHead>
                      <TableHead className="text-xs">Ref A/c</TableHead>
                      <TableHead className="text-xs">Narration</TableHead>
                      <TableHead className="text-right text-xs">Debit (Rs.)</TableHead>
                      <TableHead className="text-right text-xs">Credit (Rs.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono text-xs">
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
                        <TableCell className="text-right font-mono text-xs">
                          {line.debitAmount > 0 ? fmt(line.debitAmount) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {line.creditAmount > 0 ? fmt(line.creditAmount) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-xs font-bold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {fmt(
                          lines.reduce((s, l) => s + l.debitAmount, 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {fmt(
                          lines.reduce((s, l) => s + l.creditAmount, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No transaction lines found.
                </p>
              )}

              {/* Action buttons */}
              {lines.length > 0 && (
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <Button
                    className="gap-2"
                    onClick={() => setConfirmAction("APPROVE")}
                    disabled={
                      selectedVoucher.totalDebit !== selectedVoucher.totalCredit
                    }
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
                    Reject
                  </Button>
                  {selectedVoucher.totalDebit !== selectedVoucher.totalCredit && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Unbalanced voucher cannot be approved
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Vouchers List View */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={fetchPendingVouchers}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <span className="text-sm text-muted-foreground">
                  {vouchers.length} pending voucher{vouchers.length !== 1 ? "s" : ""}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading pending vouchers...
                </div>
              ) : vouchers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="mb-3 h-12 w-12 text-green-500" />
                  <h3 className="text-lg font-semibold text-foreground">
                    All clear!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    There are no pending vouchers to verify.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Batch</TableHead>
                      <TableHead className="text-xs">Voucher</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Created By</TableHead>
                      <TableHead className="text-right text-xs">
                        Debit (Rs.)
                      </TableHead>
                      <TableHead className="text-right text-xs">
                        Credit (Rs.)
                      </TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-right text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((v) => {
                      const balanced = v.totalDebit === v.totalCredit
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs font-semibold">
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
                          <TableCell className="text-right font-mono text-xs">
                            {fmt(v.totalDebit)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
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
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                Unbalanced
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 bg-transparent text-xs"
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-balance">
              {confirmAction === "APPROVE"
                ? "Approve & Post Voucher?"
                : "Reject Voucher?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
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
                  : ""
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
