"use client"

import { formatDate as formatDisplayDate } from "@/lib/date-format"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, IndianRupee, Calendar, TrendingUp, Landmark, PiggyBank, AlertCircle, XCircle, ShieldAlert, Search, Users, History } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { DepositAccountSearchDialog } from "../_components/deposit-account-search-dialog"
import { MemberSummaryCard } from "@/components/member-summary-card"
import { formatCurrency as formatINR, type Numeric } from "@/lib/number-format"

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
  /** Interest policy rule that stops premature closure (deposits opened under a policy) */
  prematureBlockedReason?: string | null
  interestPolicyName?: string | null
  interestdueforpayment : number
  interestPaidFromTransactions?: number
  interestPayoutCount?: number
}

type InterestTransaction = {
  id: string
  transaction_date: string
  voucher_type: string
  debit_amount: number
  narration: string
  voucher_no: number
  gl_batch_id: number
  batch_status: string | null
}

type SavingsAccount = {
  accountNumber: string
  availableBalance: number
  clearBalance: number
  schemeName: string
}

type MemberDepositAccount = {
  accountNumber: string
  depositType: string
  depositTypeLabel: string
  schemeName: string
  balance: number
  interestRate: number
  accountStatus: number
}

type CreditEntry = {
  accountNumber: string
  selected: boolean
  creditAmount: string
  availableBalance: number
  schemeName: string
}

type MemberInfo = {
  membership_no: string
  member_type: string
  membership_class: string
  status: string
  full_name: string
  father_name: string
  mobile_no: string
  date_of_birth: string
  aadhaar_no: string
  customer_code: string
  gender: string
  ledger_folio_number: string
}




const formatCurrency = (v: Numeric) => formatINR(v, { empty: "--" })

