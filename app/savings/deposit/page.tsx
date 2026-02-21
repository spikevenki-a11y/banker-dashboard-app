"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  User,
  CreditCard,
  Banknote,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Users,
  X,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type AccountInfo = {
  account_number: string
  membership_no: string
  scheme_name: string
  interest_rate: number
  available_balance: number
  clear_balance: number
  account_status: string
  opening_date: string
  full_name: string
  father_name: string
  mobile_no: string
  member_type: string
  customer_code: string
  min_balance: number
  minimum_deposit: number
  maximum_deposit: number
}

type Transaction = {
  id: string
  transaction_type: string
  voucher_type: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  narration: string
  voucher_no: number
  gl_batch_id: number
  batch_status: string
  created_by: string
  transaction_date: string
}

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function DepositPage() {
  const router = useRouter()

  // Account lookup
  const [accountNumber, setAccountNumber] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [searchError, setSearchError] = useState("")

  // Transaction form
  const [amount, setAmount] = useState("")
  const [narration, setNarration] = useState("")
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])

  // Transaction history
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingTxns, setIsLoadingTxns] = useState(false)

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")

  // Account search popup state
  type SearchResult = {
    account_number: string
    available_balance: number
    account_status: string
    opening_date: string
    scheme_name: string
    membership_no: number
    full_name: string
    father_name: string
    mobile_no: string
    aadhaar_no: string
  }
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchMemberNo, setSearchMemberNo] = useState("")
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [searchContact, setSearchContact] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)

  const fetchTransactions = async (accNo: string) => {
    setIsLoadingTxns(true)
    try {
      const res = await fetch(`/api/savings/transactions?account=${encodeURIComponent(accNo)}&limit=10`, {
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) setTransactions(data.transactions || [])
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

  const handleAccountSearch = async () => {
    if (!accountNumber.trim()) return

    setIsSearching(true)
    setSearchError("")
    setAccountInfo(null)
    setTransactions([])

    try {
      const res = await fetch(`/api/savings/account-details?account_number=${encodeURIComponent(accountNumber.trim())}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok && data.account) {
        setAccountInfo(data.account)
        fetchTransactions(data.account.account_number)
      } else {
        setSearchError(data.error || "Account not found.")
      }
    } catch {
      setSearchError("Failed to search account. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  // Auto-load account on blur
  const handleAccountBlur = () => {
    if (accountNumber.trim() && !accountInfo && !isSearching) {
      handleAccountSearch()
    }
  }

  // Popup advanced search
  const handlePopupSearch = async () => {
    if (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchAadhaar.trim() && !searchContact.trim()) return

    setIsPopupSearching(true)
    setSearchResults([])

    try {
      const res = await fetch("/api/savings/account-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberNumber: searchMemberNo.trim(),
          memberName: searchMemberName.trim(),
          fatherName: searchFatherName.trim(),
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

  const handleSelectAccount = (result: SearchResult) => {
    setAccountNumber(result.account_number)
    setSearchDialogOpen(false)
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchAadhaar("")
    setSearchContact("")
    setSearchResults([])
    // Trigger account load
    setIsSearching(true)
    setSearchError("")
    setAccountInfo(null)
    setTransactions([])
    fetch(`/api/savings/account-details?account_number=${encodeURIComponent(result.account_number)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.account) {
          setAccountInfo(data.account)
          fetchTransactions(data.account.account_number)
        } else {
          setSearchError(data.error || "Account not found.")
        }
      })
      .catch(() => setSearchError("Failed to load account."))
      .finally(() => setIsSearching(false))
  }

  const handleSubmit = async () => {
    if (!accountInfo) return

    if (!voucherType) {
      setFormError("Please select a voucher type.")
      return
    }

    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setFormError("Enter a valid positive amount.")
      return
    }

    if (accountInfo.minimum_deposit && amt < Number(accountInfo.minimum_deposit)) {
      setFormError(`Minimum deposit amount is ${formatCurrency(accountInfo.minimum_deposit)}`)
      return
    }

    if (accountInfo.maximum_deposit && Number(accountInfo.maximum_deposit) > 0 && amt > Number(accountInfo.maximum_deposit)) {
      setFormError(`Maximum deposit amount is ${formatCurrency(accountInfo.maximum_deposit)}`)
      return
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/savings/transactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: accountInfo.account_number,
          transactionType: "DEPOSIT",
          amount: amt,
          narration: narration || "Savings Deposit",
          voucherType,
          selectedBatch,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Update local balance
      setAccountInfo({
        ...accountInfo,
        available_balance: data.newBalance,
        clear_balance: data.newBalance,
      })

      setSuccessMessage(data.message)
      setSuccessOpen(true)

      // Reset form
      setAmount("")
      setNarration("")
      setVoucherType("")
      setSelectedBatch(0)

      // Refresh transactions
      fetchTransactions(accountInfo.account_number)
    } catch (e: any) {
      setFormError(e.message || "Deposit failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setAccountNumber("")
    setAccountInfo(null)
    setSearchError("")
    setAmount("")
    setNarration("")
    setVoucherType("")
    setSelectedBatch(0)
    setFormError("")
    setTransactions([])
  }

  const isActive = accountInfo?.account_status?.toUpperCase() === "ACTIVE"

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/savings")}
                className="h-10 w-10 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Savings Deposit</h1>
                <p className="text-muted-foreground">Deposit funds into a savings account</p>
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
                        <CardDescription>Search for the savings account by account number</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="account-no">Account Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="account-no"
                          placeholder="Enter savings account number"
                          value={accountNumber}
                          onChange={(e) => {
                            setAccountNumber(e.target.value)
                            if (accountInfo) {
                              setAccountInfo(null)
                              setSearchError("")
                            }
                          }}
                          onBlur={handleAccountBlur}
                          onKeyDown={(e) => e.key === "Enter" && handleAccountSearch()}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setSearchDialogOpen(true)}
                          className="gap-2 bg-transparent"
                        >
                          <Search className="h-4 w-4" />
                          Search
                        </Button>
                      </div>
                      {isSearching && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading account details...
                        </div>
                      )}
                      {searchError && <p className="text-sm text-red-500">{searchError}</p>}
                    </div>

                    {accountInfo && (
                      <div className={`rounded-lg border p-4 ${isActive ? "border-teal-200 bg-teal-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle2 className={`h-5 w-5 ${isActive ? "text-teal-600" : "text-amber-600"}`} />
                          <span className={`font-medium ${isActive ? "text-teal-700" : "text-amber-700"}`}>Account Found</span>
                          <Badge variant="outline" className={`ml-auto ${isActive ? "border-teal-300 text-teal-700" : "border-amber-300 text-amber-700"}`}>
                            {accountInfo.account_status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Account Holder</p>
                            <p className="text-sm font-medium">{accountInfo.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Membership No</p>
                            <p className="text-sm font-mono font-medium">{accountInfo.membership_no}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Scheme</p>
                            <p className="text-sm font-medium">{accountInfo.scheme_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Available Balance</p>
                            <p className="text-sm font-semibold text-teal-600">{formatCurrency(accountInfo.available_balance)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Mobile</p>
                            <p className="text-sm font-medium">{accountInfo.mobile_no || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Member Type</p>
                            <p className="text-sm font-medium">{accountInfo.member_type || "---"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Deposit Details */}
                <Card className={!accountInfo || !isActive ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-lg">Deposit Details</CardTitle>
                        <CardDescription>Enter the deposit amount and transaction details</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isActive && accountInfo && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        Transactions are only allowed on active accounts. Current status: <strong>{accountInfo.account_status}</strong>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="voucher-type">Transaction Type *</Label>
                        <Select
                          value={voucherType || ""}
                          onValueChange={(value) => {
                            setVoucherType(value === "CASH" ? "CASH" : value === "TRANSFER" ? "TRANSFER" : "")
                            if (value !== "TRANSFER") {
                              setSelectedBatch(0)
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
                        <Label htmlFor="deposit-amount">Deposit Amount (INR) *</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter deposit amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        {accountInfo?.minimum_deposit ? (
                          <p className="text-xs text-muted-foreground">
                            Min: {formatCurrency(accountInfo.minimum_deposit)}
                            {accountInfo.maximum_deposit && Number(accountInfo.maximum_deposit) > 0
                              ? ` | Max: ${formatCurrency(accountInfo.maximum_deposit)}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* GL Batch Selection - only for TRANSFER */}
                    {voucherType === "TRANSFER" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">GL Batch ID</Label>
                          <div className="flex gap-2">
                            <Input
                              id="gl-batch-id"
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
                      <Label htmlFor="txn-narration">Narration</Label>
                      <Textarea
                        id="txn-narration"
                        placeholder="e.g. Cash Deposit, Transfer from other account"
                        rows={2}
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                      />
                    </div>

                    {formError && <p className="text-sm text-red-500">{formError}</p>}
                  </CardContent>
                </Card>

                {/* Step 3: Recent Transactions */}
                {accountInfo && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                            3
                          </div>
                          <div>
                            <CardTitle className="text-lg">Recent Transactions</CardTitle>
                            <CardDescription>Last 10 transactions on this account</CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchTransactions(accountInfo.account_number)}
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
                          <p className="mt-2 text-sm text-muted-foreground">No transactions found.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Voucher</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>Narration</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transactions.map((txn) => (
                                <TableRow key={txn.id}>
                                  <TableCell className="whitespace-nowrap text-sm">{formatDate(txn.transaction_date)}</TableCell>
                                  <TableCell>
                                    <Badge className={txn.transaction_type === "DEPOSIT" ? "bg-teal-100 text-teal-700" : "bg-orange-100 text-orange-700"}>
                                      {txn.transaction_type === "DEPOSIT" ? <ArrowDownRight className="mr-1 h-3 w-3" /> : <ArrowUpRight className="mr-1 h-3 w-3" />}
                                      {txn.transaction_type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    <Badge variant="outline">{txn.voucher_type || "---"}</Badge>
                                    {txn.voucher_no ? <span className="ml-1 text-xs text-muted-foreground">#{txn.voucher_no}</span> : null}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{txn.gl_batch_id || "---"}</TableCell>
                                  <TableCell className="max-w-[150px] truncate text-sm">{txn.narration || "---"}</TableCell>
                                  <TableCell className="text-right font-semibold text-orange-600">
                                    {Number(txn.debit_amount) > 0 ? formatCurrency(txn.debit_amount) : "---"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-teal-600">
                                    {Number(txn.credit_amount) > 0 ? formatCurrency(txn.credit_amount) : "---"}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">{formatCurrency(txn.running_balance)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={
                                      txn.batch_status === "APPROVED" ? "border-teal-300 text-teal-700" :
                                      txn.batch_status === "REJECTED" ? "border-red-300 text-red-700" :
                                      "border-amber-300 text-amber-700"
                                    }>
                                      {txn.batch_status || txn.status || "---"}
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
                  <Button variant="outline" onClick={() => router.push("/savings")} className="bg-transparent">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!accountInfo || !isActive || !amount || isSubmitting}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="mr-2 h-4 w-4" />
                        Process Deposit
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Column - Summary Sidebar */}
              <div className="space-y-6">
                {/* Account Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Account Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {accountInfo ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Account Holder</p>
                          <p className="text-sm font-semibold">{accountInfo.full_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Account No</p>
                          <p className="text-sm font-mono font-semibold">{accountInfo.account_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge variant="outline" className={isActive ? "border-teal-300 text-teal-700" : "border-amber-300 text-amber-700"}>
                            {accountInfo.account_status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <Badge variant="outline">{accountInfo.member_type}</Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Search an account to see details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Scheme Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Scheme Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {accountInfo ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Scheme</p>
                          <p className="text-sm font-semibold">{accountInfo.scheme_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest Rate</p>
                          <p className="text-sm font-semibold text-teal-600">{accountInfo.interest_rate}% p.a.</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Min Balance</p>
                          <p className="text-sm font-semibold">
                            {accountInfo.min_balance ? formatCurrency(accountInfo.min_balance) : "---"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Opening Date</p>
                          <p className="text-sm font-semibold">{formatDate(accountInfo.opening_date)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select an account to see scheme</p>
                    )}
                  </CardContent>
                </Card>

                {/* Transaction Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Deposit Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Current Balance</p>
                        <p className="text-sm font-semibold">
                          {accountInfo ? formatCurrency(accountInfo.available_balance) : "---"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Deposit Amount</p>
                        <p className="text-sm font-semibold text-teal-600">
                          {amount ? formatCurrency(Number(amount)) : "₹0.00"}
                        </p>
                      </div>
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground">Balance After Deposit</p>
                        <p className="text-lg font-bold text-teal-600">
                          {accountInfo && amount
                            ? formatCurrency(Number(accountInfo.available_balance) + Number(amount || 0))
                            : "---"}
                        </p>
                      </div>
                    </div>
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
                    Search Savings Account
                  </DialogTitle>
                  <DialogDescription>
                    Search for a savings account using one or more criteria below
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dp-search-member-no" className="text-xs">Member Number</Label>
                    <Input id="dp-search-member-no" placeholder="Enter member number" value={searchMemberNo} onChange={(e) => setSearchMemberNo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dp-search-member-name" className="text-xs">Member Name</Label>
                    <Input id="dp-search-member-name" placeholder="Enter member name" value={searchMemberName} onChange={(e) => setSearchMemberName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dp-search-father-name" className="text-xs">Father{"'"}s Name</Label>
                    <Input id="dp-search-father-name" placeholder="Enter father's name" value={searchFatherName} onChange={(e) => setSearchFatherName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dp-search-aadhaar" className="text-xs">Aadhaar Number</Label>
                    <Input id="dp-search-aadhaar" placeholder="Enter Aadhaar number" value={searchAadhaar} onChange={(e) => setSearchAadhaar(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="dp-search-contact" className="text-xs">Contact No</Label>
                    <Input id="dp-search-contact" placeholder="Enter contact number" value={searchContact} onChange={(e) => setSearchContact(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => { setSearchMemberNo(""); setSearchMemberName(""); setSearchFatherName(""); setSearchAadhaar(""); setSearchContact(""); setSearchResults([]) }} className="gap-1.5 bg-transparent text-xs">
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                  <Button size="sm" onClick={handlePopupSearch} disabled={isPopupSearching || (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchAadhaar.trim() && !searchContact.trim())} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                    {isPopupSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </Button>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg min-h-0">
                  {isPopupSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching accounts...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Account No</TableHead>
                          <TableHead className="text-xs">Member Name</TableHead>
                          <TableHead className="text-xs">Member No</TableHead>
                          <TableHead className="text-xs">Scheme</TableHead>
                          <TableHead className="text-xs">Balance</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs w-20">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((result) => (
                          <TableRow key={result.account_number} className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20" onClick={() => handleSelectAccount(result)}>
                            <TableCell className="font-mono text-xs font-medium">{result.account_number}</TableCell>
                            <TableCell className="text-xs font-medium">{result.full_name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{result.membership_no}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{result.scheme_name}</TableCell>
                            <TableCell className="text-xs font-medium">{`\u20B9${Number(result.available_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${result.account_status?.toLowerCase() === "active" ? "bg-teal-100 text-teal-700" : result.account_status?.toLowerCase() === "closed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                {result.account_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={(e) => { e.stopPropagation(); handleSelectAccount(result) }}>
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CreditCard className="h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {searchMemberNo || searchMemberName || searchFatherName || searchAadhaar || searchContact
                          ? "No accounts found. Try different search criteria."
                          : "Enter search criteria and click Search to find accounts."}
                      </p>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Deposit Successful!
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-base">
                      <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
                        <p className="text-sm text-teal-700">{successMessage}</p>
                        {accountInfo && (
                          <p className="mt-2 text-sm text-teal-700">
                            Account: <span className="font-mono font-semibold">{accountInfo.account_number}</span> | 
                            Member: {accountInfo.full_name}
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
                    Continue Depositing
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => router.push("/savings")}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Go to Savings
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
