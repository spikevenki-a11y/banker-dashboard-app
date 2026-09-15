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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Loader2, CheckCircle2, Banknote, History, IndianRupee, Calendar,
  CreditCard, Landmark, PiggyBank, AlertCircle, Search, RefreshCw,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type SavingsAccount = {
  account_number: string
  available_balance: number
  clear_balance: number
  unclear_balance: number
  account_status: string
  opening_date: string
  interest_rate: number
  scheme_name: string
}

type DebitEntry = {
  accountNumber: string
  selected: boolean
  debitAmount: string
  availableBalance: number
  schemeName: string
}

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
  penalRate: number | null
}

type RdInstallment = {
  id: string
  installment_number: number
  installment_amount: number
  installment_due_date: string | null
  installment_paid_date: string | null
  installment_voucher_no: number | null
  penalty_collected: number
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

type MemberDepositAccount = {
  accountNumber: string
  depositType: string
  depositTypeLabel: string
  schemeName: string
  balance: number
  interestRate: number
  openDate: string
  maturityDate: string | null
  maturityAmount: number | null
  depositAmount: number | null
  periodMonths: number | null
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

function isRecurringType(t: string | null | undefined) {
  return t === "RECURRING" || t === "R" || t === "RECURING"
}

/**
 * Renders the full account-detail / transaction posting UI for a single deposit account.
 * Stays in a disabled/placeholder state until a valid `accountNumber` is supplied.
 */
function DepositAccountPanel({ accountNumber }: { accountNumber: string | null }) {
  const [account, setAccount] = useState<DepositAccount | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rdInstallments, setRdInstallments] = useState<RdInstallment[]>([])
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<Set<string>>(new Set())
  const [penaltyOverrides, setPenaltyOverrides] = useState<Record<string, string>>({})
  const [totalTxns, setTotalTxns] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTxns, setIsLoadingTxns] = useState(false)

  // Transaction form
  const [narration, setNarration] = useState("")
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER">()
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])

  // Debit account (savings accounts)
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])
  const [debitEntries, setDebitEntries] = useState<DebitEntry[]>([])
  const [isLoadingSavings, setIsLoadingSavings] = useState(false)

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
      if (res.ok) {
        setAccount(data.account)
        setTransactions(data.transactions || [])
        setTotalTxns(data.total || 0)
        setRdInstallments(data.rdInstallments || [])
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
        setRdInstallments(data.rdInstallments || [])
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

  const fetchSavingsAccounts = async (membershipNo: string) => {
    setIsLoadingSavings(true)
    try {
      const res = await fetch(`/api/savings/by-member?membership_no=${encodeURIComponent(membershipNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (data.success && data.accounts) {
        const activeAccounts = data.accounts.filter(
          (a: SavingsAccount) => a.account_status?.toUpperCase() === "ACTIVE"
        )
        setSavingsAccounts(activeAccounts)
        setDebitEntries(
          activeAccounts.map((a: SavingsAccount) => ({
            accountNumber: a.account_number,
            selected: false,
            debitAmount: "",
            availableBalance: Number(a.available_balance),
            schemeName: a.scheme_name,
          }))
        )
      }
    } catch {
      // silent
    } finally {
      setIsLoadingSavings(false)
    }
  }

  useEffect(() => {
    if (accountNumber) {
      fetchAccountData(accountNumber)
    } else {
      setAccount(null)
      setTransactions([])
      setRdInstallments([])
      setSelectedInstallmentIds(new Set())
      setPenaltyOverrides({})
      setDebitEntries([])
      setVoucherType(undefined)
      setNarration("")
      setFormError("")
    }
  }, [accountNumber])

  // Fetch savings accounts when deposit account is loaded
  useEffect(() => {
    if (account?.membershipNo) {
      fetchSavingsAccounts(account.membershipNo)
    }
  }, [account?.membershipNo])

  // Debit entry helpers
  const toggleDebitEntry = (accountNo: string, checked: boolean) => {
    setDebitEntries((prev) =>
      prev.map((e) =>
        e.accountNumber === accountNo
          ? { ...e, selected: checked, debitAmount: checked ? e.debitAmount : "" }
          : e
      )
    )
  }

  const updateDebitAmount = (accountNo: string, value: string) => {
    setDebitEntries((prev) =>
      prev.map((e) =>
        e.accountNumber === accountNo ? { ...e, debitAmount: value } : e
      )
    )
  }

  // --- Installment selection helpers ---
  const calculatePenalty = (inst: RdInstallment): number => {
    if (!inst.installment_due_date || inst.installment_paid_date) return 0
    const dueDate = new Date(inst.installment_due_date)
    const today = new Date()
    if (today <= dueDate) return 0
    const diffTime = today.getTime() - dueDate.getTime()
    const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const penalRate = account?.penalRate || 0
    return Math.round(((inst.installment_amount * penalRate * overdueDays) / 36500) * 100) / 100
  }

  const totalDebit = debitEntries.reduce((sum, e) => {
    if (e.selected && e.debitAmount) {
      return sum + (parseFloat(e.debitAmount) || 0)
    }
    return sum
  }, 0)
  const selectedInstallmentsList = rdInstallments.filter((i) => selectedInstallmentIds.has(i.id))

  const unpaidInstallments = rdInstallments.filter((i) => !i.installment_paid_date)
  const allUnpaidSelected = unpaidInstallments.length > 0 && unpaidInstallments.every((i) => selectedInstallmentIds.has(i.id))
  const getPenaltyForInstallment = (inst: RdInstallment): number => {
    if (penaltyOverrides[inst.id] !== undefined && penaltyOverrides[inst.id] !== "") {
      return parseFloat(penaltyOverrides[inst.id]) || 0
    }
    return calculatePenalty(inst)
  }

  const totalInstallmentAmount = selectedInstallmentsList.reduce((s, i) => s + Number(i.installment_amount), 0)
  const totalPenalty = selectedInstallmentsList.reduce((s, i) => s + getPenaltyForInstallment(i), 0)
  const totalPayable = totalInstallmentAmount + totalPenalty
  const isRd = isRecurringType(account?.depositType)
  const creditAmount = isRd && selectedInstallmentsList.length > 0
    ? totalPayable
    : account?.depositAmount ? Number(account.depositAmount) : 0
  const debitMatchesCredit = Math.abs(totalDebit - creditAmount) < 0.01

  const hasDebitValidationError = debitEntries.some(
    (e) =>
      e.selected &&
      e.debitAmount &&
      parseFloat(e.debitAmount) > e.availableBalance
  )

  const toggleInstallment = (instId: string, checked: boolean) => {
    setSelectedInstallmentIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(instId)
      } else {
        next.delete(instId)
        setPenaltyOverrides((po) => {
          const updated = { ...po }
          delete updated[instId]
          return updated
        })
      }
      return next
    })
  }

  const toggleAllUnpaidInstallments = (checked: boolean) => {
    const unpaidIds = rdInstallments
      .filter((i) => !i.installment_paid_date)
      .map((i) => i.id)
    if (checked) {
      setSelectedInstallmentIds(new Set(unpaidIds))
    } else {
      setSelectedInstallmentIds(new Set())
      setPenaltyOverrides({})
    }
  }

  const handleSubmit = async () => {
    if (!account) return

    if (!voucherType) {
      setFormError("Please select a voucher type.")
      return
    }

    const isRdAccount = isRecurringType(account.depositType)
    const amt = isRdAccount && selectedInstallmentsList.length > 0
      ? totalPayable
      : account.depositAmount ? Number(account.depositAmount) : 0
    if (isNaN(amt) || amt <= 0) {
      setFormError(isRdAccount && selectedInstallmentsList.length === 0
        ? "Please select at least one installment to pay."
        : "Credit amount is not valid.")
      return
    }

    const selectedDebits = debitEntries.filter((e) => e.selected && e.debitAmount)
    if (voucherType === "TRANSFER") {
      if (selectedDebits.length === 0) {
        setFormError("Please select at least one savings account and enter debit amount.")
        return
      }

      for (const entry of selectedDebits) {
        const debitAmt = parseFloat(entry.debitAmount)
        if (isNaN(debitAmt) || debitAmt <= 0) {
          setFormError(`Invalid debit amount for account ${entry.accountNumber}.`)
          return
        }
        if (debitAmt > entry.availableBalance) {
          setFormError(`Debit amount exceeds available balance for account ${entry.accountNumber}.`)
          return
        }
      }

      const debitTotal = selectedDebits.reduce((s, e) => s + parseFloat(e.debitAmount), 0)
      if (Math.abs(debitTotal - amt) >= 0.01) {
        setFormError(`Total debit (${formatCurrency(debitTotal)}) must equal credit amount (${formatCurrency(amt)}).`)
        return
      }
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
          debitAccounts: voucherType === "TRANSFER"
            ? selectedDebits.map((e) => ({
                accountNumber: e.accountNumber,
                amount: parseFloat(e.debitAmount),
              }))
            : [],
          selectedInstallments: selectedInstallmentsList.map((i) => ({
            id: i.id,
            installment_number: i.installment_number,
            penalty: getPenaltyForInstallment(i),
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setAccount({ ...account, balance: data.newBalance })
      setSuccessMessage(data.message)
      setSuccessOpen(true)

      setNarration("")
      setSelectedBatch(0)
      setDebitEntries((prev) =>
        prev.map((e) => ({ ...e, selected: false, debitAmount: "" }))
      )
      setSelectedInstallmentIds(new Set())
      setPenaltyOverrides({})

      refreshTransactions()
      if (account.membershipNo) {
        fetchSavingsAccounts(account.membershipNo)
      }
    } catch (e: any) {
      setFormError(e.message || "Transaction failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!accountNumber) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Banknote className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Enter a membership number and select an account above to view and post transactions.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !account) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isActive = account.accountStatus === 1
  const typeLabel = depositTypeLabels[account.depositType] || account.depositType

  return (
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

              {isRd && (
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

        {/* RD Installment Details */}
        {isRd && rdInstallments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Installment Schedule</CardTitle>
                    <CardDescription>
                      {rdInstallments.filter(i => i.installment_paid_date).length} of {rdInstallments.length} installments paid
                      {account.penalRate ? ` | Penal Rate: ${account.penalRate}% p.a.` : ""}
                    </CardDescription>
                  </div>
                </div>
                {selectedInstallmentsList.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{selectedInstallmentsList.length} installment(s) selected</p>
                    <p className="text-sm font-bold text-teal-700">
                      Total: {formatCurrency(totalPayable)}
                    </p>
                    {totalPenalty > 0 && (
                      <p className="text-[10px] text-red-600">
                        incl. penalty {formatCurrency(totalPenalty)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        {unpaidInstallments.length > 0 && (
                          <Checkbox
                            checked={allUnpaidSelected}
                            onCheckedChange={(checked) => toggleAllUnpaidInstallments(checked === true)}
                            aria-label="Select all unpaid installments"
                          />
                        )}
                      </TableHead>
                      <TableHead className="w-[50px]">No.</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Voucher</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rdInstallments.map((inst) => {
                      const isPaid = !!inst.installment_paid_date
                      const isOverdue = !isPaid && inst.installment_due_date && new Date(inst.installment_due_date) < new Date()
                      const isSelected = selectedInstallmentIds.has(inst.id)
                      const autoPenalty = calculatePenalty(inst)

                      return (
                        <TableRow
                          key={inst.id}
                          className={isSelected ? "bg-teal-50/50 dark:bg-teal-950/20" : ""}
                        >
                          <TableCell>
                            {!isPaid ? (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => toggleInstallment(inst.id, checked === true)}
                                aria-label={`Select installment ${inst.installment_number}`}
                              />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-teal-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{inst.installment_number}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(inst.installment_amount)}</TableCell>
                          <TableCell className="text-sm">{formatDate(inst.installment_due_date)}</TableCell>
                          <TableCell className="text-sm">
                            {isPaid ? formatDate(inst.installment_paid_date) : "--"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {inst.installment_voucher_no ? `V${inst.installment_voucher_no}` : "--"}
                          </TableCell>
                          <TableCell>
                            {isPaid ? (
                              <span className="text-sm">
                                {Number(inst.penalty_collected) > 0 ? formatCurrency(inst.penalty_collected) : "--"}
                              </span>
                            ) : isSelected && isOverdue ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={penaltyOverrides[inst.id] !== undefined ? penaltyOverrides[inst.id] : String(autoPenalty)}
                                  onChange={(e) =>
                                    setPenaltyOverrides((prev) => ({
                                      ...prev,
                                      [inst.id]: e.target.value,
                                    }))
                                  }
                                  className="h-7 w-24 text-xs"
                                />
                              </div>
                            ) : isOverdue ? (
                              <span className="text-xs text-red-600">{formatCurrency(autoPenalty)}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">--</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                isPaid
                                  ? "border-teal-300 text-teal-700"
                                  : isOverdue
                                    ? "border-red-300 text-red-700"
                                    : "border-amber-300 text-amber-700"
                              }
                            >
                              {isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {selectedInstallmentsList.length > 0 && (
                <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-800 dark:bg-teal-950/30">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Installment Total</p>
                      <p className="font-semibold">{formatCurrency(totalInstallmentAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Penalty Total</p>
                      <p className={`font-semibold ${totalPenalty > 0 ? "text-red-600" : ""}`}>
                        {formatCurrency(totalPenalty)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Payable</p>
                      <p className="font-bold text-teal-700">{formatCurrency(totalPayable)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Credit Transaction Form */}
        {(isRd || account.depositAmount != account.balance) && (
          <Card className={!isActive ? "pointer-events-none opacity-50" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">{isRd ? "Installment Payment" : "Credit Transaction"}</CardTitle>
                  <CardDescription>
                    {isRd ? "Post a payment for the selected installment(s)" : `Deposit funds into the ${typeLabel.toLowerCase()} account`}
                  </CardDescription>
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
                    value={voucherType || ""}
                    onValueChange={(value) => {
                      setVoucherType(value as "CASH" | "TRANSFER")
                      if (value !== "TRANSFER") {
                        setSelectedBatch(0)
                        setDebitEntries((prev) =>
                          prev.map((e) => ({ ...e, selected: false, debitAmount: "" }))
                        )
                      }
                    }}
                  >
                    <SelectTrigger id="voucher-type" className="w-full">
                      <SelectValue placeholder="Select type" />
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
                      isRd && account.installmentAmount
                        ? String(account.installmentAmount)
                        : account.depositType === "PIGMY" && account.dailyAmount
                          ? String(account.dailyAmount)
                          : "Enter amount"
                    }
                    value={isRd && selectedInstallmentsList.length > 0 ? totalPayable : (account.depositAmount || "")}
                    disabled
                  />
                  {isRd && account.installmentAmount && (
                    <p className="text-xs text-muted-foreground">
                      {selectedInstallmentsList.length > 0
                        ? `${selectedInstallmentsList.length} installment(s): ${formatCurrency(totalInstallmentAmount)}${totalPenalty > 0 ? ` + penalty ${formatCurrency(totalPenalty)}` : ""}`
                        : `Installment: ${formatCurrency(account.installmentAmount)} - Select installments above`
                      }
                    </p>
                  )}
                  {account.depositType === "PIGMY" && account.dailyAmount && (
                    <p className="text-xs text-muted-foreground">
                      Min daily: {formatCurrency(account.dailyAmount)}
                    </p>
                  )}
                </div>
              </div>

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
                    isRd
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
                  disabled={isSubmitting || !voucherType || (isRd ? selectedInstallmentsList.length === 0 : !account.depositAmount) || (voucherType === "TRANSFER" && (!debitMatchesCredit || hasDebitValidationError))}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Banknote className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Processing..." : isRd ? "Submit Installment Payment" : "Submit Credit"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNarration("")
                    setSelectedBatch(0)
                    setFormError("")
                    setDebitEntries((prev) =>
                      prev.map((e) => ({ ...e, selected: false, debitAmount: "" }))
                    )
                  }}
                  className="bg-transparent"
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Debit Account Card */}
        {voucherType === "TRANSFER" && (isRd || account.depositAmount != account.balance) && (
          <Card className={!isActive ? "pointer-events-none opacity-50" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                  <PiggyBank className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Debit Account</CardTitle>
                  <CardDescription className="text-xs">
                    Select savings account(s) to debit
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingSavings ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Loading savings accounts...</span>
                </div>
              ) : debitEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <PiggyBank className="h-6 w-6 text-muted-foreground/40" />
                  <p className="mt-2 text-xs text-muted-foreground">No active savings accounts found for this member.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {debitEntries.map((entry) => {
                      const debitAmt = parseFloat(entry.debitAmount) || 0
                      const exceedsBalance = entry.selected && debitAmt > entry.availableBalance
                      return (
                        <div
                          key={entry.accountNumber}
                          className={`rounded-lg border p-3 transition-colors ${
                            entry.selected
                              ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={entry.selected}
                              onCheckedChange={(checked) =>
                                toggleDebitEntry(entry.accountNumber, checked === true)
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-mono font-medium truncate">{entry.accountNumber}</p>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{entry.schemeName}</p>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">Available:</span>
                                <span className="text-xs font-semibold text-teal-600">
                                  {formatCurrency(entry.availableBalance)}
                                </span>
                              </div>
                              {entry.selected && (
                                <div className="mt-2">
                                  <Label className="text-[10px] text-muted-foreground">Debit Amount</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    max={entry.availableBalance}
                                    placeholder="0.00"
                                    value={entry.debitAmount}
                                    onChange={(e) =>
                                      updateDebitAmount(entry.accountNumber, e.target.value)
                                    }
                                    className={`mt-1 h-8 text-sm ${
                                      exceedsBalance ? "border-red-400 focus-visible:ring-red-400" : ""
                                    }`}
                                  />
                                  {exceedsBalance && (
                                    <p className="mt-1 flex items-center gap-1 text-[10px] text-red-500">
                                      <AlertCircle className="h-3 w-3" />
                                      Exceeds available balance
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Debit</span>
                      <span
                        className={`text-base font-bold ${
                          debitMatchesCredit
                            ? "text-teal-600"
                            : totalDebit > 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(totalDebit)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Credit Amount</span>
                      <span className="text-xs font-semibold">{formatCurrency(creditAmount)}</span>
                    </div>
                    {totalDebit > 0 && !debitMatchesCredit && (
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-red-500">
                        <AlertCircle className="h-3 w-3" />
                        Total debit must equal credit amount
                      </p>
                    )}
                    {debitMatchesCredit && totalDebit > 0 && (
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-teal-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Debit and credit amounts match
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
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
    </div>
  )
}

/**
 * Membership No. lookup -> account resolution/selection -> transaction panel.
 * `recurringOnly` scopes the account list to RD accounts (RD Installments tab)
 * or non-RD deposit accounts (Deposit Transactions tab).
 */
function MembershipAccountFlow({
  recurringOnly,
  initialAccountNumber,
  initialMembershipNo,
}: {
  recurringOnly: boolean
  initialAccountNumber?: string
  initialMembershipNo?: string
}) {
  const [membershipNo, setMembershipNo] = useState(initialMembershipNo || "")
  const [isSearching, setIsSearching] = useState(false)
  const [accounts, setAccounts] = useState<MemberDepositAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState(initialAccountNumber || "")
  const [error, setError] = useState("")

  useEffect(() => {
    if (initialAccountNumber) {
      setSelectedAccount(initialAccountNumber)
    }
    if (initialMembershipNo) {
      setMembershipNo(initialMembershipNo)
    }
  }, [initialAccountNumber, initialMembershipNo])

  const handleLookup = async () => {
    const no = membershipNo.trim()
    if (!no) {
      setError("Please enter a membership number.")
      return
    }
    setIsSearching(true)
    setError("")
    setAccounts([])
    setSelectedAccount("")
    try {
      const res = await fetch(`/api/deposits/by-member?membership_no=${encodeURIComponent(no)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "Lookup failed. Please try again.")
        return
      }
      const filtered: MemberDepositAccount[] = (data.deposits || []).filter((d: MemberDepositAccount) =>
        recurringOnly ? isRecurringType(d.depositType) : !isRecurringType(d.depositType)
      )
      setAccounts(filtered)
      if (filtered.length === 0) {
        setError(
          recurringOnly
            ? "No active Recurring Deposit accounts found for this membership number."
            : "No active deposit accounts found for this membership number."
        )
      } else if (filtered.length === 1) {
        setSelectedAccount(filtered[0].accountNumber)
      }
    } catch {
      setError("Failed to look up membership number. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
              1
            </div>
            <div>
              <CardTitle className="text-lg">Member &amp; Account Lookup</CardTitle>
              <CardDescription>
                {recurringOnly
                  ? "Enter the membership number to find the member's Recurring Deposit accounts"
                  : "Enter the membership number to find the member's deposit accounts"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`membership-no-${recurringOnly ? "rd" : "dep"}`}>Membership No. *</Label>
            <div className="flex gap-2">
              <Input
                id={`membership-no-${recurringOnly ? "rd" : "dep"}`}
                placeholder="Enter membership number"
                value={membershipNo}
                onChange={(e) => {
                  setMembershipNo(e.target.value)
                  setError("")
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="flex-1"
              />
              <Button onClick={handleLookup} disabled={isSearching || !membershipNo.trim()} className="gap-2">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Lookup
              </Button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {accounts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {accounts.length} account(s) found — select one to continue
              </Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.accountNumber} value={acc.accountNumber}>
                      <span className="font-mono">{acc.accountNumber}</span>
                      <span className="ml-2 text-muted-foreground">— {acc.depositTypeLabel} · {acc.schemeName}</span>
                      <span className="ml-2 text-teal-600">{formatCurrency(acc.balance)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {accounts.length === 1 && (
            <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:border-teal-800 dark:bg-teal-950/30">
              <CheckCircle2 className="h-4 w-4" />
              1 account found: <span className="font-mono font-medium">{accounts[0].accountNumber}</span> ({accounts[0].depositTypeLabel})
            </div>
          )}
        </CardContent>
      </Card>

      <DepositAccountPanel accountNumber={selectedAccount || null} />
    </div>
  )
}

function TransactionsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountParam = searchParams.get("account")

  const [activeTab, setActiveTab] = useState<"deposit" | "rd">("deposit")
  const [deepLink, setDeepLink] = useState<{ accountNumber: string; membershipNo: string; tab: "deposit" | "rd" } | null>(null)
  const [isResolvingDeepLink, setIsResolvingDeepLink] = useState(!!accountParam)

  useEffect(() => {
    if (!accountParam) {
      setIsResolvingDeepLink(false)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/deposits/transactions?account=${encodeURIComponent(accountParam)}`, {
          credentials: "include",
        })
        const data = await res.json()
        if (res.ok && data.account) {
          const tab: "deposit" | "rd" = isRecurringType(data.account.depositType) ? "rd" : "deposit"
          setActiveTab(tab)
          setDeepLink({ accountNumber: accountParam, membershipNo: data.account.membershipNo, tab })
        }
      } catch {
        // silent
      } finally {
        setIsResolvingDeepLink(false)
      }
    })()
  }, [accountParam])

  return (
    <DashboardWrapper>
      <div className="">
        <div className="">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.push("/fixed-deposits")} className="h-10 w-10 bg-transparent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Transactions</h1>
                <p className="text-muted-foreground">
                  Look up a member to post deposit transactions or collect RD installments
                </p>
              </div>
            </div>

            {isResolvingDeepLink ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "deposit" | "rd")}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="deposit" className="gap-2">
                    <Banknote className="h-4 w-4" />
                    Deposit Transactions
                  </TabsTrigger>
                  <TabsTrigger value="rd" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    RD Installments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="deposit" className="mt-6">
                  <MembershipAccountFlow
                    recurringOnly={false}
                    initialAccountNumber={deepLink?.tab === "deposit" ? deepLink.accountNumber : undefined}
                    initialMembershipNo={deepLink?.tab === "deposit" ? deepLink.membershipNo : undefined}
                  />
                </TabsContent>
                <TabsContent value="rd" className="mt-6">
                  <MembershipAccountFlow
                    recurringOnly={true}
                    initialAccountNumber={deepLink?.tab === "rd" ? deepLink.accountNumber : undefined}
                    initialMembershipNo={deepLink?.tab === "rd" ? deepLink.membershipNo : undefined}
                  />
                </TabsContent>
              </Tabs>
            )}
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
      <TransactionsPageContent />
    </Suspense>
  )
}