function formatDate(d: string | null | undefined) {
  if (!d) return "--"
  return formatDisplayDate(d)
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

  // Member number account lookup (Select Account step)
  const [membershipNoInput, setMembershipNoInput] = useState("")
  const [isMemberSearching, setIsMemberSearching] = useState(false)
  const [memberSearchError, setMemberSearchError] = useState("")
  const [memberAccounts, setMemberAccounts] = useState<MemberDepositAccount[]>([])
  const [selectedMemberAccount, setSelectedMemberAccount] = useState("")
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)

  // View interest transactions dialog
  const [interestTxnsOpen, setInterestTxnsOpen] = useState(false)
  const [interestTxns, setInterestTxns] = useState<InterestTransaction[]>([])
  const [interestTxnsTotal, setInterestTxnsTotal] = useState(0)
  const [isLoadingInterestTxns, setIsLoadingInterestTxns] = useState(false)
  const [interestTxnsError, setInterestTxnsError] = useState("")

  // Member summary
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)


  // Form state
  const [voucherType, setVoucherType] = useState<string>("")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])
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
        if (data.account?.membershipNo) {
          fetchMemberInfo(data.account.membershipNo)
        }
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }

  // Interest payout history (deposit_transactions, type INTEREST_PAYOUT) for the selected account
  const openInterestTransactions = async () => {
    if (!account) return
    setInterestTxnsOpen(true)
    setIsLoadingInterestTxns(true)
    setInterestTxnsError("")
    setInterestTxns([])
    setInterestTxnsTotal(0)
    try {
      const res = await fetch(
        `/api/deposits/interest-payment?account=${encodeURIComponent(account.accountNumber)}&limit=100`,
        { credentials: "include" }
      )
      const data = await res.json()
      if (!res.ok) {
        setInterestTxnsError(data.error || "Failed to load interest transactions.")
        return
      }
      setInterestTxns(data.transactions || [])
      setInterestTxnsTotal(data.total || 0)
    } catch {
      setInterestTxnsError("Failed to load interest transactions. Please try again.")
    } finally {
      setIsLoadingInterestTxns(false)
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

  const fetchMemberInfo = async (membershipNo: string) => {
    try {
      const res = await fetch("/api/savings/member-lookup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: membershipNo }),
      })
      const data = await res.json()
      if (res.ok && data.member) {
        setMemberInfo(data.member)
      }
    } catch {
      // silent
    }
  }

  const handleMemberLookup = async () => {
    if (!membershipNoInput.trim()) return
    setIsMemberSearching(true)
    setMemberSearchError("")
    setMemberAccounts([])
    setSelectedMemberAccount("")
    try {
      const res = await fetch(
        `/api/deposits/by-member?membership_no=${encodeURIComponent(membershipNoInput.trim())}&statuses=1,2`,
        { credentials: "include" }
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMemberSearchError(data.error || "Lookup failed.")
        return
      }
      const accounts: MemberDepositAccount[] = data.deposits || []
      if (accounts.length === 0) {
        setMemberSearchError("No active or matured deposit accounts found for this member number.")
      } else if (accounts.length === 1) {
        setSelectedMemberAccount(accounts[0].accountNumber)
        fetchClosureData(accounts[0].accountNumber)
      } else {
        setMemberAccounts(accounts)
      }
    } catch {
      setMemberSearchError("Failed to lookup member number. Please try again.")
    } finally {
      setIsMemberSearching(false)
    }
  }

  const handleMemberAccountSelect = (accNo: string) => {
    setSelectedMemberAccount(accNo)
    fetchClosureData(accNo)
  }

  const handleChangeAccount = () => {
    setAccount(null)
    setSavingsAccounts([])
    setCreditEntries([])
    setMemberInfo(null)
    setMembershipNoInput("")
    setMemberSearchError("")
    setMemberAccounts([])
    setSelectedMemberAccount("")
    setVoucherType("")
    setSelectedBatch(0)
    setNarration("")
    setPenaltyOverride("")
    setFormError("")
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

  // Confirmation summary: interest paid comes from the payout transactions when any exist,
  // otherwise from the account's recorded interest paid amount
  const confirmInterestDue = Number(account?.interestdueforpayment) || 0
  const confirmInterestPaid = account?.interestPayoutCount
    ? Number(account.interestPaidFromTransactions) || 0
    : Number(account?.interestPaid) || 0
  const confirmTotalInterestEarned = confirmInterestPaid + confirmInterestDue

  const canSubmit = account &&
    !account.prematureBlockedReason &&
    voucherType &&
    effectivePayout >= 0 &&
    (voucherType !== "DEFAULT_TRANSFER" || (creditEntries.some((e) => e.selected) && creditMatchesPayout)) &&
    !isSubmitting

  const handleConfirmClosure = () => {
    setFormError("")

    if (!voucherType) {
      setFormError("Please select a voucher type.")
      return
    }

    if (voucherType === "DEFAULT_TRANSFER") {
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
          interestdueforpayment : account.interestdueforpayment,
          cccc : account.interestdueforpayment,
          narration: narration || `Deposit Closure - A/c ${account.accountNumber}`,
          voucherType,
          selectedBatch: voucherType === "TRANSFER" ? selectedBatch : 0,
          creditAccounts: voucherType === "DEFAULT_TRANSFER" ? selectedCredits : [],
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
        <div className="">
          <div className="">
            <main className="flex-1 overflow-y-auto bg-background p-6">
              <div className="mb-6 flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push("/fixed-deposits")} className="h-10 w-10 bg-transparent">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Deposit Closure</h1>
                  <p className="text-muted-foreground">Find a deposit account by member number to begin closure</p>
                </div>
              </div>

              {accountParam && !membershipNoInput && memberAccounts.length === 0 && (
                <div className="mx-auto max-w-xl">
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Account not found. Search by member number below instead.
                  </div>
                </div>
              )}

              <div className="mx-auto max-w-xl">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        <Search className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Select Account</CardTitle>
                        <CardDescription>Enter the member number to find their deposit account</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="member-number">Member Number</Label>
                      <div className="flex gap-2">
                        <Input
                          id="member-number"
                          placeholder="Enter member number"
                          value={membershipNoInput}
                          onChange={(e) => {
                            setMembershipNoInput(e.target.value)
                            setMemberAccounts([])
                            setSelectedMemberAccount("")
                            setMemberSearchError("")
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleMemberLookup()}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          onClick={handleMemberLookup}
                          disabled={!membershipNoInput.trim() || isMemberSearching}
                          className="gap-2"
                        >
                          {isMemberSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          Search
                        </Button>
                        <Button variant="outline" onClick={() => setSearchDialogOpen(true)} className="gap-2 bg-transparent">
                          <Users className="h-4 w-4" />
                          Advanced Search
                        </Button>
                      </div>
                      {isMemberSearching && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Looking up deposit accounts...
                        </div>
                      )}
                      {memberSearchError && <p className="text-sm text-red-500">{memberSearchError}</p>}
                    </div>

                    {memberAccounts.length > 1 && (
                      <div className="space-y-1.5">
                        <Label htmlFor="member-account-select" className="text-xs text-muted-foreground">
                          {memberAccounts.length} deposit accounts found — select one to continue
                        </Label>
                        <Select value={selectedMemberAccount} onValueChange={handleMemberAccountSelect}>
                          <SelectTrigger id="member-account-select">
                            <SelectValue placeholder="Choose a deposit account..." />
                          </SelectTrigger>
                          <SelectContent>
                            {memberAccounts.map((acc) => (
                              <SelectItem key={acc.accountNumber} value={acc.accountNumber}>
                                <span className="font-mono">{acc.accountNumber}</span>
                                <span className="ml-2 text-muted-foreground">
                                  — {depositTypeLabels[acc.depositType] || acc.depositType} · {acc.schemeName}
                                  {" "}({statusLabels[acc.accountStatus] || "Unknown"})
                                </span>
                                <span className="ml-2 text-teal-600">{formatCurrency(acc.balance)}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Same Active/Matured scope as the member number lookup (statuses=1,2) */}
              <DepositAccountSearchDialog
                open={searchDialogOpen}
                onOpenChange={setSearchDialogOpen}
                idPrefix="closure-search"
                filterResult={(r) => r.account_status === "Active" || r.account_status === "Matured"}
                onSelect={(result) => {
                  setMembershipNoInput(result.membership_no)
                  setMemberAccounts([])
                  setMemberSearchError("")
                  setSelectedMemberAccount(result.account_number)
                  fetchClosureData(result.account_number)
                }}
              />
            </main>
          </div>
        </div>
      </DashboardWrapper>
    )
  }

  const typeLabel = depositTypeLabels[account.depositType] || account.depositType
  const isActive = account.accountStatus === 1
  const isMatured = account.accountStatus === 5
  const closureAllowed = isActive || isMatured

  return (
    <DashboardWrapper>
      <div className="">
        <div className="">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
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
              <Button variant="outline" size="sm" onClick={handleChangeAccount} className="gap-2 bg-transparent">
                <Search className="h-3.5 w-3.5" />
                Change Account
              </Button>
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
                      {/* <div>
                        <p className="text-xs text-muted-foreground">Member Name</p>
                        <p className="text-sm font-medium">{account.memberName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Membership No</p>
                        <p className="text-sm font-mono font-medium">{account.membershipNo}</p>
                      </div> */}
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
                        <span className="text-sm text-muted-foreground">Deposit amount</span>
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
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-sm text-muted-foreground">Interest Already Paid</span>
                        <span className="text-sm font-semibold">{formatCurrency(account.interestPaid || 0)}</span>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={openInterestTransactions}
                          className="gap-2 bg-transparent"
                        >
                          <History className="h-3.5 w-3.5" />
                          View Transactions
                        </Button>
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
                              {account.interestPolicyName ? ` · Interest policy: ${account.interestPolicyName}` : ""}
                            </p>
                            {account.prematureBlockedReason && (
                              <p className="mb-3 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700">
                                {account.prematureBlockedReason}
                              </p>
                            )}
                            <div className="flex items-center gap-3">
                              <Label htmlFor="penalty" className="text-xs text-orange-700 dark:text-orange-400 whitespace-nowrap">
                                Penalty Amount
                              </Label>
                              <Input
                                id="penalty"
                                type="amount"
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
                          <Select
                            value={voucherType}
                            onValueChange={(value) => {
                              setVoucherType(value)
                              if (value !== "TRANSFER") setSelectedBatch(0)
                            }}
                          >
                            <SelectTrigger id="voucher-type" className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASH">Cash</SelectItem>
                              <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                              <SelectItem value="DEFAULT_TRANSFER">Default Transfer</SelectItem>
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

                      {/* GL Batch Selection - only for Bank Transfer */}
                      {voucherType === "TRANSFER" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">GL Batch ID</Label>
                            <div className="flex gap-2">
                              <Input
                                value={selectedBatch && selectedBatch !== 0 ? selectedBatch : "New Batch"}
                                readOnly
                                placeholder="Select or create batch"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() => {
                                  fetchIncompleteBatches()
                                  setIsBatchPopupOpen(true)
                                }}
                              >
                                Select
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

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
                {/* Member Summary — shared card and View Member Details popup (bank's perspective) */}
                <MemberSummaryCard memberInfo={memberInfo} />

                {/* Balance Summary */}
                <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-800 dark:bg-teal-950/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900">
                        <IndianRupee className="h-6 w-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deposit amount</p>
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

                {/* Credit Account Selection (for Default Transfer) */}
                {closureAllowed && voucherType === "DEFAULT_TRANSFER" && (
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
                                          type="amount"
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


            {/* Interest Transactions Dialog */}
            <Dialog open={interestTxnsOpen} onOpenChange={setInterestTxnsOpen}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-teal-600" />
                    Interest Transactions
                  </DialogTitle>
                  <DialogDescription>
                    Interest payouts recorded for account {account.accountNumber}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Interest Already Paid</p>
                    <p className="mt-1 text-lg font-bold">{formatCurrency(account.interestPaid || 0)}</p>
                  </div>
                  <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950/30">
                    <p className="text-xs text-teal-700 dark:text-teal-400">Interest Due for Payment</p>
                    <p className="mt-1 text-lg font-bold text-teal-700 dark:text-teal-400">{formatCurrency(account.interestdueforpayment || 0)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Payout Status</p>
                    <div className="mt-1">
                      {Number(account.interestPaid) > 0 && Number(account.interestdueforpayment) > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700">Partially Paid</Badge>
                      ) : Number(account.interestPaid) > 0 ? (
                        <Badge className="bg-teal-100 text-teal-700">Fully Paid</Badge>
                      ) : (
                        <Badge variant="outline">Not Paid</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto rounded-lg border min-h-0">
                  {isLoadingInterestTxns ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading interest transactions...</span>
                    </div>
                  ) : interestTxnsError ? (
                    <p className="py-12 text-center text-sm text-red-500">{interestTxnsError}</p>
                  ) : interestTxns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <History className="h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">No interest payments have been made on this account.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Voucher</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount Paid</TableHead>
                          <TableHead>Narration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interestTxns.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell className="text-sm">{formatDate(txn.transaction_date)}</TableCell>
                            <TableCell className="font-mono text-xs">B{txn.gl_batch_id}/V{txn.voucher_no}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{txn.voucher_type || "CASH"}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-teal-600">{formatCurrency(txn.debit_amount)}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{txn.narration}</TableCell>
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
                  )}
                </div>

                {interestTxns.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {interestTxnsTotal > interestTxns.length
                        ? `Showing latest ${interestTxns.length} of ${interestTxnsTotal} payments`
                        : `${interestTxns.length} payment(s)`}
                    </span>
                    <span>
                      <span className="text-muted-foreground">Total shown: </span>
                      <span className="font-semibold text-teal-600">
                        {formatCurrency(interestTxns.reduce((sum, t) => sum + Number(t.debit_amount || 0), 0))}
                      </span>
                    </span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" className="bg-transparent" onClick={() => setInterestTxnsOpen(false)}>
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* GL Batch Selection Dialog */}
            <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Select Incomplete GL Batch</DialogTitle>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto">
                  {incompleteBatches.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No incomplete batches found. A new batch will be created.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch ID</TableHead>
                          <TableHead>Total Debit</TableHead>
                          <TableHead>Total Credit</TableHead>
                          <TableHead>Difference</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incompleteBatches.map((b) => (
                          <TableRow key={b.batch_id}>
                            <TableCell>{b.batch_id}</TableCell>
                            <TableCell>{formatCurrency(b.total_debit)}</TableCell>
                            <TableCell>{formatCurrency(b.total_credit)}</TableCell>
                            <TableCell className="text-red-600">{formatCurrency(b.difference)}</TableCell>
                            <TableCell className="text-right">
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => {
                      setSelectedBatch(0)
                      setIsBatchPopupOpen(false)
                    }}
                  >
                    New Batch
                  </Button>
                  <Button variant="outline" className="bg-transparent" onClick={() => setIsBatchPopupOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                      {/* <p>Are you sure you want to close this deposit account? This action cannot be undone.</p> */}
                      <p>Are you sure you want to close this deposit account? </p>
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
                          <span className="text-muted-foreground">Deposit Amount:</span>
                          <span className="font-semibold">{formatCurrency(account?.depositAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Maturity Amount:</span>
                          <span className="font-semibold">
                            {account?.maturityAmount ? formatCurrency(account.maturityAmount) : "--"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Interest Earned:</span>
                          <span className="font-semibold">{formatCurrency(confirmTotalInterestEarned)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total Interest Paid
                            {account?.interestPayoutCount ? ` (${account.interestPayoutCount} payout${account.interestPayoutCount > 1 ? "s" : ""})` : ""}:
                          </span>
                          <span className="font-semibold">{formatCurrency(confirmInterestPaid)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Penalty Amount:</span>
                          <span className={`font-semibold ${effectivePenalty > 0 ? "text-red-600" : ""}`}>
                            {effectivePenalty > 0 ? `- ${formatCurrency(effectivePenalty)}` : formatCurrency(0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Voucher Type:</span>
                          <span className="font-medium">
                            {voucherType === "CASH" ? "Cash" : voucherType === "TRANSFER" ? `Bank Transfer (${selectedBatch ? `Batch ${selectedBatch}` : "New Batch"})` : "Default Transfer"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border pt-2">
                          <span className="font-medium">Net Payout Amount:</span>
                          <span className="font-bold text-teal-700">{formatCurrency(effectivePayout)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">
                          Balance {formatCurrency(account?.balance)} + Unpaid Interest {formatCurrency(confirmInterestDue)}
                          {effectivePenalty > 0 ? ` − Penalty ${formatCurrency(effectivePenalty)}` : ""}
                        </p>
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
