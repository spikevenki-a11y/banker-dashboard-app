"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Eye,
  IndianRupee,
  Calendar,
  Percent,
  FileText,
  BadgeDollarSign,
  XCircle,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { SearchableSelect } from "@/components/ui/searchable-select"

// ─── Types ────────────────────────────────────────────────────────────────────

type InvestmentAccount = {
  id: string
  account_number: string
  investment_head: string
  branch_id: number
  description: string
  amount_invested: number
  ledger_balance: number
  date_of_investment: string
  rate_of_interest: number
  interest_receivable: number
  reference_number: string
  status: string
  created_by: string
  created_date: string
}

type InvestmentTransaction = {
  id: string
  branch_id: number
  transaction_date: string
  voucher_no: string
  batch_id: number
  transaction_type: string
  account_number: string
  debit_amount: number
  credit_amount: number
  interest_amount: number
  ledger_balance_amount: number
  status: string
  created_by: string
  created_date: string
}

type VoucherDetails = {
  transactionType: "open" | "credit" | "close"
  voucherNo: string | number
  batchId: string | number
  transactionDate: string
  voucherType: string
  ledgerName: string
  accountNumber: string
  // open
  amountInvested?: number
  // credit
  creditAmount?: number
  interestAmount?: number
  creditType?: string
  // close
  principalRedeemed?: number
  interestReceived?: number
  totalPayout?: number
  newBalance: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val: number | string) {
  return `₹${Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState("accounts")
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [ledgerAccounts, setLedgerAccounts] = useState<{ accountcode: number; accountname: string }[]>([])

  // Open investment form
  const [openLedger, setOpenLedger] = useState("")
  const [openDescription, setOpenDescription] = useState("")
  const [openAmount, setOpenAmount] = useState("")
  const [openDate, setOpenDate] = useState("")
  const [openRate, setOpenRate] = useState("")
  const [openReference, setOpenReference] = useState("")
  const [openVoucherType, setOpenVoucherType] = useState("CASH")

  // Credit transaction form
  const [creditLedger, setCreditLedger] = useState("")
  const [creditAccount, setCreditAccount] = useState("")
  const [creditType, setCreditType] = useState("INTEREST")
  const [creditAmount, setCreditAmount] = useState("")
  const [creditInterest, setCreditInterest] = useState("")
  const [creditDate, setCreditDate] = useState("")
  const [creditVoucher, setCreditVoucher] = useState("")
  const [creditVoucherType, setCreditVoucherType] = useState("CASH")
  const [selectedCreditAccount, setSelectedCreditAccount] = useState<InvestmentAccount | null>(null)

  // Close investment form
  const [closeLedger, setCloseLedger] = useState("")
  const [closeAccount, setCloseAccount] = useState("")
  const [closureAmount, setClosureAmount] = useState("")
  const [closureInterest, setClosureInterest] = useState("0")
  const [closeDate, setCloseDate] = useState("")
  const [closeVoucher, setCloseVoucher] = useState("")
  const [closeVoucherType, setCloseVoucherType] = useState("CASH")
  const [selectedCloseAccount, setSelectedCloseAccount] = useState<InvestmentAccount | null>(null)

  // Transaction history
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<InvestmentAccount | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [successOpen, setSuccessOpen] = useState(false)
  const [voucherDetails, setVoucherDetails] = useState<VoucherDetails | null>(null)

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (searchQuery) params.append("accountNumber", searchQuery)
      const res = await fetch(`/api/investments?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAccounts(data.accounts || [])
    } catch (e: any) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchAccounts()
    fetch("/api/fas/get-login-date", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.businessDate) {
          setOpenDate(d.businessDate)
          setCreditDate(d.businessDate)
          setCloseDate(d.businessDate)
        }
      })
      .catch(console.error)
    fetch("/api/investments/ledger-accounts")
      .then((r) => r.json())
      .then((d) => { if (d.accounts) setLedgerAccounts(d.accounts) })
      .catch(console.error)
  }, [fetchAccounts])

  // ── Transaction history ──────────────────────────────────────────────────────

  const fetchHistory = async (account: InvestmentAccount) => {
    setSelectedAccountForHistory(account)
    setIsHistoryOpen(true)
    setIsLoadingHistory(true)
    try {
      const res = await fetch(`/api/investments?type=transactions&accountNumber=${account.account_number}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTransactions(data.transactions || [])
    } catch (e: any) {
      console.error(e)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // ── Ledger-filtered account lists ────────────────────────────────────────────

  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE")

  const creditFilteredAccounts = creditLedger
    ? activeAccounts.filter((a) => String(a.investment_head) === creditLedger)
    : activeAccounts

  const closeFilteredAccounts = closeLedger
    ? activeAccounts.filter((a) => String(a.investment_head) === closeLedger)
    : activeAccounts

  // ── Ledger select handlers ───────────────────────────────────────────────────

  const handleCreditLedgerSelect = (val: string) => {
    setCreditLedger(val)
    setCreditAccount("")
    setSelectedCreditAccount(null)
  }

  const handleCreditAccountSelect = (accNo: string) => {
    setCreditAccount(accNo)
    setSelectedCreditAccount(accounts.find((a) => a.account_number === accNo) || null)
  }

  const handleCloseLedgerSelect = (val: string) => {
    setCloseLedger(val)
    setCloseAccount("")
    setSelectedCloseAccount(null)
    setClosureAmount("")
  }

  const handleCloseAccountSelect = (accNo: string) => {
    setCloseAccount(accNo)
    const acc = accounts.find((a) => a.account_number === accNo) || null
    setSelectedCloseAccount(acc)
    if (acc) setClosureAmount(String(acc.ledger_balance))
  }

  // ── Reset helpers ────────────────────────────────────────────────────────────

  const resetOpenForm = () => {
    setOpenLedger("")
    setOpenDescription("")
    setOpenAmount("")
    setOpenRate("")
    setOpenReference("")
    setOpenVoucherType("CASH")
    setFormError("")
  }

  const resetCreditForm = () => {
    setCreditLedger("")
    setCreditAccount("")
    setCreditType("INTEREST")
    setCreditAmount("")
    setCreditInterest("")
    setCreditVoucher("")
    setCreditVoucherType("CASH")
    setSelectedCreditAccount(null)
    setFormError("")
  }

  const resetCloseForm = () => {
    setCloseLedger("")
    setCloseAccount("")
    setClosureAmount("")
    setClosureInterest("0")
    setCloseVoucher("")
    setCloseVoucherType("CASH")
    setSelectedCloseAccount(null)
    setFormError("")
  }

  // ── Submit handlers ──────────────────────────────────────────────────────────

  const submitOpenInvestment = async () => {
    if (!openLedger || !openAmount || !openDate) {
      setFormError("Please fill all required fields")
      return
    }
    setIsSubmitting(true)
    setFormError("")
    try {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investment_head: openLedger,
          description: openDescription,
          amount_invested: parseFloat(openAmount),
          date_of_investment: openDate,
          rate_of_interest: parseFloat(openRate) || 0,
          reference_number: openReference,
          voucher_type: openVoucherType,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const ledgerName = ledgerAccounts.find((l) => String(l.accountcode) === openLedger)?.accountname ?? openLedger
      setVoucherDetails({
        transactionType: "open",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        transactionDate: openDate,
        voucherType: openVoucherType,
        ledgerName,
        accountNumber: data.account_number,
        amountInvested: parseFloat(openAmount),
        newBalance: parseFloat(openAmount),
      })
      setSuccessOpen(true)
      resetOpenForm()
      fetchAccounts()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitCredit = async () => {
    if (!creditLedger || !creditAccount || !creditAmount || !creditDate) {
      setFormError("Please fill all required fields")
      return
    }
    setIsSubmitting(true)
    setFormError("")
    try {
      const res = await fetch("/api/investments/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledger_account: creditLedger,
          account_number: creditAccount,
          transaction_type: creditType,
          credit_amount: parseFloat(creditAmount),
          interest_amount: parseFloat(creditInterest) || 0,
          transaction_date: creditDate,
          voucher_no: creditVoucher,
          voucher_type: creditVoucherType,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const ledgerName = ledgerAccounts.find((l) => String(l.accountcode) === creditLedger)?.accountname ?? creditLedger
      setVoucherDetails({
        transactionType: "credit",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        transactionDate: creditDate,
        voucherType: creditVoucherType,
        ledgerName,
        accountNumber: creditAccount,
        creditAmount: parseFloat(creditAmount),
        interestAmount: parseFloat(creditInterest) || 0,
        creditType,
        newBalance: data.new_balance,
      })
      setSuccessOpen(true)
      resetCreditForm()
      fetchAccounts()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitClose = async () => {
    if (!closeLedger || !closeAccount || !closureAmount || !closeDate) {
      setFormError("Please fill all required fields")
      return
    }
    setIsSubmitting(true)
    setFormError("")
    try {
      const res = await fetch("/api/investments/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledger_account: closeLedger,
          account_number: closeAccount,
          closure_amount: parseFloat(closureAmount),
          interest_on_closure: parseFloat(closureInterest) || 0,
          transaction_date: closeDate,
          voucher_no: closeVoucher,
          voucher_type: closeVoucherType,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const ledgerName = ledgerAccounts.find((l) => String(l.accountcode) === closeLedger)?.accountname ?? closeLedger
      setVoucherDetails({
        transactionType: "close",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        transactionDate: closeDate,
        voucherType: closeVoucherType,
        ledgerName,
        accountNumber: closeAccount,
        principalRedeemed: data.principal_redeemed,
        interestReceived: data.interest_received,
        totalPayout: data.total_payout,
        newBalance: 0,
      })
      setSuccessOpen(true)
      resetCloseForm()
      fetchAccounts()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────────

  const totalInvested = accounts.reduce((s, a) => s + parseFloat(String(a.amount_invested || 0)), 0)
  const totalBalance = accounts.reduce((s, a) => s + parseFloat(String(a.ledger_balance || 0)), 0)
  const activeCount = accounts.filter((a) => a.status === "ACTIVE").length
  const closedCount = accounts.filter((a) => a.status === "CLOSED").length

  const filteredAccounts = accounts.filter((a) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      a.account_number?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.reference_number?.toLowerCase().includes(q)
    const matchStatus = statusFilter === "all" || a.status?.toUpperCase() === statusFilter.toUpperCase()
    return matchSearch && matchStatus
  })

  const ledgerOptions = ledgerAccounts.map((l) => ({
    value: String(l.accountcode),
    label: l.accountname,
  }))

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-emerald-100 text-emerald-700",
      CLOSED: "bg-gray-100 text-gray-700",
    }
    return colors[status?.toUpperCase()] ?? "bg-gray-100 text-gray-700"
  }

  const txnTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      INVESTMENT: "bg-blue-100 text-blue-700",
      INTEREST: "bg-amber-100 text-amber-700",
      CREDIT: "bg-emerald-100 text-emerald-700",
      CLOSURE: "bg-gray-100 text-gray-700",
    }
    return colors[type?.toUpperCase()] ?? "bg-gray-100 text-gray-700"
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">

            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/bank-level")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Investment Accounts</h1>
                <p className="text-muted-foreground">
                  {user?.role === "admin"
                    ? "All branches — Manage investments, credits, and closures"
                    : `${user?.branch?.name || "Branch"} — Manage investments, credits, and closures`}
                </p>
              </div>
              <Button onClick={fetchAccounts} variant="outline" size="icon">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Stats cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Invested</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-emerald-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold">{activeCount}</p>
                    </div>
                    <BadgeDollarSign className="h-8 w-8 text-emerald-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Closed</p>
                      <p className="text-2xl font-bold">{closedCount}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-gray-400 opacity-70" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                <TabsTrigger value="accounts">Accounts</TabsTrigger>
                <TabsTrigger value="open">Open Investment</TabsTrigger>
                <TabsTrigger value="credit">Credit</TabsTrigger>
                <TabsTrigger value="close">Close</TabsTrigger>
              </TabsList>

              {/* ── Accounts Tab ── */}
              <TabsContent value="accounts" className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="Search by account no., description, or reference..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredAccounts.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">No investment accounts found.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account No.</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Invested</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAccounts.map((acc) => (
                            <TableRow key={acc.id}>
                              <TableCell className="font-mono text-sm">{acc.account_number}</TableCell>
                              <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                                {acc.description || "—"}
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(acc.date_of_investment)}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(acc.amount_invested)}</TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {formatCurrency(acc.ledger_balance)}
                              </TableCell>
                              <TableCell className="text-right text-sm">{acc.rate_of_interest ?? "—"}%</TableCell>
                              <TableCell>
                                <Badge className={statusBadge(acc.status)}>{acc.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => fetchHistory(acc)}
                                  title="View transactions"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Open Investment Tab ── */}
              <TabsContent value="open" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Open New Investment
                        </CardTitle>
                        <CardDescription>Record a new investment placement</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Investment Head (Ledger) *</Label>
                            <SearchableSelect
                              value={openLedger}
                              onValueChange={setOpenLedger}
                              placeholder="Select investment ledger"
                              searchPlaceholder="Search ledger..."
                              options={ledgerOptions}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Description</Label>
                            <Textarea
                              placeholder="Optional description"
                              value={openDescription}
                              onChange={(e) => setOpenDescription(e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Amount Invested *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={openAmount}
                                onChange={(e) => setOpenAmount(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Date of Investment *</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="date"
                                className="pl-10"
                                value={openDate}
                                onChange={(e) => setOpenDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Rate of Interest (%)</Label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={openRate}
                                onChange={(e) => setOpenRate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Reference Number</Label>
                            <div className="relative">
                              <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                className="pl-10"
                                placeholder="Optional"
                                value={openReference}
                                onChange={(e) => setOpenReference(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Type *</Label>
                            <Select value={openVoucherType} onValueChange={setOpenVoucherType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="TRANSFER">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {formError && <p className="text-sm text-destructive">{formError}</p>}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" onClick={resetOpenForm}>Reset</Button>
                          <Button onClick={submitOpenInvestment} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Open Investment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {[
                          { label: "Ledger", value: ledgerAccounts.find(l => String(l.accountcode) === openLedger)?.accountname || "—" },
                          { label: "Amount", value: openAmount ? formatCurrency(openAmount) : "—" },
                          { label: "Date", value: openDate ? formatDate(openDate) : "—" },
                          { label: "Rate", value: openRate ? `${openRate}%` : "—" },
                          { label: "Reference", value: openReference || "—" },
                          { label: "Voucher Type", value: openVoucherType },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ── Credit Tab ── */}
              <TabsContent value="credit" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BadgeDollarSign className="h-5 w-5" />
                          Record Credit Transaction
                        </CardTitle>
                        <CardDescription>Record interest received or top-up an investment</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Ledger *</Label>
                            <SearchableSelect
                              value={creditLedger}
                              onValueChange={handleCreditLedgerSelect}
                              placeholder="Select ledger account"
                              searchPlaceholder="Search ledger..."
                              options={ledgerOptions}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Account *</Label>
                            <SearchableSelect
                              value={creditAccount}
                              onValueChange={handleCreditAccountSelect}
                              placeholder={creditLedger ? "Select investment account" : "Select a ledger first"}
                              searchPlaceholder="Search by account no. or description..."
                              disabled={!creditLedger}
                              options={creditFilteredAccounts.map((a) => ({
                                value: a.account_number,
                                label: `${a.account_number} — ${a.description || "No description"} (${formatCurrency(a.ledger_balance)})`,
                              }))}
                            />
                          </div>

                          {selectedCreditAccount && (
                            <div className="sm:col-span-2 rounded-lg border bg-muted/50 p-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Amount Invested</span>
                                  <p className="font-medium">{formatCurrency(selectedCreditAccount.amount_invested)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Current Balance</span>
                                  <p className="font-medium text-emerald-600">{formatCurrency(selectedCreditAccount.ledger_balance)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Rate of Interest</span>
                                  <p className="font-medium">{selectedCreditAccount.rate_of_interest ?? "—"}%</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Invested On</span>
                                  <p className="font-medium">{formatDate(selectedCreditAccount.date_of_investment)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Transaction Type *</Label>
                            <Select value={creditType} onValueChange={setCreditType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INTEREST">Interest Received</SelectItem>
                                <SelectItem value="CREDIT">Top-up / Additional Investment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>{creditType === "INTEREST" ? "Interest Amount *" : "Credit Amount *"}</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Transaction Date *</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="date"
                                className="pl-10"
                                value={creditDate}
                                onChange={(e) => setCreditDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Number</Label>
                            <Input
                              placeholder="Optional"
                              value={creditVoucher}
                              onChange={(e) => setCreditVoucher(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Type *</Label>
                            <Select value={creditVoucherType} onValueChange={setCreditVoucherType}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="TRANSFER">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {formError && <p className="text-sm text-destructive">{formError}</p>}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" onClick={resetCreditForm}>Reset</Button>
                          <Button onClick={submitCredit} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Credit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>Record interest income or additional amounts for an active investment.</p>
                        <ul className="list-disc space-y-1 pl-4">
                          <li><span className="font-medium text-foreground">Interest Received</span> — posts to Interest Income GL; does not change investment balance</li>
                          <li><span className="font-medium text-foreground">Top-up</span> — increases the investment balance</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ── Close Tab ── */}
              <TabsContent value="close" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <XCircle className="h-5 w-5" />
                          Close Investment
                        </CardTitle>
                        <CardDescription>Redeem and close an active investment account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Ledger *</Label>
                            <SearchableSelect
                              value={closeLedger}
                              onValueChange={handleCloseLedgerSelect}
                              placeholder="Select ledger account"
                              searchPlaceholder="Search ledger..."
                              options={ledgerOptions}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Account *</Label>
                            <SearchableSelect
                              value={closeAccount}
                              onValueChange={handleCloseAccountSelect}
                              placeholder={closeLedger ? "Select investment account" : "Select a ledger first"}
                              searchPlaceholder="Search by account no. or description..."
                              disabled={!closeLedger}
                              options={closeFilteredAccounts.map((a) => ({
                                value: a.account_number,
                                label: `${a.account_number} — ${a.description || "No description"} (Balance: ${formatCurrency(a.ledger_balance)})`,
                              }))}
                            />
                          </div>

                          {selectedCloseAccount && (
                            <div className="sm:col-span-2 rounded-lg border bg-muted/50 p-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Original Amount</span>
                                  <p className="font-medium">{formatCurrency(selectedCloseAccount.amount_invested)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Current Balance</span>
                                  <p className="font-medium text-emerald-600">{formatCurrency(selectedCloseAccount.ledger_balance)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Rate of Interest</span>
                                  <p className="font-medium">{selectedCloseAccount.rate_of_interest ?? "—"}%</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Invested On</span>
                                  <p className="font-medium">{formatDate(selectedCloseAccount.date_of_investment)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Closure Amount *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={closureAmount}
                                onChange={(e) => setClosureAmount(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Interest on Closure</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={closureInterest}
                                onChange={(e) => setClosureInterest(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Closure Date *</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="date"
                                className="pl-10"
                                value={closeDate}
                                onChange={(e) => setCloseDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Number</Label>
                            <Input
                              placeholder="Optional"
                              value={closeVoucher}
                              onChange={(e) => setCloseVoucher(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Voucher Type *</Label>
                            <Select value={closeVoucherType} onValueChange={setCloseVoucherType}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="TRANSFER">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {formError && <p className="text-sm text-destructive">{formError}</p>}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" onClick={resetCloseForm}>Reset</Button>
                          <Button
                            onClick={submitClose}
                            disabled={isSubmitting}
                            variant="destructive"
                          >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Close Investment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Closure payout summary */}
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Payout Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {[
                          { label: "Principal", value: closureAmount ? formatCurrency(closureAmount) : "—" },
                          { label: "Interest", value: closureInterest && closureInterest !== "0" ? formatCurrency(closureInterest) : "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                        <hr className="my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>Total Payout</span>
                          <span className="text-emerald-600">
                            {closureAmount
                              ? formatCurrency((parseFloat(closureAmount) || 0) + (parseFloat(closureInterest) || 0))
                              : "—"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* ── Transaction History Dialog ── */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Transaction History — {selectedAccountForHistory?.account_number}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedAccountForHistory?.description || "Investment Account"} |{" "}
                    Balance: {formatCurrency(selectedAccountForHistory?.ledger_balance || 0)}
                  </DialogDescription>
                </DialogHeader>

                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No transactions found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Voucher</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">{formatDate(t.transaction_date)}</TableCell>
                          <TableCell className="font-mono text-xs">{t.voucher_no || "—"}</TableCell>
                          <TableCell>
                            <Badge className={txnTypeBadge(t.transaction_type)}>
                              {t.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {parseFloat(String(t.debit_amount)) > 0 ? formatCurrency(t.debit_amount) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {parseFloat(String(t.credit_amount)) > 0 ? formatCurrency(t.credit_amount) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {parseFloat(String(t.interest_amount)) > 0 ? formatCurrency(t.interest_amount) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(t.ledger_balance_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{t.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DialogContent>
            </Dialog>

            {/* ── Success / Voucher Dialog ── */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <AlertDialogTitle className="text-center text-lg">
                    {voucherDetails?.transactionType === "open"
                      ? "Investment Opened Successfully"
                      : voucherDetails?.transactionType === "credit"
                      ? voucherDetails.creditType === "INTEREST"
                        ? "Interest Receipt Recorded"
                        : "Investment Top-up Recorded"
                      : "Investment Closed Successfully"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-xs">
                    GL batch created and pending approval
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {voucherDetails && (
                  <div className="space-y-3 py-2">
                    {/* Voucher header band */}
                    <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2 text-sm">
                      <span className="font-semibold">Voucher #{voucherDetails.voucherNo}</span>
                      <span className="text-muted-foreground">Batch #{voucherDetails.batchId}</span>
                    </div>

                    {/* Detail rows */}
                    <div className="divide-y rounded-lg border text-sm">
                      {[
                        { label: "Date", value: formatDate(voucherDetails.transactionDate) },
                        { label: "Voucher Type", value: voucherDetails.voucherType },
                        { label: "Ledger", value: voucherDetails.ledgerName },
                        { label: "Account No.", value: voucherDetails.accountNumber },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between px-4 py-2">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}

                      {/* Open */}
                      {voucherDetails.transactionType === "open" && (
                        <div className="flex justify-between px-4 py-2">
                          <span className="text-muted-foreground">Amount Invested</span>
                          <span className="font-semibold">{formatCurrency(voucherDetails.amountInvested!)}</span>
                        </div>
                      )}

                      {/* Credit */}
                      {voucherDetails.transactionType === "credit" && (
                        <>
                          <div className="flex justify-between px-4 py-2">
                            <span className="text-muted-foreground">
                              {voucherDetails.creditType === "INTEREST" ? "Interest Received" : "Top-up Amount"}
                            </span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(voucherDetails.creditAmount!)}</span>
                          </div>
                          {voucherDetails.transactionType === "credit" && voucherDetails.creditType !== "INTEREST" && (
                            <div className="flex justify-between bg-muted/40 px-4 py-2">
                              <span className="font-medium">New Balance</span>
                              <span className="font-semibold">{formatCurrency(voucherDetails.newBalance)}</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Close */}
                      {voucherDetails.transactionType === "close" && (
                        <>
                          <div className="flex justify-between px-4 py-2">
                            <span className="text-muted-foreground">Principal Redeemed</span>
                            <span className="font-semibold">{formatCurrency(voucherDetails.principalRedeemed!)}</span>
                          </div>
                          {(voucherDetails.interestReceived ?? 0) > 0 && (
                            <div className="flex justify-between px-4 py-2">
                              <span className="text-muted-foreground">Interest on Closure</span>
                              <span className="font-medium text-amber-600">{formatCurrency(voucherDetails.interestReceived!)}</span>
                            </div>
                          )}
                          <div className="flex justify-between bg-muted/40 px-4 py-2">
                            <span className="font-semibold">Total Payout</span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(voucherDetails.totalPayout!)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {voucherDetails.transactionType === "close" && (
                      <div className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                        <XCircle className="h-4 w-4" />
                        Account has been closed
                      </div>
                    )}
                  </div>
                )}

                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setSuccessOpen(false)} className="w-full">
                    Done
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
