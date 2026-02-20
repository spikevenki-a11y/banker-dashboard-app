"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft, Loader2, CheckCircle2, Banknote, History, IndianRupee, Calendar, TrendingUp,
  CreditCard, Landmark,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type DepositAccount = {
  accountNumber: string
  depositType: string
  membershipNo: string
  memberName: string
  openDate: string
  interestRate: number
  balance: number
  unclearBalance: number
  accountStatus: number
  schemeId: number
  schemeName: string
  depositGlAccount: string
  depositAmount: number | null
  periodMonths: number | null
  periodDays: number | null
  maturityDate: string | null
  maturityAmount: number | null
  installmentAmount: number | null
  installmentFrequency: string | null
  totalInstallments: number | null
  paidInstallments: number | null
  nextInstallmentDate: string | null
  dailyAmount: number | null
  collectionFrequency: string | null
}

type Transaction = {
  id: string
  transaction_date: string
  debit_amount: number
  credit_amount: number
  narration: string
  voucher_no: number
  gl_batch_id: number
  batch_status: string
  voucher_type: string
  created_at: string
}

function formatCurrency(val: number | string | null | undefined) {
  if (val == null) return "--"
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(val))
}

function formatDate(d: string | null | undefined) {
  if (!d) return "--"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const depositTypeLabels: Record<string, string> = {
  T: "Term Deposit",
  TERM: "Term Deposit",
  R: "Recurring Deposit",
  RECURRING: "Recurring Deposit",
  P: "Pigmy Deposit",
  PIGMY: "Pigmy Deposit",
}

const statusLabels: Record<number, string> = {
  1: "Active",
  2: "Matured",
  3: "Closed",
  4: "Premature",
}

function DepositTransactionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountParam = searchParams.get("account")

  const [account, setAccount] = useState<DepositAccount | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalTxns, setTotalTxns] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTxns, setIsLoadingTxns] = useState(false)

  // Transaction form
  const [amount, setAmount] = useState("")
  const [narration, setNarration] = useState("")
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER">("TRANSFER")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")

  const fetchAccountData = async (acctNo: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/deposits/transactions?account=${encodeURIComponent(acctNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      console.log(data)
      if (res.ok) {
        setAccount(data.account)
        setTransactions(data.transactions || [])
        setTotalTxns(data.total || 0)
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTransactions = async () => {
    if (!account) return
    setIsLoadingTxns(true)
    try {
      const res = await fetch(`/api/deposits/transactions?account=${encodeURIComponent(account.accountNumber)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) {
        setAccount(data.account)
        setTransactions(data.transactions || [])
        setTotalTxns(data.total || 0)
      }
    } catch {
      // silent
    } finally {
      setIsLoadingTxns(false)
    }
  }

  const fetchIncompleteBatches = async () => {
    try {
      const res = await fetch("/api/fas/incomplete-batches", { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.data) {
        setIncompleteBatches(data.data)
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (accountParam) {
      fetchAccountData(accountParam)
    } else {
      setIsLoading(false)
    }
  }, [accountParam])

  const handleSubmit = async () => {
    if (!account) return

    if (!voucherType) {
      setFormError("Please select a voucher type.")
      return
    }

    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setFormError("Enter a valid positive amount.")
      return
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/deposits/transactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: account.accountNumber,
          amount: amt,
          narration: narration || "Deposit Credit",
          voucherType,
          selectedBatch,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setAccount({ ...account, balance: data.newBalance })
      setSuccessMessage(data.message)
      setSuccessOpen(true)

      // Reset form
      setAmount("")
      setNarration("")
      // setVoucherType("")
      setSelectedBatch(0)

      refreshTransactions()
    } catch (e: any) {
      setFormError(e.message || "Transaction failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isActive = account?.accountStatus === 1
  const typeLabel = account ? (depositTypeLabels[account.depositType] || account.depositType) : ""

  if (isLoading) {
    return (
      <DashboardWrapper>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardWrapper>
    )
  }

  if (!account) {
    return (
      <DashboardWrapper>
        <div className="flex h-screen overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-background p-6">
              <div className="mb-6 flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push("/fixed-deposits")} className="h-10 w-10 bg-transparent">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Deposit Transaction</h1>
                  <p className="text-muted-foreground">Account not found or no account specified.</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </DashboardWrapper>
    )
  }

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.push("/fixed-deposits")} className="h-10 w-10 bg-transparent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Deposit Transaction</h1>
                <p className="text-muted-foreground">
                  Credit transaction for {typeLabel} - Account {account.accountNumber}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column */}
              <div className="space-y-6 lg:col-span-2">

                {/* Account Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">Account Information</CardTitle>
                          <Badge
                            variant={isActive ? "default" : "secondary"}
                            className={
                              isActive
                                ? "bg-teal-100 text-teal-700"
                                : account.accountStatus === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-700"
                            }
                          >
                            {statusLabels[account.accountStatus] || "Unknown"}
                          </Badge>
                        </div>
                        <CardDescription className="font-mono">{account.accountNumber}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Member Name</p>
                        <p className="text-sm font-medium">{account.memberName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Membership No</p>
                        <p className="text-sm font-mono font-medium">{account.membershipNo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Deposit Type</p>
                        <p className="text-sm font-medium">{typeLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Scheme</p>
                        <p className="text-sm font-medium">{account.schemeName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interest Rate</p>
                        <p className="text-sm font-medium">{account.interestRate}% p.a.</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Opening Date</p>
                        <p className="text-sm font-medium">{formatDate(account.openDate)}</p>
                      </div>

                      {/* Type-specific fields */}
                      {account.depositType === "TERM" && account.depositAmount && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Deposit Amount</p>
                            <p className="text-sm font-semibold">{formatCurrency(account.depositAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tenure</p>
                            <p className="text-sm font-medium">
                              {account.periodMonths}m {account.periodDays ? `${account.periodDays}d` : ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Maturity</p>
                            <p className="text-sm font-medium">
                              {formatCurrency(account.maturityAmount)} on {formatDate(account.maturityDate)}
                            </p>
                          </div>
                        </>
                      )}

                      {account.depositType === "RECURRING" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Installment</p>
                            <p className="text-sm font-semibold">
                              {formatCurrency(account.installmentAmount)} / {account.installmentFrequency || "Monthly"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Installments Paid</p>
                            <p className="text-sm font-medium">
                              {account.paidInstallments || 0} / {account.totalInstallments || 0}
                            </p>
                          </div>
                          {account.nextInstallmentDate && (
                            <div>
                              <p className="text-xs text-muted-foreground">Next Installment</p>
                              <p className="text-sm font-medium">{formatDate(account.nextInstallmentDate)}</p>
                            </div>
                          )}
                        </>
                      )}

                      {account.depositType === "PIGMY" && (
                        <div>
                          <p className="text-xs text-muted-foreground">Daily Amount</p>
                          <p className="text-sm font-semibold">
                            {formatCurrency(account.dailyAmount)} / {account.collectionFrequency || "Daily"}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Credit Transaction Form */}
                <Card className={!isActive ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Credit Transaction</CardTitle>
                        <CardDescription>Deposit funds into the {typeLabel.toLowerCase()} account</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isActive && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Transactions are only allowed on active accounts. Current status:{" "}
                        <strong>{statusLabels[account.accountStatus] || "Unknown"}</strong>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="voucher-type">Voucher Type *</Label>
                        <Select
                          value={voucherType || "TRANSFER"}
                          onValueChange={(value) => {
                            setVoucherType("TRANSFER")
                            if (value !== "TRANSFER") setSelectedBatch(0)
                          }}
                        disabled
                        >
                          <SelectTrigger id="voucher-type" className="w-full">
                            <SelectValue placeholder="Select voucher type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="credit-amount">Credit Amount (INR) *</Label>
                        <Input
                          id="credit-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={
                            account.depositType === "RECURRING" && account.installmentAmount
                              ? String(account.installmentAmount)
                              : account.depositType === "PIGMY" && account.dailyAmount
                                ? String(account.dailyAmount)
                                : "Enter amount"
                          }
                          // value={amount}
                          value={account.depositAmount}
                          disabled
                          // onChange={(e) => setAmount(e.target.value)}
                        />
                        {account.depositType === "RECURRING" && account.installmentAmount && (
                          <p className="text-xs text-muted-foreground">
                            Installment: {formatCurrency(account.installmentAmount)}
                          </p>
                        )}
                        {account.depositType === "PIGMY" && account.dailyAmount && (
                          <p className="text-xs text-muted-foreground">
                            Min daily: {formatCurrency(account.dailyAmount)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* GL Batch Selection for TRANSFER */}
                    {voucherType === "TRANSFER" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>GL Batch ID</Label>
                          <div className="flex gap-2">
                            <Input
                              value={selectedBatch && selectedBatch !== 0 ? selectedBatch : "New Batch"}
                              readOnly
                              disabled
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="bg-transparent"
                              onClick={() => {
                                fetchIncompleteBatches()
                                setIsBatchPopupOpen(true)
                              }}
                              disabled
                              hidden
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="txn-narration">Narration</Label>
                      <Textarea
                        id="txn-narration"
                        placeholder={
                          account.depositType === "RECURRING"
                            ? "RD Installment Payment"
                            : account.depositType === "PIGMY"
                              ? "Pigmy Collection"
                              : "Deposit Credit"
                        }
                        rows={2}
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                      />
                    </div>

                    {formError && <p className="text-sm text-red-500">{formError}</p>}

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !voucherType || !account.depositAmount}
                        className="gap-2"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Banknote className="h-4 w-4" />
                        )}
                        {isSubmitting ? "Processing..." : "Submit Credit"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAmount("")
                          setNarration("")
                          // setVoucherType("")
                          setSelectedBatch(0)
                          setFormError("")
                        }}
                        className="bg-transparent"
                      >
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction History */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                          <History className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Transaction History</CardTitle>
                          <CardDescription>{totalTxns} transaction(s) found</CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshTransactions}
                        disabled={isLoadingTxns}
                        className="bg-transparent"
                      >
                        {isLoadingTxns ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTxns ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <History className="h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">No transactions found for this account.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Voucher</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                              <TableHead>Narration</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((txn) => (
                              <TableRow key={txn.id}>
                                <TableCell className="text-sm">{formatDate(txn.transaction_date)}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  B{txn.gl_batch_id}/V{txn.voucher_no}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {txn.voucher_type || "CASH"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium text-red-600">
                                  {Number(txn.debit_amount) > 0 ? formatCurrency(txn.debit_amount) : ""}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium text-teal-600">
                                  {Number(txn.credit_amount) > 0 ? formatCurrency(txn.credit_amount) : ""}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                  {txn.narration}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      txn.batch_status === "APPROVED"
                                        ? "border-teal-300 text-teal-700"
                                        : txn.batch_status === "PENDING"
                                          ? "border-amber-300 text-amber-700"
                                          : "border-gray-300 text-gray-700"
                                    }
                                  >
                                    {txn.batch_status || "PENDING"}
                                  </Badge>
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

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Balance Card */}
                <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-800 dark:bg-teal-950/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900">
                        <IndianRupee className="h-6 w-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Balance</p>
                        <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{formatCurrency(account.balance)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Account Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="outline">{typeLabel}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Deposit Amount</span>
                      <span className="text-sm font-semibold">{account.depositAmount}</span>
                    </div>
                    {account.maturityDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Maturity</span>
                        <span className="text-sm font-medium">{formatDate(account.maturityDate)}</span>
                      </div>
                    )}
                    {account.maturityAmount && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Maturity Amt</span>
                        <span className="text-sm font-semibold text-teal-600">{formatCurrency(account.maturityAmount)}</span>
                      </div>
                    )}
                    {account.depositType === "RECURRING" && (
                      <>
                        <div className="border-t border-border pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Paid</span>
                            <span className="text-sm font-medium">
                              {account.paidInstallments || 0} / {account.totalInstallments || 0}
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-teal-500 transition-all"
                              style={{
                                width: `${account.totalInstallments ? ((account.paidInstallments || 0) / account.totalInstallments) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Opened</span>
                        <span className="text-sm font-medium">{formatDate(account.openDate)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Batch Selection Dialog */}
            <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Select GL Batch</DialogTitle>
                </DialogHeader>
                <div className="max-h-[300px] overflow-y-auto">
                  {incompleteBatches.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No incomplete batches found. A new batch will be created.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incompleteBatches.map((b: any) => (
                          <TableRow key={b.batch_id}>
                            <TableCell className="font-mono">{b.batch_id}</TableCell>
                            <TableCell>{formatDate(b.business_date)}</TableCell>
                            <TableCell>{b.voucher_type}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() => {
                                  setSelectedBatch(b.batch_id)
                                  setIsBatchPopupOpen(false)
                                }}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedBatch(0)
                      setIsBatchPopupOpen(false)
                    }}
                    className="bg-transparent"
                  >
                    New Batch
                  </Button>
                  <Button variant="outline" onClick={() => setIsBatchPopupOpen(false)} className="bg-transparent">
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-teal-700">
                    <CheckCircle2 className="h-5 w-5" />
                    Transaction Successful
                  </AlertDialogTitle>
                  <AlertDialogDescription>{successMessage}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setSuccessOpen(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}

export default function DepositTransactionsPage() {
  return (
    <Suspense
      fallback={
        <DashboardWrapper>
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardWrapper>
      }
    >
      <DepositTransactionsContent />
    </Suspense>
  )
}
