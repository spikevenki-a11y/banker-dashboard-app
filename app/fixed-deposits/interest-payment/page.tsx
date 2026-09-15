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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  User,
  CreditCard,
  Banknote,
  TrendingUp,
  History,
  Users,
  X,
  AlertCircle,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type DepositAccountInfo = {
  accountNumber: string
  depositType: string
  membershipNo: string
  memberName: string
  openDate: string
  interestRate: number
  balance: number
  accountStatus: number
  schemeName: string
  interestDue: number
  interestPaid: number
  depositAmount: number | null
  maturityDate: string | null
  maturityAmount: number | null
  installmentAmount: number | null
  installmentFrequency: string | null
  dailyAmount: number | null
  collectionFrequency: string | null
}

type MemberDepositAccount = {
  accountNumber: string
  depositType: string
  depositTypeLabel: string
  schemeName: string
  balance: number
  interestRate: number
}

type SavingsAccount = {
  account_number: string
  available_balance: number
  account_status: string
  scheme_name: string
}

type CreditEntry = {
  accountNumber: string
  selected: boolean
  creditAmount: string
  availableBalance: number
  schemeName: string
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
}

type SearchResult = {
  account_number: string
  deposit_type_label: string
  balance: number
  account_status: string
  opening_date: string
  scheme_name: string
  membership_no: string
  full_name: string
  father_name: string
  spouse_name: string
  mobile_no: string
  aadhaar_no: string
}

