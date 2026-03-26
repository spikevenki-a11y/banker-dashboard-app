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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  Landmark,
  Plus,
  TrendingDown,
  TrendingUp,
  Calendar,
  IndianRupee,
  Percent,
  FileText,
  RefreshCw,
  Eye,
  Banknote,
  CreditCard,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { SearchableSelect } from "@/components/ui/searchable-select"

type BorrowingAccount = {
  id: string
  account_number: string
  borrowing_agency: string
  investment_head: string | null
  branch_id: number
  type_of_borrowing: string
  description: string
  amount_sanctioned: number
  ledger_balance: number
  date_of_sanction: string
  purpose: string
  rate_of_interest: number
  interest_payable: number
  moratorium_interest: boolean
  number_of_installments: number
  installment_months: number
  moratorium_months: number
  installment_amount: number
  installment_start_date: string
  repayment_type: string
  repayment_start_date: string
  reference_number: string
  status: string
  created_by: string
  created_date: string
  outstanding_balance: number
}

type BorrowingTransaction = {
  id: string
  branch_id: number
  transaction_date: string
  voucher_no: string
  transaction_type: string
  account_number: string
  drawal_amount: number
  repayment_amount: number
  charge_amount: number
  iod_amount: number
  penal_interest_amount: number
  interest_amount: number
  ledger_balance_amount: number
  last_interest_paid_date: string
  voucher_type: string
  status: string
  created_by: string
  created_date: string
}

type VoucherDetails = {
  transactionType: "drawal" | "repayment"
  voucherNo: string | number
  batchId: string | number
  transactionDate: string
  voucherType: string
  ledgerName: string
  accountNumber: string
  borrowingAgency: string
  // Drawal
  drawalAmount?: number
  // Repayment breakdown
  repaymentAmount?: number
  principalPaid?: number
  interestPaid?: number
  otherCharges?: number
  accountStatus?: string
  newBalance: number
}

