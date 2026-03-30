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
import { Switch } from "@/components/ui/switch"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  Building2,
  RefreshCw,
  Eye,
  IndianRupee,
  Calendar,
  Percent,
  FileText,
  Pencil,
  TrendingUp,
  TrendingDown,
  Wallet,
  XCircle,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { SearchableSelect } from "@/components/ui/searchable-select"

// ─── Types ────────────────────────────────────────────────────────────────────

type BankAccount = {
  id: string
  account_number: string
  account_head: string
  branch_id: number
  description: string
  account_balance: number
  account_clear_balance: number
  account_unclear_balance: number
  date_of_account_opening: string
  rate_of_interest: number
  interest_receivable: number
  reference_number: string
  status: string
  created_by: string
  created_date: string
}

type BankAccountTransaction = {
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
  transactionType: "open" | "deposit" | "withdrawal"
  voucherNo: string | number | null
  batchId: string | number | null
  transactionDate: string
  voucherType: string
  ledgerName: string
  accountNumber: string
  amount: number
  txnSubType?: string   // DEPOSIT | INTEREST | WITHDRAWAL | CLOSURE
  newBalance: number
  accountClosed?: boolean
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

export default function OtherBankAccountsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState("accounts")
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [ledgerAccounts, setLedgerAccounts] = useState<{ accountcode: number; accountname: string }[]>([])

  // ── Open Account form ────────────────────────────────────────────────────────
  const [openHead, setOpenHead] = useState("")
  const [openDescription, setOpenDescription] = useState("")
  const [openBalance, setOpenBalance] = useState("")
  const [openDate, setOpenDate] = useState("")
  const [openRate, setOpenRate] = useState("")
  const [openReference, setOpenReference] = useState("")
  const [openVoucherType, setOpenVoucherType] = useState("CASH")

  // ── Deposit / Interest form ──────────────────────────────────────────────────
  const [depositLedger, setDepositLedger] = useState("")
  const [depositAccount, setDepositAccount] = useState("")
  const [depositType, setDepositType] = useState("DEPOSIT")
  const [depositAmount, setDepositAmount] = useState("")
  const [depositDate, setDepositDate] = useState("")
  const [depositVoucher, setDepositVoucher] = useState("")
  const [depositVoucherType, setDepositVoucherType] = useState("CASH")
  const [depositNarration, setDepositNarration] = useState("")
  const [selectedDepositAccount, setSelectedDepositAccount] = useState<BankAccount | null>(null)

  // ── Withdrawal form ──────────────────────────────────────────────────────────
  const [withdrawLedger, setWithdrawLedger] = useState("")
  const [withdrawAccount, setWithdrawAccount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawDate, setWithdrawDate] = useState("")
  const [withdrawVoucher, setWithdrawVoucher] = useState("")
  const [withdrawVoucherType, setWithdrawVoucherType] = useState("CASH")
  const [withdrawNarration, setWithdrawNarration] = useState("")
  const [closeAccount, setCloseAccount] = useState(false)
  const [selectedWithdrawAccount, setSelectedWithdrawAccount] = useState<BankAccount | null>(null)

  // ── Edit modal ───────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const [editRate, setEditRate] = useState("")
  const [editReference, setEditReference] = useState("")
  const [isEditSaving, setIsEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  // ── Transaction history ──────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<BankAccountTransaction[]>([])
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<BankAccount | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // ── Form state ───────────────────────────────────────────────────────────────
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
      const res = await fetch(`/api/other-bank-accounts?${params}`)
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
          setDepositDate(d.businessDate)
          setWithdrawDate(d.businessDate)
        }
      })
      .catch(console.error)
    fetch("/api/other-bank-accounts/ledger-accounts")
      .then((r) => r.json())
      .then((d) => { if (d.accounts) setLedgerAccounts(d.accounts) })
      .catch(console.error)
  }, [fetchAccounts])

  // ── Transaction history ──────────────────────────────────────────────────────

  const fetchHistory = async (account: BankAccount) => {
    setSelectedAccountForHistory(account)
    setIsHistoryOpen(true)
    setIsLoadingHistory(true)
    try {
      const res = await fetch(`/api/other-bank-accounts?type=transactions&accountNumber=${account.account_number}`)
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

  const depositFilteredAccounts = depositLedger
    ? activeAccounts.filter((a) => String(a.account_head) === depositLedger)
    : activeAccounts

  const withdrawFilteredAccounts = withdrawLedger
    ? activeAccounts.filter((a) => String(a.account_head) === withdrawLedger)
    : activeAccounts

  const ledgerOptions = ledgerAccounts.map((l) => ({
    value: String(l.accountcode),
    label: l.accountname,
  }))

  const accountLabel = (a: BankAccount) =>
    `${a.account_number} — ${a.description || "No description"} (Balance: ${formatCurrency(a.account_balance)})`

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleDepositLedgerSelect = (v: string) => {
    setDepositLedger(v)
    setDepositAccount("")
    setSelectedDepositAccount(null)
  }

  const handleDepositAccountSelect = (v: string) => {
    setDepositAccount(v)
    setSelectedDepositAccount(accounts.find((a) => a.account_number === v) || null)
  }

  const handleWithdrawLedgerSelect = (v: string) => {
    setWithdrawLedger(v)
    setWithdrawAccount("")
    setSelectedWithdrawAccount(null)
    setWithdrawAmount("")
    setCloseAccount(false)
  }

  const handleWithdrawAccountSelect = (v: string) => {
    setWithdrawAccount(v)
    const acc = accounts.find((a) => a.account_number === v) || null
    setSelectedWithdrawAccount(acc)
  }

  const openEditModal = (acc: BankAccount) => {
    setEditAccount(acc)
    setEditDescription(acc.description || "")
    setEditRate(String(acc.rate_of_interest || ""))
    setEditReference(acc.reference_number || "")
    setEditError("")
    setEditOpen(true)
  }

  // ── Reset helpers ─────────────────────────────────────────────────────────────

  const resetOpenForm = () => {
    setOpenHead("")
    setOpenDescription("")
    setOpenBalance("")
    setOpenRate("")
    setOpenReference("")
    setOpenVoucherType("CASH")
    setFormError("")
  }

  const resetDepositForm = () => {
    setDepositLedger("")
    setDepositAccount("")
    setDepositType("DEPOSIT")
    setDepositAmount("")
    setDepositVoucher("")
    setDepositVoucherType("CASH")
    setDepositNarration("")
    setSelectedDepositAccount(null)
    setFormError("")
  }

  const resetWithdrawForm = () => {
    setWithdrawLedger("")
    setWithdrawAccount("")
    setWithdrawAmount("")
    setWithdrawVoucher("")
    setWithdrawVoucherType("CASH")
    setWithdrawNarration("")
    setCloseAccount(false)
    setSelectedWithdrawAccount(null)
    setFormError("")
  }

  // ── Submit handlers ───────────────────────────────────────────────────────────

  const submitOpenAccount = async () => {
    if (!openHead || !openDate) {
      setFormError("Please fill all required fields")
      return
    }
    setIsSubmitting(true)
    setFormError("")
    try {
      const res = await fetch("/api/other-bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_head: openHead,
          description: openDescription,
          opening_balance: parseFloat(openBalance) || 0,
          date_of_account_opening: openDate,
          rate_of_interest: parseFloat(openRate) || 0,
          reference_number: openReference,
          voucher_type: openVoucherType,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const ledgerName = ledgerAccounts.find((l) => String(l.accountcode) === openHead)?.accountname ?? openHead
      setVoucherDetails({
        transactionType: "open",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        transactionDate: openDate,
        voucherType: openVoucherType,
        ledgerName,
        accountNumber: data.account_number,
        amount: parseFloat(openBalance) || 0,
        newBalance: parseFloat(openBalance) || 0,
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

  const submitDeposit = async () => {
    if (!depositLedger || !depositAccount || !depositAmount || !depositDate) {
      setFormError("Please fill all required fields")
      return
    }
    setIsSubmitting(true)
    setFormError("")
    try {
      const res = await fetch("/api/other-bank-accounts/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_head: depositLedger,
          account_number: depositAccount,
          transaction_type: depositType,
          deposit_amount: parseFloat(depositAmount),
          transaction_date: depositDate,
          voucher_no: depositVoucher,
          voucher_type: depositVoucherType,
          narration: depositNarration,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const ledgerName = ledgerAccounts.find((l) => String(l.accountcode) === depositLedger)?.accountname ?? depositLedger
      setVoucherDetails({
        transactionType: "deposit",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        transactionDate: depositDate,
        voucherType: depositVoucherType,
        ledgerName,
        accountNumber: depositAccount,
        amount: parseFloat(depositAmount),
        txnSubType: depositType,
        newBalance: data.new_balance,
      })
      setSuccessOpen(true)
      resetDepositForm()
      fetchAccounts()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitWithdrawal = async () => {
    if (!withdrawLedger || !withdrawAccount || !withdrawAmount || !withdrawDate) {
      setFormError("Please fill all required fields")
      return
    }
    setIsSubmitting(true)
    setFormError("")
    try {
      const res = await fetch("/api/other-bank-accounts/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_head: withdrawLedger,
          account_number: withdrawAccount,
          withdrawal_amount: parseFloat(withdrawAmount),
          transaction_date: withdrawDate,
          voucher_no: withdrawVoucher,
          voucher_type: withdrawVoucherType,
          narration: withdrawNarration,
          close_account: closeAccount,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const ledgerName = ledgerAccounts.find((l) => String(l.accountcode) === withdrawLedger)?.accountname ?? withdrawLedger
      setVoucherDetails({
        transactionType: "withdrawal",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        transactionDate: withdrawDate,
        voucherType: withdrawVoucherType,
        ledgerName,
        accountNumber: withdrawAccount,
        amount: parseFloat(withdrawAmount),
        txnSubType: closeAccount ? "CLOSURE" : "WITHDRAWAL",
        newBalance: data.new_balance,
        accountClosed: data.account_status === "CLOSED",
      })
      setSuccessOpen(true)
      resetWithdrawForm()
      fetchAccounts()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveEdit = async () => {
    if (!editAccount) return
    setIsEditSaving(true)
    setEditError("")
    try {
      const res = await fetch("/api/other-bank-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_number: editAccount.account_number,
          description: editDescription,
          rate_of_interest: parseFloat(editRate) || 0,
          reference_number: editReference,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEditOpen(false)
      fetchAccounts()
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setIsEditSaving(false)
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────────

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(String(a.account_balance || 0)), 0)
  const totalClear = accounts.reduce((s, a) => s + parseFloat(String(a.account_clear_balance || 0)), 0)
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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: "bg-sky-100 text-sky-700",
      CLOSED: "bg-gray-100 text-gray-700",
    }
    return map[status?.toUpperCase()] ?? "bg-gray-100 text-gray-700"
  }

  const txnBadge = (type: string) => {
    const map: Record<string, string> = {
      OPENING: "bg-blue-100 text-blue-700",
      DEPOSIT: "bg-emerald-100 text-emerald-700",
      INTEREST: "bg-amber-100 text-amber-700",
      WITHDRAWAL: "bg-orange-100 text-orange-700",
      CLOSURE: "bg-gray-100 text-gray-700",
    }
    return map[type?.toUpperCase()] ?? "bg-gray-100 text-gray-700"
  }

  // ── Render ────────────────────────────────────────────────────────────────────

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
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Other Bank Accounts</h1>
                <p className="text-muted-foreground">
                  {user?.role === "admin"
                    ? "All branches — Manage accounts held with other banks"
                    : `${user?.branch?.name || "Branch"} — Manage accounts held with other banks`}
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
                      <p className="text-sm text-muted-foreground">Total Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-sky-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Clear Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalClear)}</p>
                    </div>
                    <Wallet className="h-8 w-8 text-emerald-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Accounts</p>
                      <p className="text-2xl font-bold">{activeCount}</p>
                    </div>
                    <Building2 className="h-8 w-8 text-sky-500 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Closed Accounts</p>
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
                <TabsTrigger value="open">Open Account</TabsTrigger>
                <TabsTrigger value="deposit">Deposit / Interest</TabsTrigger>
                <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
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
                      <div className="py-12 text-center text-muted-foreground">No bank accounts found.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account No.</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Opened On</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">Clear Balance</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAccounts.map((acc) => (
                            <TableRow key={acc.id}>
                              <TableCell className="font-mono text-sm">{acc.account_number}</TableCell>
                              <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                                {acc.description || "—"}
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(acc.date_of_account_opening)}</TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {formatCurrency(acc.account_balance)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(acc.account_clear_balance)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {acc.rate_of_interest ?? "—"}%
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {acc.reference_number || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusBadge(acc.status)}>{acc.status}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => fetchHistory(acc)}
                                    title="View transactions"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {acc.status === "ACTIVE" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditModal(acc)}
                                      title="Edit account"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Open Account Tab ── */}
              <TabsContent value="open" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Open New Bank Account
                        </CardTitle>
                        <CardDescription>Register a new account held with another bank</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Account Head (Ledger) *</Label>
                            <SearchableSelect
                              value={openHead}
                              onValueChange={setOpenHead}
                              placeholder="Select bank account type"
                              searchPlaceholder="Search ledger..."
                              options={ledgerOptions}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Description</Label>
                            <Textarea
                              placeholder="e.g. DCCB Current Account – Main Branch"
                              value={openDescription}
                              onChange={(e) => setOpenDescription(e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Opening Balance</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={openBalance}
                                onChange={(e) => setOpenBalance(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Date of Opening *</Label>
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
                                placeholder="Bank account / passbook no."
                                value={openReference}
                                onChange={(e) => setOpenReference(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Type</Label>
                            <Select value={openVoucherType} onValueChange={setOpenVoucherType}>
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
                          <Button variant="outline" onClick={resetOpenForm}>Reset</Button>
                          <Button onClick={submitOpenAccount} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Open Account
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card>
                      <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {[
                          { label: "Ledger", value: ledgerAccounts.find((l) => String(l.accountcode) === openHead)?.accountname || "—" },
                          { label: "Opening Balance", value: openBalance ? formatCurrency(openBalance) : "—" },
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

              {/* ── Deposit / Interest Tab ── */}
              <TabsContent value="deposit" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Record Deposit / Interest
                        </CardTitle>
                        <CardDescription>Deposit funds or record interest earned on a bank account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Ledger *</Label>
                            <SearchableSelect
                              value={depositLedger}
                              onValueChange={handleDepositLedgerSelect}
                              placeholder="Select bank account type"
                              searchPlaceholder="Search ledger..."
                              options={ledgerOptions}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Account *</Label>
                            <SearchableSelect
                              value={depositAccount}
                              onValueChange={handleDepositAccountSelect}
                              placeholder={depositLedger ? "Select bank account" : "Select a ledger first"}
                              searchPlaceholder="Search by account no. or description..."
                              disabled={!depositLedger}
                              options={depositFilteredAccounts.map((a) => ({
                                value: a.account_number,
                                label: accountLabel(a),
                              }))}
                            />
                          </div>

                          {selectedDepositAccount && (
                            <div className="sm:col-span-2 rounded-lg border bg-muted/50 p-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Account Balance</span>
                                  <p className="font-medium text-sky-600">{formatCurrency(selectedDepositAccount.account_balance)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Clear Balance</span>
                                  <p className="font-medium">{formatCurrency(selectedDepositAccount.account_clear_balance)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Rate of Interest</span>
                                  <p className="font-medium">{selectedDepositAccount.rate_of_interest ?? "—"}%</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Opened On</span>
                                  <p className="font-medium">{formatDate(selectedDepositAccount.date_of_account_opening)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Transaction Type *</Label>
                            <Select value={depositType} onValueChange={setDepositType}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                                <SelectItem value="INTEREST">Interest Received</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Amount *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
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
                                value={depositDate}
                                onChange={(e) => setDepositDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Number</Label>
                            <Input
                              placeholder="Optional"
                              value={depositVoucher}
                              onChange={(e) => setDepositVoucher(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Type *</Label>
                            <Select value={depositVoucherType} onValueChange={setDepositVoucherType}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="TRANSFER">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Narration</Label>
                            <Input
                              placeholder="Optional note for this transaction"
                              value={depositNarration}
                              onChange={(e) => setDepositNarration(e.target.value)}
                            />
                          </div>
                        </div>

                        {formError && <p className="text-sm text-destructive">{formError}</p>}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" onClick={resetDepositForm}>Reset</Button>
                          <Button onClick={submitDeposit} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {depositType === "INTEREST" ? "Record Interest" : "Record Deposit"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card>
                      <CardHeader><CardTitle className="text-lg">GL Entries</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        {depositType === "INTEREST" ? (
                          <>
                            <p className="font-medium text-foreground">Interest Received</p>
                            <p>DR: Other Bank Account GL</p>
                            <p>CR: Interest Received (31000000)</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-foreground">Deposit</p>
                            <p>DR: Other Bank Account GL</p>
                            <p>CR: Cash / Bank GL</p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ── Withdrawal Tab ── */}
              <TabsContent value="withdrawal" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingDown className="h-5 w-5" />
                          Record Withdrawal
                        </CardTitle>
                        <CardDescription>Withdraw funds from a bank account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Ledger *</Label>
                            <SearchableSelect
                              value={withdrawLedger}
                              onValueChange={handleWithdrawLedgerSelect}
                              placeholder="Select bank account type"
                              searchPlaceholder="Search ledger..."
                              options={ledgerOptions}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Account *</Label>
                            <SearchableSelect
                              value={withdrawAccount}
                              onValueChange={handleWithdrawAccountSelect}
                              placeholder={withdrawLedger ? "Select bank account" : "Select a ledger first"}
                              searchPlaceholder="Search by account no. or description..."
                              disabled={!withdrawLedger}
                              options={withdrawFilteredAccounts.map((a) => ({
                                value: a.account_number,
                                label: accountLabel(a),
                              }))}
                            />
                          </div>

                          {selectedWithdrawAccount && (
                            <div className="sm:col-span-2 rounded-lg border bg-muted/50 p-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Account Balance</span>
                                  <p className="font-medium text-sky-600">{formatCurrency(selectedWithdrawAccount.account_balance)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Clear Balance</span>
                                  <p className="font-medium">{formatCurrency(selectedWithdrawAccount.account_clear_balance)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Rate of Interest</span>
                                  <p className="font-medium">{selectedWithdrawAccount.rate_of_interest ?? "—"}%</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Reference</span>
                                  <p className="font-medium">{selectedWithdrawAccount.reference_number || "—"}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Withdrawal Amount *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
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
                                value={withdrawDate}
                                onChange={(e) => setWithdrawDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Number</Label>
                            <Input
                              placeholder="Optional"
                              value={withdrawVoucher}
                              onChange={(e) => setWithdrawVoucher(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Type *</Label>
                            <Select value={withdrawVoucherType} onValueChange={setWithdrawVoucherType}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="TRANSFER">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Narration</Label>
                            <Input
                              placeholder="Optional note for this transaction"
                              value={withdrawNarration}
                              onChange={(e) => setWithdrawNarration(e.target.value)}
                            />
                          </div>

                          <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                            <Switch
                              checked={closeAccount}
                              onCheckedChange={setCloseAccount}
                              id="close-account"
                            />
                            <div>
                              <Label htmlFor="close-account" className="cursor-pointer font-medium text-destructive">
                                Close this account after withdrawal
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                The account will be marked as CLOSED and no further transactions will be allowed.
                              </p>
                            </div>
                          </div>
                        </div>

                        {formError && <p className="text-sm text-destructive">{formError}</p>}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" onClick={resetWithdrawForm}>Reset</Button>
                          <Button
                            onClick={submitWithdrawal}
                            disabled={isSubmitting}
                            variant={closeAccount ? "destructive" : "default"}
                          >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {closeAccount ? "Withdraw & Close" : "Record Withdrawal"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card>
                      <CardHeader><CardTitle className="text-lg">GL Entries</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Withdrawal</p>
                        <p>DR: Cash / Bank GL</p>
                        <p>CR: Other Bank Account GL</p>
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
                    {selectedAccountForHistory?.description || "Bank Account"} |{" "}
                    Balance: {formatCurrency(selectedAccountForHistory?.account_balance || 0)}
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
                            <Badge className={txnBadge(t.transaction_type)}>{t.transaction_type}</Badge>
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

            {/* ── Edit Account Dialog ── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Account</DialogTitle>
                  <DialogDescription>{editAccount?.account_number}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate of Interest (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        className="pl-10"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference Number</Label>
                    <Input
                      value={editReference}
                      onChange={(e) => setEditReference(e.target.value)}
                    />
                  </div>
                  {editError && <p className="text-sm text-destructive">{editError}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button onClick={saveEdit} disabled={isEditSaving}>
                    {isEditSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ── Success / Voucher Dialog ── */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
                    <CheckCircle2 className="h-8 w-8 text-sky-600" />
                  </div>
                  <AlertDialogTitle className="text-center text-lg">
                    {voucherDetails?.transactionType === "open"
                      ? "Account Opened Successfully"
                      : voucherDetails?.txnSubType === "INTEREST"
                      ? "Interest Recorded Successfully"
                      : voucherDetails?.txnSubType === "CLOSURE"
                      ? "Account Closed Successfully"
                      : voucherDetails?.transactionType === "deposit"
                      ? "Deposit Recorded Successfully"
                      : "Withdrawal Recorded Successfully"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-xs">
                    {voucherDetails?.voucherNo
                      ? "GL batch created and pending approval"
                      : "Account registered — no opening balance GL entry created"}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {voucherDetails && (
                  <div className="space-y-3 py-2">
                    {voucherDetails.voucherNo && (
                      <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2 text-sm">
                        <span className="font-semibold">Voucher #{voucherDetails.voucherNo}</span>
                        <span className="text-muted-foreground">Batch #{voucherDetails.batchId}</span>
                      </div>
                    )}

                    <div className="divide-y rounded-lg border text-sm">
                      {[
                        { label: "Date", value: formatDate(voucherDetails.transactionDate) },
                        { label: "Voucher Type", value: voucherDetails.voucherType },
                        { label: "Ledger", value: voucherDetails.ledgerName },
                        { label: "Account No.", value: voucherDetails.accountNumber },
                        {
                          label:
                            voucherDetails.transactionType === "open"
                              ? "Opening Balance"
                              : voucherDetails.transactionType === "deposit"
                              ? voucherDetails.txnSubType === "INTEREST" ? "Interest Amount" : "Deposit Amount"
                              : "Withdrawal Amount",
                          value: formatCurrency(voucherDetails.amount),
                          highlight: true,
                        },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className={`flex justify-between px-4 py-2 ${highlight ? "bg-muted/40" : ""}`}>
                          <span className="text-muted-foreground">{label}</span>
                          <span className={`font-${highlight ? "semibold" : "medium"}`}>{value}</span>
                        </div>
                      ))}

                      {voucherDetails.transactionType !== "open" && (
                        <div className="flex justify-between bg-muted/40 px-4 py-2">
                          <span className="font-medium text-foreground">New Balance</span>
                          <span className="font-semibold">{formatCurrency(voucherDetails.newBalance)}</span>
                        </div>
                      )}
                    </div>

                    {voucherDetails.accountClosed && (
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
