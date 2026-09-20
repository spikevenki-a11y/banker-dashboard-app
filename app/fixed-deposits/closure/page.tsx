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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Loader2, CheckCircle2, AlertTriangle, IndianRupee,
  Calendar, TrendingUp, Landmark, PiggyBank, AlertCircle, XCircle, ShieldAlert,
  User, Eye, MapPin, ShieldCheck, TrendingDown, Camera, PenTool, Search,
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

type MemberProfile = {
  membership_no: string
  membership_class: string
  member_type: string
  status: string
  join_date: string
  ledger_folio_number: string
  board_resolution_number: string
  customer_code: string
  full_name: string
  father_name: string
  gender: string
  date_of_birth: string
  customer_type: string
  spouse_name: string
  marital_status: string
  occupation: string
  mobile_no: string
  customer_email: string
  house_no: string
  street: string
  village: string
  thaluk: string
  district: string
  state: string
  pincode: string
  address_phone: string
  aadhaar_no: string
  pan_no: string
  ration_no: string
  driving_license_no: string
}

type AccountAsset = {
  account_type: string
  account_number: string
  scheme_name: string
  balance: number
  status: string
  opening_date: string
  interest_rate: number
  close_date?: string
  extra: any
}

type LoanAccount = {
  loan_application_id: number
  scheme_name: string
  loan_type: string
  sanctioned_amount: number
  interest_rate: number
  loan_tenure_months: number
  emi_amount: number
  sanction_date: string
  outstanding_balance: number
  paid_installments: number
  total_installments: number
  overdue_installments: number
  application_status: string
  loan_account_no: string
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

  // Member number account lookup (Select Account step)
  const [membershipNoInput, setMembershipNoInput] = useState("")
  const [isMemberSearching, setIsMemberSearching] = useState(false)
  const [memberSearchError, setMemberSearchError] = useState("")
  const [memberAccounts, setMemberAccounts] = useState<MemberDepositAccount[]>([])
  const [selectedMemberAccount, setSelectedMemberAccount] = useState("")

  // Member summary
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)

  // View member profile modal
  const [viewMemberOpen, setViewMemberOpen] = useState(false)
  const [viewMemberTab, setViewMemberTab] = useState("personal")
  const [viewMemberProfile, setViewMemberProfile] = useState<MemberProfile | null>(null)
  const [viewMemberAssets, setViewMemberAssets] = useState<AccountAsset[]>([])
  const [viewMemberSummary, setViewMemberSummary] = useState<any>(null)
  const [viewMemberLoans, setViewMemberLoans] = useState<LoanAccount[]>([])
  const [viewMemberLoading, setViewMemberLoading] = useState(false)
  const [viewMemberError, setViewMemberError] = useState("")

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
    setNarration("")
    setPenaltyOverride("")
    setFormError("")
  }

  const fmt = (n: number) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

  const handleViewMember = async () => {
    if (!memberInfo) return
    setViewMemberOpen(true)
    setViewMemberTab("personal")
    setViewMemberLoading(true)
    setViewMemberError("")
    setViewMemberProfile(null)
    setViewMemberAssets([])
    setViewMemberSummary(null)
    setViewMemberLoans([])

    try {
      const no = memberInfo.membership_no
      const [profileRes, accountsRes, loansRes] = await Promise.all([
        fetch(`/api/members/profile?membership_no=${no}`, { credentials: "include" }),
        fetch(`/api/members/accounts?membership_no=${no}`, { credentials: "include" }),
        fetch(`/api/loans/accounts?membershipNo=${no}`, { credentials: "include" }),
      ])
      const [profileData, accountsData, loansData] = await Promise.all([
        profileRes.json(),
        accountsRes.json(),
        loansRes.json(),
      ])
      if (profileData.found) setViewMemberProfile(profileData.profile)
      if (accountsData.success) {
        setViewMemberAssets(accountsData.assets || [])
        setViewMemberSummary(accountsData.summary)
      }
      if (loansData.accounts) setViewMemberLoans(loansData.accounts)
    } catch {
      setViewMemberError("Failed to load member details. Please try again.")
    } finally {
      setViewMemberLoading(false)
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
          interestdueforpayment : account.interestdueforpayment,
          cccc : account.interestdueforpayment,
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
                {/* Member Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">Member Summary</CardTitle>
                      </div>
                      {memberInfo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleViewMember}
                          className="h-7 gap-1.5 text-xs bg-transparent"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Member Details
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {memberInfo ? (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Name</p>
                            <p className="text-sm font-semibold">{memberInfo.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Membership No</p>
                            <p className="text-sm font-mono font-semibold">{memberInfo.membership_no}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <Badge variant="outline">{memberInfo.member_type}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Father's Name</p>
                            <p className="text-sm font-semibold">{memberInfo.father_name || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Aadhaar Number</p>
                            <p className="text-sm font-mono font-semibold">{memberInfo.aadhaar_no || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone Number</p>
                            <p className="text-sm font-semibold">{memberInfo.mobile_no || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Ledger Number</p>
                            <p className="text-sm font-mono font-semibold">{memberInfo.ledger_folio_number || "---"}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-4 sm:flex-col sm:items-end">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
                              <Camera className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">Photo</span>
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
                              <PenTool className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">Signature</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Member details unavailable</p>
                    )}
                  </CardContent>
                </Card>

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

            {/* Member Profile Modal */}
            <Dialog open={viewMemberOpen} onOpenChange={setViewMemberOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                {/* Fixed header */}
                <div className="px-6 pt-6 pb-4 border-b shrink-0">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-teal-700 text-lg">
                      <User className="h-5 w-5" />
                      Member Profile
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {memberInfo?.membership_no}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm">{memberInfo?.full_name}</span>
                        <Badge
                          variant="outline"
                          className={
                            memberInfo?.status === "ACTIVE"
                              ? "border-green-300 bg-green-50 text-green-700"
                              : "border-red-300 bg-red-50 text-red-700"
                          }
                        >
                          {memberInfo?.status}
                        </Badge>
                        {memberInfo?.member_type && (
                          <Badge variant="outline" className="border-teal-300 text-teal-700">
                            {memberInfo.member_type}
                          </Badge>
                        )}
                        {memberInfo?.membership_class && (
                          <Badge variant="secondary">{memberInfo.membership_class}</Badge>
                        )}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Loading / error */}
                {viewMemberLoading && (
                  <div className="flex flex-1 items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
                    <span className="ml-3 text-sm text-muted-foreground">Loading member details…</span>
                  </div>
                )}
                {viewMemberError && !viewMemberLoading && (
                  <div className="flex flex-1 items-center justify-center py-16">
                    <p className="text-sm text-red-500">{viewMemberError}</p>
                  </div>
                )}

                {/* Tabbed content */}
                {!viewMemberLoading && !viewMemberError && (
                  <Tabs value={viewMemberTab} onValueChange={setViewMemberTab} className="flex flex-col flex-1 min-h-0">
                    <TabsList className="mx-6 mt-3 shrink-0 grid grid-cols-4 w-auto">
                      <TabsTrigger value="personal" className="gap-1.5 text-xs">
                        <User className="h-3.5 w-3.5" />Personal
                      </TabsTrigger>
                      <TabsTrigger value="address" className="gap-1.5 text-xs">
                        <MapPin className="h-3.5 w-3.5" />Address & KYC
                      </TabsTrigger>
                      <TabsTrigger value="assets" className="gap-1.5 text-xs">
                        <TrendingUp className="h-3.5 w-3.5" />Assets
                      </TabsTrigger>
                      <TabsTrigger value="liabilities" className="gap-1.5 text-xs">
                        <TrendingDown className="h-3.5 w-3.5" />Liabilities
                      </TabsTrigger>
                    </TabsList>

                    {/* ── Personal ─────────────────────────────────────── */}
                    <TabsContent value="personal" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                      {viewMemberProfile ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Personal Information</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Full Name",       viewMemberProfile.full_name],
                                ["Father Name",     viewMemberProfile.father_name || "---"],
                                ["Date of Birth",   viewMemberProfile.date_of_birth || "---"],
                                ["Gender",          viewMemberProfile.gender ? viewMemberProfile.gender.charAt(0).toUpperCase() + viewMemberProfile.gender.slice(1) : "---"],
                                ["Mobile",          viewMemberProfile.mobile_no || "---"],
                                ["Email",           viewMemberProfile.customer_email || "---"],
                                ["Marital Status",  viewMemberProfile.marital_status || "---"],
                                ["Spouse Name",     viewMemberProfile.spouse_name || "---"],
                                ["Occupation",      viewMemberProfile.occupation || "---"],
                                ["Customer Type",   viewMemberProfile.customer_type || "---"],
                                ["Customer Code",   viewMemberProfile.customer_code?.trim() || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium break-all">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Membership Information</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Membership No",          viewMemberProfile.membership_no],
                                ["Member Type",            viewMemberProfile.member_type || "---"],
                                ["Membership Class",       viewMemberProfile.membership_class || "---"],
                                ["Status",                 viewMemberProfile.status || "---"],
                                ["Join Date",              viewMemberProfile.join_date || "---"],
                                ["Ledger Folio No",        viewMemberProfile.ledger_folio_number || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No personal data available.</p>
                      )}
                    </TabsContent>

                    {/* ── Address & KYC ────────────────────────────────── */}
                    <TabsContent value="address" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                      {viewMemberProfile ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Current Address</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["House No",    viewMemberProfile.house_no || "---"],
                                ["Street",      viewMemberProfile.street || "---"],
                                ["Village",     viewMemberProfile.village || "---"],
                                ["Taluk",       viewMemberProfile.thaluk || "---"],
                                ["District",    viewMemberProfile.district || "---"],
                                ["State",       viewMemberProfile.state || "---"],
                                ["Pincode",     viewMemberProfile.pincode || "---"],
                                ["Phone",       viewMemberProfile.address_phone || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              <ShieldCheck className="inline h-3.5 w-3.5 mr-1" />KYC Documents
                            </p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Aadhaar No",         viewMemberProfile.aadhaar_no || "---"],
                                ["PAN No",             viewMemberProfile.pan_no || "---"],
                                ["Ration No",          viewMemberProfile.ration_no || "---"],
                                ["Driving License",    viewMemberProfile.driving_license_no || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium font-mono">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No address data available.</p>
                      )}
                    </TabsContent>

                    {/* ── Assets ───────────────────────────────────────── */}
                    <TabsContent value="assets" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {viewMemberSummary && (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Total Assets",      value: fmt(viewMemberSummary.total_assets),      color: "text-teal-700 bg-teal-50 border-teal-200" },
                            { label: "Total Accounts",    value: String(viewMemberAssets.length),          color: "text-blue-700 bg-blue-50 border-blue-200" },
                            { label: "Net Worth",         value: fmt(viewMemberSummary.net_worth),         color: "text-green-700 bg-green-50 border-green-200" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                              <p className="text-xs opacity-70">{label}</p>
                              <p className="text-base font-bold mt-0.5">{value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {viewMemberAssets.length > 0 ? (
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Account No</TableHead>
                                <TableHead className="text-xs">Scheme</TableHead>
                                <TableHead className="text-xs">Rate</TableHead>
                                <TableHead className="text-xs text-right">Balance</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewMemberAssets.map((a, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-xs">
                                    <Badge variant="secondary" className="text-xs font-normal">{a.account_type}</Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{a.account_number}</TableCell>
                                  <TableCell className="text-xs">{a.scheme_name}</TableCell>
                                  <TableCell className="text-xs">{a.interest_rate ? `${a.interest_rate}%` : "---"}</TableCell>
                                  <TableCell className="text-xs text-right font-semibold">{fmt(a.balance)}</TableCell>
                                  <TableCell className="text-xs">
                                    <span className={`font-medium ${a.status === "ACTIVE" ? "text-green-600" : "text-muted-foreground"}`}>
                                      {a.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                          <TrendingUp className="h-8 w-8 opacity-20 mb-2" />
                          <p className="text-sm">No assets found for this member.</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* ── Liabilities ──────────────────────────────────── */}
                    <TabsContent value="liabilities" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {viewMemberLoans.length > 0 ? (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            {(() => {
                              const activeLoans = viewMemberLoans.filter(l => l.application_status === "ACTIVE")
                              const totalOutstanding = viewMemberLoans.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0)
                              const totalOverdue = viewMemberLoans.reduce((s, l) => s + Number(l.overdue_installments || 0), 0)
                              return [
                                { label: "Active Loans",       value: String(activeLoans.length),  color: "text-orange-700 bg-orange-50 border-orange-200" },
                                { label: "Total Outstanding",  value: fmt(totalOutstanding),        color: "text-red-700 bg-red-50 border-red-200" },
                                { label: "Overdue EMIs",       value: String(totalOverdue),         color: totalOverdue > 0 ? "text-red-700 bg-red-50 border-red-200" : "text-green-700 bg-green-50 border-green-200" },
                              ].map(({ label, value, color }) => (
                                <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                                  <p className="text-xs opacity-70">{label}</p>
                                  <p className="text-base font-bold mt-0.5">{value}</p>
                                </div>
                              ))
                            })()}
                          </div>

                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-xs">Loan Scheme</TableHead>
                                  <TableHead className="text-xs text-right">Sanctioned</TableHead>
                                  <TableHead className="text-xs text-right">Outstanding</TableHead>
                                  <TableHead className="text-xs text-right">EMI</TableHead>
                                  <TableHead className="text-xs">EMIs Paid</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {viewMemberLoans.map((loan, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="text-xs">
                                      <p className="font-medium">{loan.scheme_name}</p>
                                      {loan.sanction_date && <p className="text-muted-foreground text-xs">{loan.sanction_date}</p>}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">{fmt(loan.sanctioned_amount)}</TableCell>
                                    <TableCell className="text-xs text-right font-semibold text-red-600">{fmt(loan.outstanding_balance)}</TableCell>
                                    <TableCell className="text-xs text-right">{fmt(loan.emi_amount)}</TableCell>
                                    <TableCell className="text-xs">
                                      {loan.paid_installments}/{loan.total_installments}
                                      {Number(loan.overdue_installments) > 0 && (
                                        <span className="ml-1 text-red-500">({loan.overdue_installments} overdue)</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <span className={`font-medium ${loan.application_status === "ACTIVE" ? "text-green-600" : loan.application_status === "OVERDUE" ? "text-red-600" : "text-muted-foreground"}`}>
                                        {loan.application_status}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                          <TrendingDown className="h-8 w-8 opacity-20 mb-2" />
                          <p className="text-sm">No loan accounts found for this member.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* Footer */}
                {!viewMemberLoading && (
                  <div className="px-6 py-3 border-t shrink-0 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setViewMemberOpen(false)} className="bg-transparent">
                      Close
                    </Button>
                  </div>
                )}
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
                          <span className="text-muted-foreground">Current Balance:</span>
                          <span className="font-semibold">{formatCurrency(account?.balance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Interest Earned:</span>
                          <span className="font-semibold">{formatCurrency(account?.interestdueforpayment)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Interest Already Paid:</span>
                          <span className="font-semibold">{formatCurrency(account?.interestPaid || 0)}</span>
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