function formatCurrency(val: number | string) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function BorrowingsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState("accounts")
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<BorrowingAccount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Ledger accounts for Select Ledger dropdown
  const [ledgerAccounts, setLedgerAccounts] = useState<{ accountcode: number; accountname: string }[]>([])

  // Account Opening Form
  const [borrowingAgency, setBorrowingAgency] = useState("")
  const [typeOfBorrowing, setTypeOfBorrowing] = useState("")
  const [description, setDescription] = useState("")
  const [amountSanctioned, setAmountSanctioned] = useState("")
  const [dateOfSanction, setDateOfSanction] = useState("")
  const [purpose, setPurpose] = useState("")
  const [rateOfInterest, setRateOfInterest] = useState("")
  const [numberOfInstallments, setNumberOfInstallments] = useState("")
  const [installmentMonths, setInstallmentMonths] = useState("")
  const [moratoriumMonths, setMoratoriumMonths] = useState("0")
  const [installmentAmount, setInstallmentAmount] = useState("")
  const [installmentStartDate, setInstallmentStartDate] = useState("")
  const [repaymentType, setRepaymentType] = useState("MONTHLY")
  const [repaymentStartDate, setRepaymentStartDate] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [moratoriumInterest, setMoratoriumInterest] = useState(false)

  // Drawal Form
  const [drawalLedger, setDrawalLedger] = useState("")
  const [drawalAccount, setDrawalAccount] = useState("")
  const [drawalAmount, setDrawalAmount] = useState("")
  const [drawalDate, setDrawalDate] = useState("")
  const [drawalVoucher, setDrawalVoucher] = useState("")
  const [drawalTransactionType, setDrawalTransactionType] = useState("CASH")
  const [selectedDrawalAccount, setSelectedDrawalAccount] = useState<BorrowingAccount | null>(null)

  // Repayment Form
  const [repaymentLedger, setRepaymentLedger] = useState("")
  const [repaymentAccount, setRepaymentAccount] = useState("")
  const [repaymentAmount, setRepaymentAmount] = useState("")
  const [repaymentDate, setRepaymentDate] = useState("")
  const [repaymentVoucher, setRepaymentVoucher] = useState("")
  const [repaymentTransactionType, setRepaymentTransactionType] = useState("CASH")
  const [principalAmount, setPrincipalAmount] = useState("")
  const [interestAmountPaid, setInterestAmountPaid] = useState("")
  const [chargeAmount, setChargeAmount] = useState("0")
  const [iodAmount, setIodAmount] = useState("0")
  const [penalInterestAmount, setPenalInterestAmount] = useState("0")
  const [selectedRepaymentAccount, setSelectedRepaymentAccount] = useState<BorrowingAccount | null>(null)

  // Transaction history
  const [transactions, setTransactions] = useState<BorrowingTransaction[]>([])
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<BorrowingAccount | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [successOpen, setSuccessOpen] = useState(false)
  const [voucherDetails, setVoucherDetails] = useState<VoucherDetails | null>(null)

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (searchQuery) params.append("accountNumber", searchQuery)

      const res = await fetch(`/api/borrowings?${params}`)
      const data = await res.json()

      if (data.error) throw new Error(data.error)
      setAccounts(data.accounts || [])
    } catch (error: any) {
      console.error("Failed to fetch accounts:", error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery])

  // Fetch login date
  const fetchLoginDate = async () => {
    try {
      const res = await fetch("/api/fas/get-login-date", { credentials: "include" })
      const data = await res.json()
      if (data.businessDate) {
        setDateOfSanction(data.businessDate)
        setDrawalDate(data.businessDate)
        setRepaymentDate(data.businessDate)
        setInstallmentStartDate(data.businessDate)
        setRepaymentStartDate(data.businessDate)
      }
    } catch (err) {
      console.error("Failed to fetch date", err)
    }
  }

  useEffect(() => {
    fetchAccounts()
    fetchLoginDate()
    fetch("/api/borrowings/ledger-accounts")
      .then((r) => r.json())
      .then((data) => { if (data.accounts) setLedgerAccounts(data.accounts) })
      .catch(console.error)
  }, [fetchAccounts])

  // Fetch transaction history
  const fetchTransactionHistory = async (account: BorrowingAccount) => {
    setSelectedAccountForHistory(account)
    setIsHistoryOpen(true)
    setIsLoadingHistory(true)
    
    try {
      const res = await fetch(`/api/borrowings?type=transactions&accountNumber=${account.account_number}`)
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      setTransactions(data.transactions || [])
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Handle ledger selection for drawal
  const handleDrawalLedgerSelect = (ledgerCode: string) => {
    setDrawalLedger(ledgerCode)
    setDrawalAccount("")
    setSelectedDrawalAccount(null)
  }

  // Handle account selection for drawal
  const handleDrawalAccountSelect = (accountNumber: string) => {
    setDrawalAccount(accountNumber)
    const account = accounts.find(a => a.account_number === accountNumber)
    setSelectedDrawalAccount(account || null)
  }

  // Handle ledger selection for repayment
  const handleRepaymentLedgerSelect = (ledgerCode: string) => {
    setRepaymentLedger(ledgerCode)
    setRepaymentAccount("")
    setSelectedRepaymentAccount(null)
  }

  // Handle account selection for repayment
  const handleRepaymentAccountSelect = (accountNumber: string) => {
    setRepaymentAccount(accountNumber)
    const account = accounts.find(a => a.account_number === accountNumber)
    setSelectedRepaymentAccount(account || null)
  }

  // Calculate principal automatically
  useEffect(() => {
    if (repaymentAmount) {
      const total = parseFloat(repaymentAmount) || 0
      const interest = parseFloat(interestAmountPaid) || 0
      const charge = parseFloat(chargeAmount) || 0
      const iod = parseFloat(iodAmount) || 0
      const penal = parseFloat(penalInterestAmount) || 0
      const principal = total - interest - charge - iod - penal
      setPrincipalAmount(principal > 0 ? principal.toFixed(2) : "0")
    }
  }, [repaymentAmount, interestAmountPaid, chargeAmount, iodAmount, penalInterestAmount])

  // Submit account opening
  const submitAccountOpening = async () => {
    if (!typeOfBorrowing || !amountSanctioned || !dateOfSanction) {
      setFormError("Please fill all required fields")
      return
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/borrowings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open_account",
          borrowing_agency: borrowingAgency,
          type_of_borrowing: typeOfBorrowing,
          description,
          amount_sanctioned: parseFloat(amountSanctioned),
          date_of_sanction: dateOfSanction,
          purpose,
          rate_of_interest: parseFloat(rateOfInterest) || 0,
          number_of_installments: parseInt(numberOfInstallments) || null,
          installment_months: parseInt(installmentMonths) || null,
          moratorium_months: parseInt(moratoriumMonths) || 0,
          installment_amount: parseFloat(installmentAmount) || null,
          installment_start_date: installmentStartDate || null,
          repayment_type: repaymentType,
          repayment_start_date: repaymentStartDate || null,
          reference_number: referenceNumber,
          moratorium_interest: moratoriumInterest
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setSuccessMessage(`Borrowing account ${data.account_number} created successfully!`)
      setSuccessOpen(true)
      resetAccountForm()
      fetchAccounts()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit drawal
  const submitDrawal = async () => {
    if (!drawalLedger || !drawalAccount || !drawalAmount || !drawalDate) {
      setFormError("Please fill all required fields")
      return
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/borrowings/drawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "drawal",
          ledger_account: drawalLedger,
          account_number: drawalAccount,
          drawal_amount: parseFloat(drawalAmount),
          transaction_date: drawalDate,
          voucher_no: drawalVoucher,
          voucher_type: drawalTransactionType
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const ledgerName = ledgerAccounts.find(l => String(l.accountcode) === drawalLedger)?.accountname ?? drawalLedger
      setVoucherDetails({
        transactionType: "drawal",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        transactionDate: drawalDate,
        voucherType: drawalTransactionType,
        ledgerName,
        accountNumber: drawalAccount,
        borrowingAgency: selectedDrawalAccount?.borrowing_agency ?? "",
        drawalAmount: parseFloat(drawalAmount),
        newBalance: data.new_balance,
      })
      setSuccessOpen(true)
      resetDrawalForm()
      fetchAccounts()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit repayment
  const submitRepayment = async () => {
    if (!repaymentLedger || !repaymentAccount || !repaymentAmount || !repaymentDate) {
      setFormError("Please fill all required fields")
      return
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/borrowings/repayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledger_account: repaymentLedger,
          account_number: repaymentAccount,
          repayment_amount: parseFloat(repaymentAmount),
          transaction_date: repaymentDate,
          voucher_no: repaymentVoucher,
          voucher_type: repaymentTransactionType,
          principal_amount: parseFloat(principalAmount) || 0,
          interest_amount: parseFloat(interestAmountPaid) || 0,
          charge_amount: parseFloat(chargeAmount) || 0,
          iod_amount: parseFloat(iodAmount) || 0,
          penal_interest_amount: parseFloat(penalInterestAmount) || 0
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const otherCharges =
        (parseFloat(chargeAmount) || 0) +
        (parseFloat(iodAmount) || 0) +
        (parseFloat(penalInterestAmount) || 0)
      const ledgerName = ledgerAccounts.find(l => String(l.accountcode) === repaymentLedger)?.accountname ?? repaymentLedger
      setVoucherDetails({
        transactionType: "repayment",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        transactionDate: repaymentDate,
        voucherType: repaymentTransactionType,
        ledgerName,
        accountNumber: repaymentAccount,
        borrowingAgency: selectedRepaymentAccount?.borrowing_agency ?? "",
        repaymentAmount: parseFloat(repaymentAmount),
        principalPaid: data.principal_paid,
        interestPaid: data.interest_paid,
        otherCharges,
        accountStatus: data.account_status,
        newBalance: data.new_balance,
      })
      setSuccessOpen(true)
      resetRepaymentForm()
      fetchAccounts()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetAccountForm = () => {
    setBorrowingAgency("")
    setTypeOfBorrowing("")
    setDescription("")
    setAmountSanctioned("")
    setPurpose("")
    setRateOfInterest("")
    setNumberOfInstallments("")
    setInstallmentMonths("")
    setMoratoriumMonths("0")
    setInstallmentAmount("")
    setReferenceNumber("")
    setMoratoriumInterest(false)
    setFormError("")
  }

  const resetDrawalForm = () => {
    setDrawalLedger("")
    setDrawalAccount("")
    setDrawalAmount("")
    setDrawalVoucher("")
    setDrawalTransactionType("CASH")
    setSelectedDrawalAccount(null)
    setFormError("")
  }

  const resetRepaymentForm = () => {
    setRepaymentLedger("")
    setRepaymentAccount("")
    setRepaymentAmount("")
    setRepaymentVoucher("")
    setRepaymentTransactionType("CASH")
    setPrincipalAmount("")
    setInterestAmountPaid("")
    setChargeAmount("0")
    setIodAmount("0")
    setPenalInterestAmount("0")
    setSelectedRepaymentAccount(null)
    setFormError("")
  }

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.account_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.borrowing_agency?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || acc.status?.toUpperCase() === statusFilter.toUpperCase()
    return matchesSearch && matchesStatus
  })

  // Active accounts for drawal/repayment
  const activeAccounts = accounts.filter(a => a.status === "ACTIVE")
  console.log("Active accounts:", activeAccounts)
  // Ledger-filtered accounts for each form
  const drawalFilteredAccounts = drawalLedger
    ? activeAccounts.filter(a => String(a.borrowing_head) === drawalLedger)
    : activeAccounts
  const repaymentFilteredAccounts = repaymentLedger
    ? activeAccounts.filter(a => String(a.borrowing_head) === repaymentLedger)
    : activeAccounts

  // Stats
  const totalSanctioned = accounts.reduce((sum, acc) => sum + parseFloat(acc.amount_sanctioned?.toString() || "0"), 0)
  const totalOutstanding = accounts.reduce((sum, acc) => sum + parseFloat(acc.ledger_balance?.toString() || "0"), 0)
  const activeCount = accounts.filter(a => a.status === "ACTIVE").length
  const closedCount = accounts.filter(a => a.status === "CLOSED").length

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-teal-100 text-teal-700",
      CLOSED: "bg-gray-100 text-gray-700",
      PENDING: "bg-orange-100 text-orange-700"
    }
    return colors[status?.toUpperCase()] || "bg-gray-100 text-gray-700"
  }

  const getTypeBadge = (type: string) => {
    if (type === "cash_credit") return "bg-blue-100 text-blue-700"
    return "bg-purple-100 text-purple-700"
  }

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
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Borrowing Accounts</h1>
                <p className="text-muted-foreground">
                  {user?.role === "admin"
                    ? "All branches - Manage borrowings, drawals, and repayments"
                    : `${user?.branch?.name || "Branch"} - Manage borrowings, drawals, and repayments`}
                </p>
              </div>
              <Button onClick={fetchAccounts} variant="outline" size="icon">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sanctioned</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSanctioned)}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <Landmark className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</p>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-3">
                      <TrendingDown className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Accounts</p>
                      <p className="text-2xl font-bold text-teal-600">{activeCount}</p>
                    </div>
                    <div className="rounded-lg bg-teal-50 p-3">
                      <CreditCard className="h-5 w-5 text-teal-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Closed Accounts</p>
                      <p className="text-2xl font-bold text-gray-600">{closedCount}</p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-3">
                      <CheckCircle2 className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                <TabsTrigger value="accounts" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Accounts
                </TabsTrigger>
                <TabsTrigger value="open" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Open Account
                </TabsTrigger>
                <TabsTrigger value="drawal" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Drawal
                </TabsTrigger>
                <TabsTrigger value="repayment" className="gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Repayment
                </TabsTrigger>
              </TabsList>

              {/* Accounts List Tab */}
              <TabsContent value="accounts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Borrowing Accounts</CardTitle>
                        <CardDescription>View and manage all borrowing accounts</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search accounts..."
                            className="pl-10 w-[200px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredAccounts.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No borrowing accounts found
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account No</TableHead>
                              <TableHead>Agency</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Sanctioned</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                              <TableHead className="text-center">Rate</TableHead>
                              <TableHead>Sanction Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAccounts.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell className="font-mono font-medium">{account.account_number}</TableCell>
                                <TableCell>{account.borrowing_agency || "---"}</TableCell>
                                <TableCell>
                                  <Badge className={getTypeBadge(account.type_of_borrowing)}>
                                    {account.type_of_borrowing === "cash_credit" ? "Cash Credit" : "Loan"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(account.amount_sanctioned)}
                                </TableCell>
                                <TableCell className="text-right font-medium text-orange-600">
                                  {formatCurrency(account.ledger_balance)}
                                </TableCell>
                                <TableCell className="text-center">{account.rate_of_interest}%</TableCell>
                                <TableCell>{formatDate(account.date_of_sanction)}</TableCell>
                                <TableCell>
                                  <Badge className={getStatusBadge(account.status)}>{account.status}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fetchTransactionHistory(account)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Account Opening Tab */}
              <TabsContent value="open" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Landmark className="h-5 w-5" />
                          Borrowing Details
                        </CardTitle>
                        <CardDescription>Enter the borrowing account information</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Type of Borrowing *</Label>
                            <Select value={typeOfBorrowing} onValueChange={setTypeOfBorrowing}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash_credit">Cash Credit (CC)</SelectItem>
                                <SelectItem value="loan">Term Loan</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Borrowing Head</Label>
                            <Select value={borrowingAgency} onValueChange={setBorrowingAgency}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select borrowings ledger" />
                              </SelectTrigger>
                              <SelectContent>
                                {ledgerAccounts.map((acc) => (
                                  <SelectItem key={acc.accountcode} value={acc.accountcode}>
                                    {acc.accountname}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Amount Sanctioned *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={amountSanctioned}
                                onChange={(e) => setAmountSanctioned(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Date of Sanction *</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="date"
                                className="pl-10"
                                value={dateOfSanction}
                                onChange={(e) => setDateOfSanction(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Rate of Interest (%)</Label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.01"
                                className="pl-10"
                                placeholder="0.00"
                                value={rateOfInterest}
                                onChange={(e) => setRateOfInterest(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Reference Number</Label>
                            <Input
                              placeholder="Loan/CC Reference"
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Purpose</Label>
                            <Input
                              placeholder="Purpose of borrowing"
                              value={purpose}
                              onChange={(e) => setPurpose(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Description</Label>
                            <Textarea
                              placeholder="Additional details..."
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Repayment Schedule
                        </CardTitle>
                        <CardDescription>Configure repayment terms</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Repayment Type</Label>
                            <Select value={repaymentType} onValueChange={setRepaymentType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                                <SelectItem value="YEARLY">Yearly</SelectItem>
                                <SelectItem value="BULLET">Bullet Payment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Number of Installments</Label>
                            <Input
                              type="number"
                              placeholder="e.g., 60"
                              value={numberOfInstallments}
                              onChange={(e) => setNumberOfInstallments(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Installment Amount</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={installmentAmount}
                                onChange={(e) => setInstallmentAmount(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Moratorium Period (Months)</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={moratoriumMonths}
                              onChange={(e) => setMoratoriumMonths(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Repayment Start Date</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="date"
                                className="pl-10"
                                value={repaymentStartDate}
                                onChange={(e) => setRepaymentStartDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-6">
                            <Switch
                              id="moratorium-interest"
                              checked={moratoriumInterest}
                              onCheckedChange={setMoratoriumInterest}
                            />
                            <Label htmlFor="moratorium-interest">Interest during moratorium</Label>
                          </div>
                        </div>

                        {formError && (
                          <p className="text-sm text-destructive">{formError}</p>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={resetAccountForm}>
                            Reset
                          </Button>
                          <Button onClick={submitAccountOpening} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary Card */}
                  <div>
                    <Card className="sticky top-6">
                      <CardHeader>
                        <CardTitle className="text-lg">Account Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Type</span>
                            <span className="font-medium">
                              {typeOfBorrowing === "cash_credit" ? "Cash Credit" : typeOfBorrowing === "loan" ? "Term Loan" : "---"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Agency</span>
                            <span className="font-medium">{borrowingAgency || "---"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sanctioned Amount</span>
                            <span className="font-medium">{amountSanctioned ? formatCurrency(amountSanctioned) : "---"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Interest Rate</span>
                            <span className="font-medium">{rateOfInterest ? `${rateOfInterest}%` : "---"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Repayment Type</span>
                            <span className="font-medium">{repaymentType}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Installments</span>
                            <span className="font-medium">{numberOfInstallments || "---"}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Drawal Tab */}
              <TabsContent value="drawal" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Record Drawal
                        </CardTitle>
                        <CardDescription>Record a drawdown from a borrowing account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Ledger *</Label>
                            <SearchableSelect
                              value={drawalLedger}
                              onValueChange={handleDrawalLedgerSelect}
                              placeholder="Select ledger account"
                              searchPlaceholder="Search ledger..."
                              options={ledgerAccounts.map((l) => ({
                                value: String(l.accountcode),
                                label: l.accountname,
                              }))}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Account *</Label>
                            <SearchableSelect
                              value={drawalAccount}
                              onValueChange={handleDrawalAccountSelect}
                              placeholder={drawalLedger ? "Select borrowing account" : "Select a ledger first"}
                              searchPlaceholder="Search by account no. or agency..."
                              disabled={!drawalLedger}
                              options={drawalFilteredAccounts.map((acc) => ({
                                value: acc.account_number,
                                label: `${acc.account_number} - ${acc.borrowing_agency || "N/A"} (${formatCurrency(acc.amount_sanctioned - (acc.ledger_balance || 0))} available)`,
                              }))}
                            />
                          </div>

                          {selectedDrawalAccount && (
                            <div className="sm:col-span-2 rounded-lg border border-border bg-muted/50 p-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Sanctioned:</span>
                                  <p className="font-medium">{formatCurrency(selectedDrawalAccount.amount_sanctioned)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Current Balance:</span>
                                  <p className="font-medium text-orange-600">{formatCurrency(selectedDrawalAccount.ledger_balance)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Available Limit:</span>
                                  <p className="font-medium text-teal-600">
                                    {formatCurrency(selectedDrawalAccount.amount_sanctioned - (selectedDrawalAccount.ledger_balance || 0))}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Interest Rate:</span>
                                  <p className="font-medium">{selectedDrawalAccount.rate_of_interest}%</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Drawal Amount *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={drawalAmount}
                                onChange={(e) => setDrawalAmount(e.target.value)}
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
                                value={drawalDate}
                                onChange={(e) => setDrawalDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Number</Label>
                            <Input
                              placeholder="Optional"
                              value={drawalVoucher}
                              onChange={(e) => setDrawalVoucher(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Type *</Label>
                            <Select value={drawalTransactionType} onValueChange={setDrawalTransactionType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select voucher type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="TRANSFER">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {formError && (
                          <p className="text-sm text-destructive">{formError}</p>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={resetDrawalForm}>
                            Reset
                          </Button>
                          <Button onClick={submitDrawal} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Drawal
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
                      <CardContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          Record drawdowns (disbursements) from your borrowing/cash credit accounts.
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                          <li>Select an active borrowing account</li>
                          <li>Enter the amount being drawn</li>
                          <li>Drawal cannot exceed available limit</li>
                          <li>Balance will be updated automatically</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Repayment Tab */}
              <TabsContent value="repayment" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingDown className="h-5 w-5" />
                          Record Repayment
                        </CardTitle>
                        <CardDescription>Record a repayment toward a borrowing account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Ledger *</Label>
                            <SearchableSelect
                              value={repaymentLedger}
                              onValueChange={handleRepaymentLedgerSelect}
                              placeholder="Select ledger account"
                              searchPlaceholder="Search ledger..."
                              options={ledgerAccounts.map((l) => ({
                                value: String(l.accountcode),
                                label: l.accountname,
                              }))}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Select Account *</Label>
                            <SearchableSelect
                              value={repaymentAccount}
                              onValueChange={handleRepaymentAccountSelect}
                              placeholder={repaymentLedger ? "Select borrowing account" : "Select a ledger first"}
                              searchPlaceholder="Search by account no. or agency..."
                              disabled={!repaymentLedger}
                              options={repaymentFilteredAccounts.map((acc) => ({
                                value: acc.account_number,
                                label: `${acc.account_number} - ${acc.borrowing_agency || "N/A"} (Balance: ${formatCurrency(acc.ledger_balance)})`,
                              }))}
                            />
                          </div>

                          {selectedRepaymentAccount && (
                            <div className="sm:col-span-2 rounded-lg border border-border bg-muted/50 p-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Outstanding Balance:</span>
                                  <p className="font-medium text-orange-600">{formatCurrency(selectedRepaymentAccount.ledger_balance)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Interest Rate:</span>
                                  <p className="font-medium">{selectedRepaymentAccount.rate_of_interest}%</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Installment Amount:</span>
                                  <p className="font-medium">{selectedRepaymentAccount.installment_amount ? formatCurrency(selectedRepaymentAccount.installment_amount) : "---"}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Repayment Type:</span>
                                  <p className="font-medium">{selectedRepaymentAccount.repayment_type || "---"}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Total Repayment Amount *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={repaymentAmount}
                                onChange={(e) => setRepaymentAmount(e.target.value)}
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
                                value={repaymentDate}
                                onChange={(e) => setRepaymentDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Interest Amount</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={interestAmountPaid}
                                onChange={(e) => setInterestAmountPaid(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Principal Amount (Auto)</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10 bg-muted"
                                placeholder="0.00"
                                value={principalAmount}
                                readOnly
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Penal Interest</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={penalInterestAmount}
                                onChange={(e) => setPenalInterestAmount(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Other Charges</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                className="pl-10"
                                placeholder="0.00"
                                value={chargeAmount}
                                onChange={(e) => setChargeAmount(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Number</Label>
                            <Input
                              placeholder="Optional"
                              value={repaymentVoucher}
                              onChange={(e) => setRepaymentVoucher(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Voucher Type *</Label>
                            <Select value={repaymentTransactionType} onValueChange={setRepaymentTransactionType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select voucher type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="TRANSFER">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {formError && (
                          <p className="text-sm text-destructive">{formError}</p>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={resetRepaymentForm}>
                            Reset
                          </Button>
                          <Button onClick={submitRepayment} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Repayment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Payment Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Payment</span>
                            <span className="font-medium">{repaymentAmount ? formatCurrency(repaymentAmount) : "---"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Interest</span>
                            <span className="font-medium text-orange-600">{interestAmountPaid ? formatCurrency(interestAmountPaid) : "---"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Penal Interest</span>
                            <span className="font-medium">{penalInterestAmount !== "0" ? formatCurrency(penalInterestAmount) : "---"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Other Charges</span>
                            <span className="font-medium">{chargeAmount !== "0" ? formatCurrency(chargeAmount) : "---"}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Principal</span>
                            <span className="text-teal-600">{principalAmount ? formatCurrency(principalAmount) : "---"}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Transaction History Dialog */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Transaction History - {selectedAccountForHistory?.account_number}</DialogTitle>
                  <DialogDescription>
                    {selectedAccountForHistory?.borrowing_agency || "Borrowing Account"} | Balance: {formatCurrency(selectedAccountForHistory?.ledger_balance || 0)}
                  </DialogDescription>
                </DialogHeader>

                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No transactions found for this account
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Voucher</TableHead>
                        <TableHead className="text-right">Drawal</TableHead>
                        <TableHead className="text-right">Repayment</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>{formatDate(txn.transaction_date)}</TableCell>
                          <TableCell>
                            <Badge className={txn.transaction_type === "drawal" ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700"}>
                              {txn.transaction_type === "drawal" ? "Drawal" : "Repayment"}
                            </Badge>
                          </TableCell>
                          <TableCell>{txn.voucher_no || "---"}</TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {txn.drawal_amount > 0 ? formatCurrency(txn.drawal_amount) : "---"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-teal-600">
                            {txn.repayment_amount > 0 ? formatCurrency(txn.repayment_amount) : "---"}
                          </TableCell>
                          <TableCell className="text-right">
                            {txn.interest_amount > 0 ? formatCurrency(txn.interest_amount) : "---"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(txn.ledger_balance_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <AlertDialogTitle className="text-center text-lg">
                    {voucherDetails?.transactionType === "drawal"
                      ? "Drawal Recorded Successfully"
                      : "Repayment Recorded Successfully"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-xs">
                    GL batch created and pending approval
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {voucherDetails && (
                  <div className="space-y-3 py-2">
                    {/* Voucher header band */}
                    <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2 text-sm">
                      <span className="font-semibold text-foreground">
                        Voucher&nbsp;#{voucherDetails.voucherNo}
                      </span>
                      <span className="text-muted-foreground">
                        Batch&nbsp;#{voucherDetails.batchId}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="rounded-lg border divide-y text-sm">
                      {[
                        { label: "Date", value: formatDate(voucherDetails.transactionDate) },
                        { label: "Voucher Type", value: voucherDetails.voucherType },
                        { label: "Ledger", value: voucherDetails.ledgerName },
                        { label: "Account No.", value: voucherDetails.accountNumber },
                        ...(voucherDetails.borrowingAgency
                          ? [{ label: "Agency", value: voucherDetails.borrowingAgency }]
                          : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between px-4 py-2">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">{value}</span>
                        </div>
                      ))}

                      {/* Drawal amount */}
                      {voucherDetails.transactionType === "drawal" && (
                        <div className="flex justify-between px-4 py-2">
                          <span className="text-muted-foreground">Drawal Amount</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(voucherDetails.drawalAmount!)}
                          </span>
                        </div>
                      )}

                      {/* Repayment breakdown */}
                      {voucherDetails.transactionType === "repayment" && (
                        <>
                          <div className="flex justify-between px-4 py-2">
                            <span className="text-muted-foreground">Total Repayment</span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(voucherDetails.repaymentAmount!)}
                            </span>
                          </div>
                          <div className="flex justify-between px-4 py-2">
                            <span className="text-muted-foreground">Principal Paid</span>
                            <span className="font-medium text-teal-600">
                              {formatCurrency(voucherDetails.principalPaid!)}
                            </span>
                          </div>
                          <div className="flex justify-between px-4 py-2">
                            <span className="text-muted-foreground">Interest Paid</span>
                            <span className="font-medium text-orange-600">
                              {formatCurrency(voucherDetails.interestPaid!)}
                            </span>
                          </div>
                          {(voucherDetails.otherCharges ?? 0) > 0 && (
                            <div className="flex justify-between px-4 py-2">
                              <span className="text-muted-foreground">Other Charges</span>
                              <span className="font-medium">
                                {formatCurrency(voucherDetails.otherCharges!)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* New balance — always shown */}
                      <div className="flex justify-between bg-muted/40 px-4 py-2">
                        <span className="font-medium text-foreground">New Balance</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(voucherDetails.newBalance)}
                        </span>
                      </div>
                    </div>

                    {/* Account closed badge */}
                    {voucherDetails.accountStatus === "CLOSED" && (
                      <div className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Account has been fully closed
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
