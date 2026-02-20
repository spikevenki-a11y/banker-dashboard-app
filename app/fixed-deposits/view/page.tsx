"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Banknote,
  Calendar,
  TrendingUp,
  IndianRupee,
  FileText,
  User,
  Landmark,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
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
  voucher_no: string
  gl_batch_id: number
  batch_status: string
  voucher_type: string
  created_at: string
}

const statusMap: Record<number, string> = {
  1: "Active",
  2: "Matured",
  3: "Closed",
  4: "Premature",
}

const typeMap: Record<string, string> = {
  T: "Term Deposit (FD)",
  TERM: "Term Deposit (FD)",
  R: "Recurring Deposit (RD)",
  RECURRING: "Recurring Deposit (RD)",
  P: "Pigmy Deposit",
  PIGMY: "Pigmy Deposit",
}

function formatCurrency(val: number | null | undefined) {
  if (val == null) return "--"
  return val.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
}

function formatDate(val: string | null | undefined) {
  if (!val) return "--"
  return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function getStatusColor(status: number) {
  switch (status) {
    case 1:
      return "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
    case 2:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
    case 3:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    case 4:
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    default:
      return ""
  }
}

function getDaysToMaturity(maturityDate: string | null) {
  if (!maturityDate) return null
  const now = new Date()
  const mat = new Date(maturityDate)
  const diff = Math.ceil((mat.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function ViewDepositDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountParam = searchParams.get("account")

  const [isLoading, setIsLoading] = useState(true)
  const [account, setAccount] = useState<DepositAccount | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (accountParam) {
      fetchAccountData(accountParam)
    } else {
      setIsLoading(false)
      setError("No account number provided.")
    }
  }, [accountParam])

  const fetchAccountData = async (acctNo: string) => {
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/deposits/transactions?account=${encodeURIComponent(acctNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok || !data.account) {
        setError(data.error || "Account not found.")
        return
      }
      setAccount(data.account)
      setTransactions(data.transactions || [])
      setTotalTransactions(data.total || 0)
    } catch {
      setError("Failed to load account details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardWrapper>
        <div className="flex h-screen overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-background p-6">
              <div className="mb-6 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
              <div className="mt-6 space-y-4">
                <Skeleton className="h-10 w-full max-w-md rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
            </main>
          </div>
        </div>
      </DashboardWrapper>
    )
  }

  if (error || !account) {
    return (
      <DashboardWrapper>
        <div className="flex h-screen overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-background p-6">
              <div className="mb-6 flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/fixed-deposits")}
                  className="h-10 w-10 bg-transparent"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Deposit Details</h1>
                  <p className="text-muted-foreground">View complete deposit account information</p>
                </div>
              </div>
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                  <FileText className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{error || "Account not found."}</p>
                  <Button variant="outline" size="sm" onClick={() => router.push("/fixed-deposits")}>
                    Back to Fixed Deposits
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </DashboardWrapper>
    )
  }

  const statusLabel = statusMap[account.accountStatus] || "Unknown"
  const typeLabel = typeMap[account.depositType] || account.depositType
  const isActive = account.accountStatus === 1
  const daysToMaturity = getDaysToMaturity(account.maturityDate)
  const progressPercent =
    account.totalInstallments && account.paidInstallments
      ? Math.round((account.paidInstallments / account.totalInstallments) * 100)
      : null

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/fixed-deposits")}
                  className="h-10 w-10 bg-transparent"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                      {account.accountNumber}
                    </h1>
                    <Badge className={getStatusColor(account.accountStatus)}>
                      {statusLabel}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {typeLabel} &middot; {account.memberName} &middot; M# {account.membershipNo}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAccountData(account.accountNumber)}
                  className="bg-transparent"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push(`/fixed-deposits/transactions?account=${account.accountNumber}`)}
                >
                  <Banknote className="mr-2 h-4 w-4" />
                  Transactions
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              {/* Balance */}
              <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-800 dark:bg-teal-950/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-teal-100 p-2.5 dark:bg-teal-900">
                      <IndianRupee className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Balance</p>
                      <p className="text-xl font-bold text-teal-700 dark:text-teal-400">{formatCurrency(account.balance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deposit Amount */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900">
                      <Banknote className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {account.depositType === "R" || account.depositType === "RECURRING"
                          ? "Installment"
                          : account.depositType === "P" || account.depositType === "PIGMY"
                            ? "Daily Amount"
                            : "Deposit Amount"}
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {account.depositType === "R" || account.depositType === "RECURRING"
                          ? formatCurrency(account.installmentAmount)
                          : account.depositType === "P" || account.depositType === "PIGMY"
                            ? formatCurrency(account.dailyAmount)
                            : formatCurrency(account.depositAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interest Rate */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Interest Rate</p>
                      <p className="text-xl font-bold text-foreground">{account.interestRate}% <span className="text-sm font-normal text-muted-foreground">p.a.</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Maturity */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2.5 dark:bg-indigo-900">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maturity Amount</p>
                      <p className="text-xl font-bold text-foreground">{formatCurrency(account.maturityAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Tabs */}
              <div className="lg:col-span-2">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Account Overview</TabsTrigger>
                    <TabsTrigger value="transactions">Transaction History</TabsTrigger>
                    <TabsTrigger value="scheme">Scheme Details</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 pt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Account Information</CardTitle>
                        <CardDescription>Core details of the deposit account</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                          <div>
                            <Label className="text-xs text-muted-foreground">Account Number</Label>
                            <p className="mt-1 font-mono text-sm font-semibold">{account.accountNumber}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Deposit Type</Label>
                            <p className="mt-1 text-sm font-medium">{typeLabel}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Member Name</Label>
                            <p className="mt-1 text-sm font-medium">{account.memberName}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Membership No</Label>
                            <p className="mt-1 font-mono text-sm font-semibold">{account.membershipNo}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Scheme</Label>
                            <p className="mt-1 text-sm font-medium">{account.schemeName}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Account Status</Label>
                            <div className="mt-1">
                              <Badge className={getStatusColor(account.accountStatus)}>
                                {statusLabel}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Opening Date</Label>
                            <p className="mt-1 text-sm font-medium">{formatDate(account.openDate)}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Interest Rate</Label>
                            <p className="mt-1 text-sm font-semibold text-teal-600">{account.interestRate}% p.a.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Balances Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Balance Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg border bg-muted/30 p-4 text-center">
                            <p className="text-xs text-muted-foreground">Clear Balance</p>
                            <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(account.balance)}</p>
                          </div>
                          <div className="rounded-lg border bg-muted/30 p-4 text-center">
                            <p className="text-xs text-muted-foreground">Unclear Balance</p>
                            <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(account.unclearBalance)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Term Deposit Specific */}
                    {(account.depositType === "T" || account.depositType === "TERM") && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Term Deposit Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                              <Label className="text-xs text-muted-foreground">Deposit Amount</Label>
                              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(account.depositAmount)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Tenure</Label>
                              <p className="mt-1 text-sm font-semibold">
                                {account.periodMonths != null
                                  ? `${account.periodMonths} months${account.periodDays ? ` ${account.periodDays} days` : ""}`
                                  : "--"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Maturity Date</Label>
                              <p className="mt-1 text-sm font-medium">{formatDate(account.maturityDate)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Maturity Amount</Label>
                              <p className="mt-1 text-lg font-bold text-teal-600">{formatCurrency(account.maturityAmount)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recurring Deposit Specific */}
                    {(account.depositType === "R" || account.depositType === "RECURRING") && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Recurring Deposit Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                              <Label className="text-xs text-muted-foreground">Installment Amount</Label>
                              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(account.installmentAmount)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Frequency</Label>
                              <p className="mt-1 text-sm font-semibold capitalize">{account.installmentFrequency || "--"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Installments Paid</Label>
                              <p className="mt-1 text-sm font-semibold">
                                {account.paidInstallments || 0} / {account.totalInstallments || 0}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Next Installment Date</Label>
                              <p className="mt-1 text-sm font-medium">{formatDate(account.nextInstallmentDate)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Maturity Date</Label>
                              <p className="mt-1 text-sm font-medium">{formatDate(account.maturityDate)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Maturity Amount</Label>
                              <p className="mt-1 text-lg font-bold text-teal-600">{formatCurrency(account.maturityAmount)}</p>
                            </div>
                          </div>
                          {progressPercent != null && (
                            <div className="mt-6">
                              <div className="mb-2 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Installment Progress</span>
                                <span className="font-semibold">{progressPercent}%</span>
                              </div>
                              <Progress value={progressPercent} className="h-2" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Pigmy Deposit Specific */}
                    {(account.depositType === "P" || account.depositType === "PIGMY") && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Pigmy Deposit Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                              <Label className="text-xs text-muted-foreground">Daily Amount</Label>
                              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(account.dailyAmount)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Collection Frequency</Label>
                              <p className="mt-1 text-sm font-semibold capitalize">{account.collectionFrequency || "--"}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Transactions Tab */}
                  <TabsContent value="transactions" className="space-y-4 pt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">Transaction History</CardTitle>
                            <CardDescription>
                              {totalTransactions} transaction{totalTransactions !== 1 ? "s" : ""} found
                            </CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/fixed-deposits/transactions?account=${account.accountNumber}`)}
                            className="bg-transparent"
                          >
                            <Banknote className="mr-2 h-4 w-4" />
                            New Transaction
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {transactions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                            <Clock className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Voucher</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Narration</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transactions.map((txn) => {
                                const isCredit = Number(txn.credit_amount) > 0
                                return (
                                  <TableRow key={txn.id}>
                                    <TableCell className="text-sm">{formatDate(txn.transaction_date)}</TableCell>
                                    <TableCell className="font-mono text-xs">{txn.voucher_no || "--"}</TableCell>
                                    <TableCell>
                                      <span className="text-xs">{txn.voucher_type || "--"}</span>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                                      {txn.narration || "--"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {Number(txn.debit_amount) > 0 ? (
                                        <span className="flex items-center justify-end gap-1 font-semibold text-red-600">
                                          <ArrowUpRight className="h-3 w-3" />
                                          {formatCurrency(Number(txn.debit_amount))}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">--</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {Number(txn.credit_amount) > 0 ? (
                                        <span className="flex items-center justify-end gap-1 font-semibold text-teal-600">
                                          <ArrowDownRight className="h-3 w-3" />
                                          {formatCurrency(Number(txn.credit_amount))}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">--</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={
                                          txn.batch_status === "COMPLETE"
                                            ? "border-teal-300 text-teal-700"
                                            : txn.batch_status === "PENDING"
                                              ? "border-amber-300 text-amber-700"
                                              : ""
                                        }
                                      >
                                        {txn.batch_status || "N/A"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Scheme Tab */}
                  <TabsContent value="scheme" className="space-y-4 pt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Scheme Information</CardTitle>
                        <CardDescription>Details about the deposit scheme applied to this account</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                          <div>
                            <Label className="text-xs text-muted-foreground">Scheme Name</Label>
                            <p className="mt-1 text-sm font-semibold">{account.schemeName}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Scheme ID</Label>
                            <p className="mt-1 font-mono text-sm font-medium">{account.schemeId}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Interest Rate</Label>
                            <p className="mt-1 text-sm font-semibold text-teal-600">{account.interestRate}% p.a.</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Deposit GL Account</Label>
                            <p className="mt-1 font-mono text-sm font-medium">{account.depositGlAccount || "--"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Member Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.memberName}</CardTitle>
                        <CardDescription className="font-mono text-xs">M# {account.membershipNo}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Deposit Type</span>
                      <Badge variant="outline" className="text-xs">
                        {account.depositType === "T" || account.depositType === "TERM"
                          ? "FD"
                          : account.depositType === "R" || account.depositType === "RECURRING"
                            ? "RD"
                            : "Pigmy"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Scheme</span>
                      <span className="text-xs font-medium">{account.schemeName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Opened</span>
                      <span className="text-xs font-medium">{formatDate(account.openDate)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Maturity Info Card */}
                {account.maturityDate && (
                  <Card className={
                    isActive && daysToMaturity != null && daysToMaturity <= 30
                      ? "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/30"
                      : ""
                  }>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Maturity Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Maturity Date</span>
                        <span className="text-sm font-semibold">{formatDate(account.maturityDate)}</span>
                      </div>
                      {account.maturityAmount && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Maturity Amount</span>
                          <span className="text-sm font-bold text-teal-600">{formatCurrency(account.maturityAmount)}</span>
                        </div>
                      )}
                      {isActive && daysToMaturity != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Days to Maturity</span>
                          <Badge
                            variant="outline"
                            className={
                              daysToMaturity <= 0
                                ? "border-red-300 text-red-700"
                                : daysToMaturity <= 30
                                  ? "border-amber-300 text-amber-700"
                                  : "border-teal-300 text-teal-700"
                            }
                          >
                            {daysToMaturity <= 0 ? "Matured" : `${daysToMaturity} days`}
                          </Badge>
                        </div>
                      )}
                      {account.periodMonths != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Tenure</span>
                          <span className="text-xs font-medium">
                            {account.periodMonths}m {account.periodDays ? `${account.periodDays}d` : ""}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* RD Progress Card */}
                {(account.depositType === "R" || account.depositType === "RECURRING") &&
                  account.totalInstallments && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Installment Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="font-semibold">
                            {account.paidInstallments || 0} / {account.totalInstallments}
                          </span>
                        </div>
                        <Progress value={progressPercent || 0} className="h-2.5" />
                        {account.nextInstallmentDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Next Due</span>
                            <span className="text-xs font-medium">{formatDate(account.nextInstallmentDate)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      size="sm"
                      onClick={() => router.push(`/fixed-deposits/transactions?account=${account.accountNumber}`)}
                    >
                      <Banknote className="mr-2 h-4 w-4" />
                      Process Transaction
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      size="sm"
                      onClick={() => router.push("/fixed-deposits")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Back to Deposits List
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
