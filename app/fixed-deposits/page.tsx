"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Eye, FileText, TrendingUp, Calendar, RefreshCw, Loader2, AlertCircle, Banknote } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DashboardWrapper } from "../_components/dashboard-wrapper"
import { useRouter } from "next/navigation"

type Deposit = {
  id: string
  accountNumber: string
  depositType: string
  depositTypeLabel: string
  membershipNo: string
  memberName: string
  openDate: string
  interestRate: number
  balance: number
  status: "active" | "matured" | "closed" | "premature"
  accountStatus: number
  closeDate: string | null
  schemeId: number
  schemeName: string
  depositAmount: number | null
  periodMonths: number | null
  periodDays: number | null
  maturityDate: string | null
  maturityAmount: number | null
  autoRenewal: boolean
  installmentAmount: number | null
  installmentFrequency: string | null
  totalInstallments: number | null
  paidInstallments: number | null
  dailyAmount: number | null
  collectionFrequency: string | null
}

type Stats = {
  total: number
  activeCount: number
  maturedCount: number
  totalBalance: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatCurrency(val: number | null | undefined) {
  if (val == null) return "--"
  return val.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
}

function formatDate(val: string | null | undefined) {
  if (!val) return "--"
  return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function FixedDepositsPage() {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"renew" | "premature" | "close" | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Build query string
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (typeFilter !== "all") params.set("type", typeFilter)
    return `/api/deposits/list?${params.toString()}`
  }, [debouncedSearch, statusFilter, typeFilter])

  const { data, error, isLoading, mutate } = useSWR<{ deposits: Deposit[]; stats: Stats }>(
    buildUrl(),
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  )

  const deposits = data?.deposits || []
  console.log(deposits)
  const stats = data?.stats || { total: 0, activeCount: 0, maturedCount: 0, totalBalance: 0 }

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Fixed Deposits</h1>
                <p className="text-muted-foreground">Manage fixed deposit accounts and maturity tracking</p>
              </div>
              <Button onClick={() => router.push("/fixed-deposits/create-deposit")} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Deposit
              </Button>
            </div>

            {/* Summary Stats Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Balance</h3>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-8 w-32" />
                    ) : (
                      <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(stats.totalBalance)}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-teal-50 p-3 dark:bg-teal-950">
                      <TrendingUp className="h-6 w-6 text-teal-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Active Deposits</h3>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-8 w-16" />
                    ) : (
                      <p className="mt-1 text-2xl font-bold text-foreground">{stats.activeCount}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950">
                      <Calendar className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Matured Deposits</h3>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-8 w-16" />
                    ) : (
                      <p className="mt-1 text-2xl font-bold text-foreground">{stats.maturedCount}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Accounts</h3>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-8 w-16" />
                    ) : (
                      <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by account number, member name, membership no, or scheme..."
                      className="pl-10"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {isLoading && searchInput && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="matured">Matured</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="premature">Premature</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="T">Term Deposit</SelectItem>
                        <SelectItem value="R">Recurring Deposit</SelectItem>
                        <SelectItem value="P">Pigmy Deposit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm text-destructive">Failed to load deposits. Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => mutate()}>
                      Retry
                    </Button>
                  </div>
                ) : isLoading && deposits.length === 0 ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : deposits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {searchInput || statusFilter !== "all" || typeFilter !== "all"
                        ? "No deposits found matching your search criteria."
                        : "No deposit accounts found. Create your first deposit to get started."}
                    </p>
                    {!searchInput && statusFilter === "all" && typeFilter === "all" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => router.push("/fixed-deposits/create-deposit")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Deposit
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account No</TableHead>
                        {/* <TableHead>Type</TableHead> */}
                        <TableHead>Member</TableHead>
                        <TableHead>Amount / Balance</TableHead>
                        <TableHead>Opened Date</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Interest Rate</TableHead>
                        <TableHead>Maturity Date</TableHead>
                        <TableHead>Maturity Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map((dep) => (
                        <TableRow key={dep.id}>
                          <TableCell className="font-mono font-medium text-sm">
                            {dep.accountNumber}
                            <div className="text-[10px] text-muted-foreground"> 
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{dep.depositType}</Badge>
                              
                            </div>
                          </TableCell>
                          {/* <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {dep.depositType === "TERM" ? "FD" : dep.depositType === "RECURRING" ? "RD" : "Pigmy"}
                            </Badge>
                          </TableCell> */}
                          <TableCell>
                            <div>
                              <div className="font-medium">{dep.memberName}</div>
                              <div className="text-xs text-muted-foreground">M# {dep.membershipNo}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {dep.depositType === "TERM"
                              ? formatCurrency(dep.depositAmount)
                              : dep.depositType === "RECURRING"
                                ? formatCurrency(dep.balance)
                                : formatCurrency(dep.balance)}
                            {dep.depositType === "RECURRING" && (
                              <div className="text-xs font-normal text-muted-foreground">
                                {dep.paidInstallments}/{dep.totalInstallments} paid - ({dep.installmentAmount})
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(dep.openDate)}</TableCell>
                          <TableCell>
                            {dep.periodMonths != null ? (
                              <span>
                                {dep.periodMonths}m {dep.periodDays ? `${dep.periodDays}d` : ""}
                              </span>
                            ) : (
                              "--"
                            )}
                          </TableCell>
                          <TableCell>{dep.interestRate}%</TableCell>
                          <TableCell>{formatDate(dep.maturityDate)}</TableCell>
                          <TableCell className="font-semibold text-teal-600">{dep.balance != 0 && (formatCurrency(dep.maturityAmount)) || 0}</TableCell>
                          <TableCell>
                            <Badge
                              variant={dep.status === "Active" ? "default" : "secondary"}
                              className={
                                dep.status === "Active"
                                  ? "bg-teal-100 text-teal-700"
                                  : dep.status === "Matured"
                                    ? "bg-orange-100 text-orange-700"
                                    : dep.status === "closed"
                                      ? "bg-gray-100 text-gray-700"
                                      : "bg-red-100 text-red-700"
                              }
                            >
                              {dep.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    router.push(`/fixed-deposits/view?account=${dep.accountNumber}`)
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {dep.status === "Matured" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedDeposit(dep)
                                      setActionType("renew")
                                      setIsActionDialogOpen(true)
                                    }}
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Renew
                                  </DropdownMenuItem>
                                )}
                                {( //dep.depositAmount != dep.balance && 
                                  <DropdownMenuItem
                                    onClick={() => {
                                      router.push(`/fixed-deposits/transactions?account=${dep.accountNumber}`)
                                    }}
                                  >
                                    <Banknote className="mr-2 h-4 w-4" />
                                    Transactions
                                  </DropdownMenuItem>
                                )}
                                {dep.status === "Matured" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      router.push(`/fixed-deposits/closure?account=${dep.accountNumber}`)
                                    }}
                                    className="text-red-600"
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Closure
                                  </DropdownMenuItem>
                                )}
                                {dep.status === "Active" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedDeposit(dep)
                                      setActionType("premature")
                                      setIsActionDialogOpen(true)
                                    }}
                                    className="text-blue-600"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Interest Withdrawal
                                  </DropdownMenuItem>
                                )}
                                {dep.status === "Active" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      router.push(`/fixed-deposits/closure?account=${dep.accountNumber}`)
                                    }}
                                    className="text-orange-600"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Premature Closure
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {!isLoading && deposits.length > 0 && (
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <p className="text-sm text-muted-foreground">
                      Showing {deposits.length} deposit{deposits.length !== 1 ? "s" : ""}
                    </p>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Dialog (Renew/Premature/Close) */}
            <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {actionType === "renew" ? "Renew Deposit" : actionType === "close" ? "Close Deposit" : "Premature Withdrawal"}
                  </DialogTitle>
                  <DialogDescription>
                    {actionType === "renew"
                      ? "Renew the matured deposit with new terms"
                      : actionType === "close"
                        ? "Close the matured deposit and settle amount"
                        : "Process premature withdrawal with penalty"}
                  </DialogDescription>
                </DialogHeader>
                {selectedDeposit && (
                  <div className="grid gap-4 py-4">
                    <div className="rounded-lg border border-border bg-muted p-3">
                      <p className="font-mono font-medium">{selectedDeposit.accountNumber}</p>
                      <p className="text-sm text-muted-foreground">{selectedDeposit.memberName}</p>
                      <p className="mt-2 text-lg font-semibold">
                        Balance: {formatCurrency(selectedDeposit.depositAmount || selectedDeposit.balance)}
                      </p>
                    </div>
                    {actionType === "renew" ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="new-tenure">New Tenure</Label>
                          <Select>
                            <SelectTrigger id="new-tenure">
                              <SelectValue placeholder="Select tenure" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6">6 months</SelectItem>
                              <SelectItem value="12">12 months</SelectItem>
                              <SelectItem value="18">18 months</SelectItem>
                              <SelectItem value="24">24 months</SelectItem>
                              <SelectItem value="36">36 months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="renew-amount">Renewal Amount</Label>
                          <Input
                            id="renew-amount"
                            type="number"
                            placeholder={String(selectedDeposit.maturityAmount || selectedDeposit.balance)}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
                          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                            {actionType === "close" ? "Closure Notice" : "Penalty Notice"}
                          </p>
                          <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                            {actionType === "close"
                              ? "The matured deposit will be closed and the amount will be settled."
                              : "Premature withdrawal will incur a penalty on the interest earned."}
                          </p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Deposit Amount:</span>
                            <span className="font-medium">{formatCurrency(selectedDeposit.depositAmount || selectedDeposit.balance)}</span>
                          </div>
                          {selectedDeposit.maturityAmount && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Maturity Amount:</span>
                              <span className="font-medium">
                                {selectedDeposit.depositAmount != 0 &&
                                  formatCurrency(selectedDeposit.maturityAmount)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Interest Rate:</span>
                            <span className="font-medium">{selectedDeposit.interestRate}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setIsActionDialogOpen(false)}
                    variant={actionType === "premature" ? "destructive" : "default"}
                  >
                    {actionType === "renew" ? "Renew Deposit" : actionType === "close" ? "Close Deposit" : "Process Withdrawal"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>


          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
