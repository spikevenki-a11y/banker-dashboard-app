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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft, Loader2, CheckCircle2, AlertTriangle, IndianRupee,
  Calendar, TrendingUp, Landmark, PiggyBank, AlertCircle, XCircle, ShieldAlert,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type ClosureAccount = {
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
  interestExpenseGlAccount: string
  interestPayableGlAccount: string
  depositAmount: number
  periodMonths: number | null
  periodDays: number | null
  maturityDate: string | null
  maturityAmount: number
  installmentAmount: number | null
  installmentFrequency: string | null
  totalInstallments: number | null
  paidInstallments: number | null
  interestEarned: number
  interestPaid: number
  isPremature: boolean
  prematurePenalRate: number
  penaltyAmount: number
  payoutAmount: number
  prematureClosureAllowed: boolean
  interestdueforpayment : number
}

type SavingsAccount = {
  accountNumber: string
  availableBalance: number
  clearBalance: number
  schemeName: string
}

type CreditEntry = {
  accountNumber: string
  selected: boolean
  creditAmount: string
  availableBalance: number
  schemeName: string
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
  RECURING: "Recurring Deposit",
  P: "Pigmy Deposit",
  PIGMY: "Pigmy Deposit",
}

const statusLabels: Record<number, string> = {
  1: "Active",
  2: "Matured",
  3: "Closed",
  4: "Premature",
}

function DepositClosureContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountParam = searchParams.get("account")

  const [account, setAccount] = useState<ClosureAccount | null>(null)
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form state
  const [voucherType, setVoucherType] = useState<string>("")
  const [narration, setNarration] = useState("")
  const [penaltyOverride, setPenaltyOverride] = useState<string>("")

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const fetchClosureData = async (acctNo: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/deposits/closure?account=${encodeURIComponent(acctNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      console.log(data)
      if (res.ok) {
        setAccount(data.account)
        setSavingsAccounts(data.savingsAccounts || [])
        setCreditEntries(
          (data.savingsAccounts || []).map((s: SavingsAccount) => ({
            accountNumber: s.accountNumber,
            selected: false,
            creditAmount: "",
            availableBalance: s.availableBalance,
            schemeName: s.schemeName,
          }))
        )
        if (data.account.isPremature) {
          setPenaltyOverride(String(data.account.penaltyAmount))
        }
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (accountParam) {
      fetchClosureData(accountParam)
    } else {
      setIsLoading(false)
    }
  }, [accountParam])

  // Credit entry helpers
  const toggleCreditEntry = (accountNumber: string, checked: boolean) => {
    setCreditEntries((prev) =>
      prev.map((e) =>
        e.accountNumber === accountNumber
          ? { ...e, selected: checked, creditAmount: checked ? e.creditAmount : "" }
          : e
      )
    )
  }

  const updateCreditAmount = (accountNumber: string, value: string) => {
    setCreditEntries((prev) =>
      prev.map((e) =>
        e.accountNumber === accountNumber ? { ...e, creditAmount: value } : e
      )
    )
  }

  // Derived values
  const effectivePenalty = account?.isPremature
    ? (penaltyOverride !== "" ? parseFloat(penaltyOverride) || 0 : account.penaltyAmount)
    : 0
  const effectivePayout = account
    ? Number(account.balance) - Number(effectivePenalty) + Number(account.interestdueforpayment)
    : 0
  
  const totalCredit = creditEntries.reduce((sum, e) => {
    if (e.selected && e.creditAmount) return sum + (parseFloat(e.creditAmount) || 0)
    return sum
  }, 0)

  const creditMatchesPayout = Math.abs(totalCredit - effectivePayout) < 0.01

  const canSubmit = account &&
    voucherType &&
    effectivePayout >= 0 &&
    (voucherType === "CASH" || (creditEntries.some((e) => e.selected) && creditMatchesPayout)) &&
    !isSubmitting

  const handleConfirmClosure = () => {
    setFormError("")

    if (!voucherType) {
      setFormError("Please select a voucher type.")
      return
    }

    if (voucherType === "TRANSFER") {
      const selectedCredits = creditEntries.filter((e) => e.selected && e.creditAmount)
      if (selectedCredits.length === 0) {
        setFormError("Please select at least one savings account and enter credit amount.")
        return
      }
      if (!creditMatchesPayout) {
        setFormError(`Total credit (${formatCurrency(totalCredit)}) must equal payout amount (${formatCurrency(effectivePayout)}).`)
        return
      }
    }

    setConfirmOpen(true)
  }

  const handleSubmit = async () => {
    if (!account) return
    setConfirmOpen(false)
    setIsSubmitting(true)
    setFormError("")

    try {
      const selectedCredits = creditEntries
        .filter((e) => e.selected && e.creditAmount)
        .map((e) => ({ accountNumber: e.accountNumber, amount: parseFloat(e.creditAmount) }))

      const res = await fetch("/api/deposits/closure", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: account.accountNumber,
          payoutAmount: effectivePayout,
          penaltyAmount: effectivePenalty,
          narration: narration || `Deposit Closure - A/c ${account.accountNumber}`,
          voucherType,
          creditAccounts: voucherType === "TRANSFER" ? selectedCredits : [],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccessMessage(data.message)
      setSuccessOpen(true)
    } catch (e: any) {
      setFormError(e.message || "Closure failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

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
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Closure</h1>
                  <p className="text-muted-foreground">Account not found or no account specified.</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </DashboardWrapper>
    )
  }

  const typeLabel = depositTypeLabels[account.depositType] || account.depositType
  const isActive = account.accountStatus === 1
  const isMatured = account.accountStatus === 6
  const closureAllowed = isActive || isMatured

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
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Closure</h1>
                  {account.isPremature && (
                    <Badge className="bg-orange-100 text-orange-700">Premature</Badge>
                  )}
                  {isMatured && (
                    <Badge className="bg-teal-100 text-teal-700">Matured</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Close {typeLabel} - Account {account.accountNumber}
                </p>
              </div>
            </div>

            {!closureAllowed && (
              <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    This account is already closed (Status: {statusLabels[account.accountStatus] || "Unknown"}). No further closure action is allowed.
                  </p>
                </CardContent>
              </Card>
            )}

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
                            className={
                              isActive
                                ? "bg-teal-100 text-teal-700"
                                : isMatured
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
                      {account.depositAmount > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Deposit Amount</p>
                          <p className="text-sm font-semibold">{formatCurrency(account.depositAmount)}</p>
                        </div>
                      )}
                      {account.periodMonths != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Tenure</p>
                          <p className="text-sm font-medium">
                            {account.periodMonths}m {account.periodDays ? `${account.periodDays}d` : ""}
                          </p>
                        </div>
                      )}
                      {account.maturityDate && (
                        <div>
                          <p className="text-xs text-muted-foreground">Maturity Date</p>
                          <p className="text-sm font-medium">{formatDate(account.maturityDate)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Closure Summary Card */}
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Closure Calculation</CardTitle>
                        <CardDescription>
                          {account.isPremature ? "Premature closure with penalty" : "Maturity closure settlement"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-sm text-muted-foreground">Current Balance</span>
                        <span className="text-sm font-semibold">{formatCurrency(account.balance)}</span>
                      </div>
                      {account.maturityAmount > 0 && (
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="text-sm text-muted-foreground">Maturity Amount</span>
                          <span className="text-sm font-semibold text-teal-600">{formatCurrency(account.maturityAmount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-sm text-muted-foreground">Interest Earned</span>
                        <span className="text-sm font-semibold text-teal-600">{formatCurrency(account.interestdueforpayment)}</span>
                      </div>

                      {account.isPremature && (
                        <>
                          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Premature Closure Penalty</p>
                            </div>
                            <p className="text-xs text-orange-700 dark:text-orange-400 mb-3">
                              Penal rate: {account.prematurePenalRate}% on interest earned
                            </p>
                            <div className="flex items-center gap-3">
                              <Label htmlFor="penalty" className="text-xs text-orange-700 dark:text-orange-400 whitespace-nowrap">
                                Penalty Amount
                              </Label>
                              <Input
                                id="penalty"
                                type="number"
                                min="0"
                                step="0.01"
                                value={penaltyOverride}
                                onChange={(e) => setPenaltyOverride(e.target.value)}
                                className="h-8 w-36 text-sm"
                                disabled={!closureAllowed}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <span className="text-sm text-muted-foreground">Penalty Deduction</span>
                            <span className="text-sm font-semibold text-red-600">- {formatCurrency(effectivePenalty)}</span>
                          </div>
                        </>
                      )}

                      <div className="flex items-center justify-between rounded-lg bg-teal-50 p-3 dark:bg-teal-950/30">
                        <span className="text-base font-semibold text-teal-800 dark:text-teal-300">Net Payout Amount</span>
                        <span className="text-xl font-bold text-teal-700 dark:text-teal-400">{formatCurrency(effectivePayout)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Closure Form */}
                {closureAllowed && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Close Account</CardTitle>
                          <CardDescription>Select voucher type and narration for closure</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="voucher-type">Voucher Type *</Label>
                          <Select value={voucherType} onValueChange={setVoucherType}>
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
                          <Label>Net Payout</Label>
                          <Input
                            value={formatCurrency(effectivePayout)}
                            disabled
                            className="font-semibold text-teal-700"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="closure-narration">Narration</Label>
                        <Textarea
                          id="closure-narration"
                          placeholder={`Deposit Closure - A/c ${account.accountNumber}`}
                          rows={2}
                          value={narration}
                          onChange={(e) => setNarration(e.target.value)}
                        />
                      </div>

                      {formError && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <p className="text-sm text-red-600">{formError}</p>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="destructive"
                          onClick={handleConfirmClosure}
                          disabled={!canSubmit}
                          className="gap-2"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          {isSubmitting ? "Processing..." : "Close Account"}
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => router.push("/fixed-deposits")}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Balance Summary */}
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

                {/* Maturity Info */}
                {account.maturityDate && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                          <Calendar className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maturity Date</p>
                          <p className="text-lg font-bold text-foreground">{formatDate(account.maturityDate)}</p>
                          {account.isPremature && (
                            <p className="text-xs text-orange-600 font-medium mt-1">Not yet matured</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Credit Account Selection (for Transfer) */}
                {closureAllowed && voucherType === "TRANSFER" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                          <PiggyBank className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Credit Account</CardTitle>
                          <CardDescription className="text-xs">
                            Select savings account(s) to credit payout
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {creditEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <PiggyBank className="h-6 w-6 text-muted-foreground/40" />
                          <p className="mt-2 text-xs text-muted-foreground">No active savings accounts found for this member.</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {creditEntries.map((entry) => (
                              <div
                                key={entry.accountNumber}
                                className={`rounded-lg border p-3 transition-colors ${
                                  entry.selected
                                    ? "border-teal-300 bg-teal-50/50 dark:border-teal-700 dark:bg-teal-950/30"
                                    : "border-border"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={entry.selected}
                                    onCheckedChange={(checked) =>
                                      toggleCreditEntry(entry.accountNumber, checked === true)
                                    }
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-mono font-medium truncate">{entry.accountNumber}</p>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">{entry.schemeName}</p>
                                    <div className="mt-1 flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground">Balance:</span>
                                      <span className="text-xs font-semibold text-teal-600">
                                        {formatCurrency(entry.availableBalance)}
                                      </span>
                                    </div>
                                    {entry.selected && (
                                      <div className="mt-2">
                                        <Label className="text-[10px] text-muted-foreground">Credit Amount</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="0.00"
                                          value={entry.creditAmount}
                                          onChange={(e) =>
                                            updateCreditAmount(entry.accountNumber, e.target.value)
                                          }
                                          className="mt-1 h-8 text-sm"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Total Credit */}
                          <div className="border-t border-border pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">Total Credit</span>
                              <span
                                className={`text-base font-bold ${
                                  creditMatchesPayout
                                    ? "text-teal-600"
                                    : totalCredit > 0
                                      ? "text-red-600"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {formatCurrency(totalCredit)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Payout Amount</span>
                              <span className="text-xs font-semibold">{formatCurrency(effectivePayout)}</span>
                            </div>
                            {totalCredit > 0 && !creditMatchesPayout && (
                              <p className="mt-2 flex items-center gap-1 text-[10px] text-red-500">
                                <AlertCircle className="h-3 w-3" />
                                Total credit must equal payout amount
                              </p>
                            )}
                            {creditMatchesPayout && totalCredit > 0 && (
                              <p className="mt-2 flex items-center gap-1 text-[10px] text-teal-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Credit and payout amounts match
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Account Closure
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>Are you sure you want to close this deposit account? This action cannot be undone.</p>
                      <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Account:</span>
                          <span className="font-mono font-medium">{account?.accountNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Member:</span>
                          <span className="font-medium">{account?.memberName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Balance:</span>
                          <span className="font-semibold">{formatCurrency(account?.balance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Interest Earned:</span>
                          <span className="font-semibold">{formatCurrency(account?.interestdueforpayment)}</span>
                        </div>
                        {effectivePenalty > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Penalty:</span>
                            <span className="font-semibold text-red-600">- {formatCurrency(effectivePenalty)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm border-t border-border pt-2">
                          <span className="font-medium">Net Payout:</span>
                          <span className="font-bold text-teal-700">{formatCurrency(effectivePayout)}</span>
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSubmit}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Confirm Closure
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Account Closed Successfully!
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-base">
                      <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
                        {successMessage.split("\n").map((line, i) => (
                          <p key={i} className="text-sm text-teal-800">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:justify-end">
                  <AlertDialogAction
                    onClick={() => {
                      setSuccessOpen(false)
                      router.push("/fixed-deposits")
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Go to Fixed Deposits
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}

export default function DepositClosurePage() {
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
      <DepositClosureContent />
    </Suspense>
  )
}