function formatCurrency(val: number | string | null | undefined) {
  if (val == null) return "--"
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | null | undefined) {
  if (!d) return "---"
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

function InterestPaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountFromParams = searchParams.get("account")

  // Account lookup
  const [accountNumber, setAccountNumber] = useState(accountFromParams || "")
  const [isSearching, setIsSearching] = useState(false)
  const [account, setAccount] = useState<DepositAccountInfo | null>(null)
  const [searchError, setSearchError] = useState("")

  // Membership number lookup
  const [membershipNo, setMembershipNo] = useState("")
  const [isMemberSearching, setIsMemberSearching] = useState(false)
  const [memberAccounts, setMemberAccounts] = useState<MemberDepositAccount[]>([])
  const [selectedMemberAccount, setSelectedMemberAccount] = useState("")
  const [memberSearchError, setMemberSearchError] = useState("")

  // Transaction form
  const [narration, setNarration] = useState("")
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])

  // Credit account (savings accounts to receive the interest payout)
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([])
  const [isLoadingSavings, setIsLoadingSavings] = useState(false)

  // Transaction history
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalTxns, setTotalTxns] = useState(0)
  const [isLoadingTxns, setIsLoadingTxns] = useState(false)

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")

  // Advanced search popup
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchAccountNumber, setSearchAccountNumber] = useState("")
  const [searchMemberNo, setSearchMemberNo] = useState("")
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchSpouseName, setSearchSpouseName] = useState("")
  const [searchLedgerFolio, setSearchLedgerFolio] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [searchContact, setSearchContact] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)
  const [searchResultsPage, setSearchResultsPage] = useState(1)
  const searchResultsPageSize = 10

  const fetchTransactions = async (acctNo: string) => {
    setIsLoadingTxns(true)
    try {
      const res = await fetch(`/api/deposits/interest-payment?account=${encodeURIComponent(acctNo)}&limit=10`, {
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) {
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

  const fetchSavingsAccounts = async (mNo: string) => {
    setIsLoadingSavings(true)
    try {
      const res = await fetch(`/api/savings/by-member?membership_no=${encodeURIComponent(mNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (data.success && data.accounts) {
        const activeAccounts = data.accounts.filter(
          (a: SavingsAccount) => a.account_status?.toUpperCase() === "ACTIVE"
        )
        setCreditEntries(
          activeAccounts.map((a: SavingsAccount) => ({
            accountNumber: a.account_number,
            selected: false,
            creditAmount: "",
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

  const loadAccount = async (acctNo: string) => {
    setIsSearching(true)
    setSearchError("")
    setAccount(null)
    setTransactions([])
    setCreditEntries([])
    try {
      const res = await fetch(`/api/deposits/interest-payment?account=${encodeURIComponent(acctNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok && data.account) {
        setAccount(data.account)
        setTransactions(data.transactions || [])
        setTotalTxns(data.total || 0)
        if (data.account.membershipNo) fetchSavingsAccounts(data.account.membershipNo)
      } else {
        setSearchError(data.error || "Deposit account not found.")
      }
    } catch {
      setSearchError("Failed to load deposit account. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  // Auto-load account when arriving with ?account=
  useEffect(() => {
    if (accountFromParams) {
      loadAccount(accountFromParams)
    }
  }, [accountFromParams])

  const handleMemberLookup = async () => {
    if (!membershipNo.trim()) return
    setIsMemberSearching(true)
    setMemberSearchError("")
    setMemberAccounts([])
    setSelectedMemberAccount("")
    setAccount(null)
    setAccountNumber("")
    setSearchError("")
    setTransactions([])
    try {
      const res = await fetch(`/api/deposits/by-member?membership_no=${encodeURIComponent(membershipNo.trim())}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMemberSearchError(data.error || "Lookup failed.")
        return
      }
      const accounts: MemberDepositAccount[] = data.deposits || []
      if (accounts.length === 0) {
        setMemberSearchError("No active deposit accounts found for this membership number.")
      } else if (accounts.length === 1) {
        setAccountNumber(accounts[0].accountNumber)
        loadAccount(accounts[0].accountNumber)
      } else {
        setMemberAccounts(accounts)
      }
    } catch {
      setMemberSearchError("Failed to lookup membership number. Please try again.")
    } finally {
      setIsMemberSearching(false)
    }
  }

  const handleMemberAccountSelect = (accNo: string) => {
    setSelectedMemberAccount(accNo)
    setAccountNumber(accNo)
    loadAccount(accNo)
  }

  // Advanced popup search
  const handlePopupSearch = async () => {
    if (!searchAccountNumber.trim() && !searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchSpouseName.trim() && !searchLedgerFolio.trim() && !searchAadhaar.trim() && !searchContact.trim()) return

    setIsPopupSearching(true)
    setSearchResults([])
    setSearchResultsPage(1)

    try {
      const res = await fetch("/api/deposits/account-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: searchAccountNumber.trim(),
          memberNumber: searchMemberNo.trim(),
          memberName: searchMemberName.trim(),
          fatherName: searchFatherName.trim(),
          spouseName: searchSpouseName.trim(),
          ledgerFolioNumber: searchLedgerFolio.trim(),
          aadhaarNumber: searchAadhaar.trim(),
          contactNo: searchContact.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSearchResults(data.results || [])
      }
    } catch {
      // silent
    } finally {
      setIsPopupSearching(false)
    }
  }

  const totalSearchResultPages = Math.max(1, Math.ceil(searchResults.length / searchResultsPageSize))
  const paginatedSearchResults = searchResults.slice(
    (searchResultsPage - 1) * searchResultsPageSize,
    searchResultsPage * searchResultsPageSize
  )

  const handleSelectSearchResult = (result: SearchResult) => {
    setAccountNumber(result.account_number)
    setMemberAccounts([])
    setSelectedMemberAccount("")
    setMemberSearchError("")
    setSearchDialogOpen(false)
    setSearchAccountNumber("")
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchSpouseName("")
    setSearchLedgerFolio("")
    setSearchAadhaar("")
    setSearchContact("")
    setSearchResults([])
    setSearchResultsPage(1)
    loadAccount(result.account_number)
  }

  // Credit entry helpers
  const toggleCreditEntry = (accNo: string, checked: boolean) => {
    setCreditEntries((prev) =>
      prev.map((e) => (e.accountNumber === accNo ? { ...e, selected: checked, creditAmount: checked ? e.creditAmount : "" } : e))
    )
  }

  const updateCreditAmount = (accNo: string, value: string) => {
    setCreditEntries((prev) => prev.map((e) => (e.accountNumber === accNo ? { ...e, creditAmount: value } : e)))
  }

  const interestDue = account?.interestDue || 0
  const totalCredit = creditEntries.reduce((sum, e) => (e.selected && e.creditAmount ? sum + (parseFloat(e.creditAmount) || 0) : sum), 0)
  const creditMatchesDue = Math.abs(totalCredit - interestDue) < 0.01

  const handleSubmit = async () => {
    if (!account) return

    if (!voucherType) {
      setFormError("Please select a voucher type.")
      return
    }

    if (interestDue <= 0) {
      setFormError("No interest is due for payment on this account.")
      return
    }

    const selectedCredits = creditEntries.filter((e) => e.selected && e.creditAmount)
    if (voucherType === "TRANSFER" && selectedCredits.length === 0) {
      setFormError("Please select at least one savings account and enter credit amount.")
      return
    }

    if (selectedCredits.length > 0) {
      const creditTotal = selectedCredits.reduce((s, e) => s + parseFloat(e.creditAmount), 0)
      if (Math.abs(creditTotal - interestDue) >= 0.01) {
        setFormError(`Total credit (${formatCurrency(creditTotal)}) must equal interest due (${formatCurrency(interestDue)}).`)
        return
      }
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/deposits/interest-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: account.accountNumber,
          amount: interestDue,
          narration: narration || "Interest Payment",
          voucherType,
          selectedBatch,
          creditAccounts: selectedCredits.map((e) => ({ accountNumber: e.accountNumber, amount: parseFloat(e.creditAmount) })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setAccount({ ...account, interestDue: data.newInterestDue, interestPaid: account.interestPaid + interestDue })
      setSuccessMessage(data.message)
      setSuccessOpen(true)

      // Reset form
      setNarration("")
      setVoucherType("")
      setSelectedBatch(0)
      setCreditEntries((prev) => prev.map((e) => ({ ...e, selected: false, creditAmount: "" })))

      fetchTransactions(account.accountNumber)
      if (account.membershipNo) fetchSavingsAccounts(account.membershipNo)
    } catch (e: any) {
      setFormError(e.message || "Interest payment failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setAccountNumber("")
    setAccount(null)
    setSearchError("")
    setMembershipNo("")
    setMemberAccounts([])
    setSelectedMemberAccount("")
    setMemberSearchError("")
    setNarration("")
    setVoucherType("")
    setSelectedBatch(0)
    setFormError("")
    setTransactions([])
    setCreditEntries([])
  }

  const isActive = account?.accountStatus === 1
  const typeLabel = account ? (depositTypeLabels[account.depositType] || account.depositType) : ""

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
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Deposit Interest Payment</h1>
                <p className="text-muted-foreground">Pay accrued interest due on a Fixed Deposit account</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Form */}
              <div className="space-y-6 lg:col-span-2">
                {/* Step 1: Account Lookup */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        1
                      </div>
                      <div>
                        <CardTitle className="text-lg">Account Information</CardTitle>
                        <CardDescription>Search by membership number to find the deposit account</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="membership-no">Membership Number</Label>
                      <div className="flex gap-2">
                        <Input
                          id="membership-no"
                          placeholder="Enter membership number"
                          value={membershipNo}
                          onChange={(e) => {
                            setMembershipNo(e.target.value)
                            if (memberAccounts.length > 0) {
                              setMemberAccounts([])
                              setSelectedMemberAccount("")
                            }
                            setMemberSearchError("")
                          }}
                          onBlur={() => { if (membershipNo.trim() && !isMemberSearching) handleMemberLookup() }}
                          onKeyDown={(e) => e.key === "Enter" && handleMemberLookup()}
                          className="flex-1"
                        />
                        <Button variant="outline" onClick={() => setSearchDialogOpen(true)} className="gap-2 bg-transparent">
                          <Search className="h-4 w-4" />
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
                      {searchError && <p className="text-sm text-red-500">{searchError}</p>}
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
                                  <span className="ml-2 text-muted-foreground">— {acc.depositTypeLabel} · {acc.schemeName}</span>
                                  <span className="ml-2 text-teal-600">{formatCurrency(acc.balance)}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2: Interest Payment Details */}
                <Card className={!account || !isActive ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-lg">Interest Payment Details</CardTitle>
                        <CardDescription>Review the interest due and complete the payment</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isActive && account && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Interest payments are only allowed on active accounts. Current status: <strong>{statusLabels[account.accountStatus] || "Unknown"}</strong>
                      </div>
                    )}

                    {account && isActive && interestDue <= 0 && (
                      <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                        No interest is currently due for payment on this account.
                      </div>
                    )}

                    {/* Available interest / already paid, distinctly called out */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Interest Already Paid</p>
                        <p className="mt-1 text-lg font-bold">{account ? formatCurrency(account.interestPaid) : "---"}</p>
                      </div>
                      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950/30">
                        <p className="text-xs text-teal-700 dark:text-teal-400">Available Interest for Payment</p>
                        <p className="mt-1 text-lg font-bold text-teal-700 dark:text-teal-400">{account ? formatCurrency(interestDue) : "---"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="voucher-type">Transaction Type *</Label>
                        <Select
                          value={voucherType || ""}
                          onValueChange={(value) => {
                            setVoucherType(value === "CASH" ? "CASH" : value === "TRANSFER" ? "TRANSFER" : "")
                            if (value !== "TRANSFER") setSelectedBatch(0)
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
                        <Label htmlFor="payment-amount">Interest Payment Amount (INR) *</Label>
                        <Input id="payment-amount" type="number" value={interestDue || ""} placeholder="0.00" disabled />
                        <p className="text-xs text-muted-foreground">Equal to the interest currently due for payment</p>
                      </div>
                    </div>

                    {/* GL Batch Selection - only for TRANSFER */}
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

                    {/* Credit Account selection - only for TRANSFER */}
                    {voucherType === "TRANSFER" && (
                      <div className="space-y-3 rounded-lg border border-border p-4">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="h-4 w-4 text-amber-600" />
                          <Label className="text-sm font-medium">Credit Account — select savings account(s) to receive the payout</Label>
                        </div>
                        {isLoadingSavings ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-xs text-muted-foreground">Loading savings accounts...</span>
                          </div>
                        ) : creditEntries.length === 0 ? (
                          <p className="py-2 text-xs text-muted-foreground">No active savings accounts found for this member.</p>
                        ) : (
                          <div className="space-y-2">
                            {creditEntries.map((entry) => (
                              <div
                                key={entry.accountNumber}
                                className={`rounded-lg border p-3 transition-colors ${
                                  entry.selected ? "border-teal-300 bg-teal-50/50 dark:border-teal-700 dark:bg-teal-950/30" : "border-border"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={entry.selected}
                                    onCheckedChange={(checked) => toggleCreditEntry(entry.accountNumber, checked === true)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-mono font-medium truncate">{entry.accountNumber}</p>
                                      <span className="text-xs font-semibold text-teal-600">{formatCurrency(entry.availableBalance)}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">{entry.schemeName}</p>
                                    {entry.selected && (
                                      <div className="mt-2">
                                        <Label className="text-[10px] text-muted-foreground">Credit Amount</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="0.00"
                                          value={entry.creditAmount}
                                          onChange={(e) => updateCreditAmount(entry.accountNumber, e.target.value)}
                                          className="mt-1 h-8 text-sm"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                              <span className="text-muted-foreground">Total Credit</span>
                              <span className={`font-semibold ${creditMatchesDue ? "text-teal-600" : totalCredit > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                                {formatCurrency(totalCredit)}
                              </span>
                            </div>
                            {totalCredit > 0 && !creditMatchesDue && (
                              <p className="flex items-center gap-1 text-[10px] text-red-500">
                                <AlertCircle className="h-3 w-3" />
                                Total credit must equal interest due
                              </p>
                            )}
                            {creditMatchesDue && totalCredit > 0 && (
                              <p className="flex items-center gap-1 text-[10px] text-teal-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Credit matches interest due
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="txn-narration">Narration</Label>
                      <Textarea
                        id="txn-narration"
                        placeholder="e.g. Interest Payment - Cash, Interest Payment - Transfer to savings"
                        rows={2}
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                      />
                    </div>

                    {formError && <p className="text-sm text-red-500">{formError}</p>}
                  </CardContent>
                </Card>

                {/* Step 3: Interest Payment History */}
                {account && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                            3
                          </div>
                          <div>
                            <CardTitle className="text-lg">Interest Payment History</CardTitle>
                            <CardDescription>{totalTxns} payment(s) found</CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchTransactions(account.accountNumber)}
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
                          <p className="mt-2 text-sm text-muted-foreground">No interest payments found for this account.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
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
                              {transactions.map((txn) => (
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
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleReset} className="bg-transparent">
                    Reset
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/fixed-deposits")} className="bg-transparent">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!account || !isActive || interestDue <= 0 || !voucherType || isSubmitting || (voucherType === "TRANSFER" && !creditMatchesDue)}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Banknote className="mr-2 h-4 w-4" />
                        Process Interest Payment
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Column - Summary Sidebar */}
              <div className="space-y-6">
                {/* Account Summary - Deposit/Account details */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Account Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {account ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Account Holder</p>
                          <p className="text-sm font-semibold">{account.memberName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Membership No</p>
                          <p className="text-sm font-mono font-semibold">{account.membershipNo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Account No</p>
                          <p className="text-sm font-mono font-semibold">{account.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge variant="outline" className={isActive ? "border-teal-300 text-teal-700" : "border-amber-300 text-amber-700"}>
                            {statusLabels[account.accountStatus] || "Unknown"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Deposit Type</p>
                          <Badge variant="outline">{typeLabel}</Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Search a deposit account to see details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Scheme / Deposit Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Deposit Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {account ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Scheme</p>
                          <p className="text-sm font-semibold">{account.schemeName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest Rate</p>
                          <p className="text-sm font-semibold text-teal-600">{account.interestRate}% p.a.</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {account.depositType === "RECURRING" ? "Installment" : "Deposit Amount"}
                          </p>
                          <p className="text-sm font-semibold">
                            {account.depositType === "RECURRING"
                              ? `${formatCurrency(account.installmentAmount)} / ${account.installmentFrequency || "Monthly"}`
                              : account.depositType === "PIGMY"
                                ? `${formatCurrency(account.dailyAmount)} / ${account.collectionFrequency || "Daily"}`
                                : formatCurrency(account.depositAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Opening Date</p>
                          <p className="text-sm font-semibold">{formatDate(account.openDate)}</p>
                        </div>
                        {account.maturityDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Maturity</p>
                            <p className="text-sm font-semibold">
                              {formatCurrency(account.maturityAmount)} on {formatDate(account.maturityDate)}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select an account to see deposit details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Interest Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Interest Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {account ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Interest Already Paid</p>
                          <p className="text-sm font-semibold">{formatCurrency(account.interestPaid)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Available Interest for Payment</p>
                          <p className="text-sm font-semibold text-teal-600">{formatCurrency(interestDue)}</p>
                        </div>
                        <div className="border-t pt-3">
                          <p className="text-xs text-muted-foreground">Interest Due After This Payment</p>
                          <p className="text-lg font-bold text-teal-600">
                            {voucherType ? formatCurrency(0) : formatCurrency(interestDue)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">---</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Account Search Dialog */}
            <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-600" />
                    Search Deposit Account
                  </DialogTitle>
                  <DialogDescription>
                    Search for a deposit account using one or more criteria below
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-search-account-no" className="text-xs">Account Number</Label>
                    <Input id="ip-search-account-no" placeholder="Enter account number" value={searchAccountNumber} onChange={(e) => setSearchAccountNumber(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-search-member-no" className="text-xs">Member Number</Label>
                    <Input id="ip-search-member-no" placeholder="Enter member number" value={searchMemberNo} onChange={(e) => setSearchMemberNo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-search-member-name" className="text-xs">Member Name</Label>
                    <Input id="ip-search-member-name" placeholder="Enter member name" value={searchMemberName} onChange={(e) => setSearchMemberName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-search-father-name" className="text-xs">Father{"'"}s Name</Label>
                    <Input id="ip-search-father-name" placeholder="Enter father's name" value={searchFatherName} onChange={(e) => setSearchFatherName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-search-spouse-name" className="text-xs">Spouse{"'"}s Name</Label>
                    <Input id="ip-search-spouse-name" placeholder="Enter spouse's name" value={searchSpouseName} onChange={(e) => setSearchSpouseName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-search-ledger-folio" className="text-xs">Ledger Folio Number</Label>
                    <Input id="ip-search-ledger-folio" placeholder="Enter ledger folio number" value={searchLedgerFolio} onChange={(e) => setSearchLedgerFolio(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ip-search-aadhaar" className="text-xs">Aadhaar Number</Label>
                    <Input id="ip-search-aadhaar" placeholder="Enter Aadhaar number" value={searchAadhaar} onChange={(e) => setSearchAadhaar(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="ip-search-contact" className="text-xs">Contact No</Label>
                    <Input id="ip-search-contact" placeholder="Enter contact number" value={searchContact} onChange={(e) => setSearchContact(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchAccountNumber("")
                      setSearchMemberNo("")
                      setSearchMemberName("")
                      setSearchFatherName("")
                      setSearchSpouseName("")
                      setSearchLedgerFolio("")
                      setSearchAadhaar("")
                      setSearchContact("")
                      setSearchResults([])
                      setSearchResultsPage(1)
                    }}
                    className="gap-1.5 bg-transparent text-xs"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePopupSearch}
                    disabled={isPopupSearching || (!searchAccountNumber.trim() && !searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchSpouseName.trim() && !searchLedgerFolio.trim() && !searchAadhaar.trim() && !searchContact.trim())}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isPopupSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </Button>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg min-h-0">
                  {isPopupSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching deposit accounts...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Account No</TableHead>
                          <TableHead className="text-xs">Member Name</TableHead>
                          <TableHead className="text-xs">Member No</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Scheme</TableHead>
                          <TableHead className="text-xs">Balance</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSearchResults.map((result) => (
                          <TableRow
                            key={result.account_number}
                            className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20"
                            onClick={() => handleSelectSearchResult(result)}
                          >
                            <TableCell className="font-mono text-xs font-medium">{result.account_number}</TableCell>
                            <TableCell className="text-xs font-medium">{result.full_name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{result.membership_no}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{result.deposit_type_label}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{result.scheme_name}</TableCell>
                            <TableCell className="text-xs font-medium">{formatCurrency(result.balance)}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${result.account_status === "Active" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
                                {result.account_status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CreditCard className="h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {searchAccountNumber || searchMemberNo || searchMemberName || searchFatherName || searchSpouseName || searchLedgerFolio || searchAadhaar || searchContact
                          ? "No accounts found. Try different search criteria."
                          : "Enter search criteria and click Search to find accounts."}
                      </p>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Showing {(searchResultsPage - 1) * searchResultsPageSize + 1}
                      {"–"}
                      {Math.min(searchResultsPage * searchResultsPageSize, searchResults.length)} of {searchResults.length}
                    </p>
                    {totalSearchResultPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => setSearchResultsPage((p) => Math.max(1, p - 1))}
                          disabled={searchResultsPage === 1}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        {Array.from({ length: totalSearchResultPages }, (_, i) => i + 1).map((pn) => (
                          <Button
                            key={pn}
                            variant={pn === searchResultsPage ? "default" : "outline"}
                            size="icon"
                            className={`h-7 w-7 text-xs ${pn === searchResultsPage ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-transparent"}`}
                            onClick={() => setSearchResultsPage(pn)}
                          >
                            {pn}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => setSearchResultsPage((p) => Math.min(totalSearchResultPages, p + 1))}
                          disabled={searchResultsPage === totalSearchResultPages}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Interest Payment Successful!
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-base">
                      <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
                        <p className="text-sm text-teal-700">{successMessage}</p>
                        {account && (
                          <p className="mt-2 text-sm text-teal-700">
                            Account: <span className="font-mono font-semibold">{account.accountNumber}</span> | Member: {account.memberName}
                          </p>
                        )}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:justify-end">
                  <AlertDialogAction
                    onClick={() => setSuccessOpen(false)}
                    className="bg-transparent border border-input hover:bg-accent text-foreground"
                  >
                    Continue
                  </AlertDialogAction>
                  <AlertDialogAction onClick={() => router.push("/fixed-deposits")} className="bg-teal-600 hover:bg-teal-700 text-white">
                    Go to Fixed Deposits
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}

export default function InterestPaymentPage() {
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
      <InterestPaymentContent />
    </Suspense>
  )
}
