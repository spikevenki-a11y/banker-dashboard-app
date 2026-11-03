"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react"

type DepositAccount = {
  accountNumber: string
  depositType: string
  membershipNo: string
  memberName: string
  schemeName: string
  openDate: string | null
  closeDate: string | null
  interestRate: number
  balance: number
  amount: number | null
  maturityDate: string | null
  maturityAmount: number | null
  statusId: number
  statusName: string
}

type StatusCount = { statusId: number; statusName: string; count: number }

const TYPE_LABELS: Record<string, string> = {
  TERM: "Term",
  RECURRING: "Recurring",
  PIGMY: "Pigmy",
}

// ref_account_status ids → badge colours
const statusClass = (statusId: number) => {
  switch (statusId) {
    case 1:
      return "bg-teal-100 text-teal-700 hover:bg-teal-100"
    case 5:
      return "bg-orange-100 text-orange-700 hover:bg-orange-100"
    case 9:
      return "bg-gray-100 text-gray-700 hover:bg-gray-100"
    case 10:
      return "bg-red-100 text-red-700 hover:bg-red-100"
    default:
      return "bg-amber-100 text-amber-700 hover:bg-amber-100"
  }
}

const formatCurrency = (v: number | null) =>
  v == null ? "--" : `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// "YYYY-MM-DD" → "DD-MM-YYYY"
const formatDate = (v: string | null) => {
  const m = v ? /^(\d{4})-(\d{2})-(\d{2})/.exec(v) : null
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "--"
}

const PAGE_SIZE = 20

export default function DepositApplicationStatusPage() {
  const router = useRouter()

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [page, setPage] = useState(1)

  const [accounts, setAccounts] = useState<DepositAccount[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (typeFilter !== "all") params.set("type", typeFilter)
      const res = await fetch(`/api/deposits/application-status?${params}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load deposit accounts")
      setAccounts(data.accounts || [])
      setStatusCounts(data.statusCounts || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      setError(e.message || "Failed to load deposit accounts")
      setAccounts([])
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, typeFilter])

  useEffect(() => {
    load()
  }, [load])

  const allCount = statusCounts.reduce((s, c) => s + c.count, 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRow = Math.min(page * PAGE_SIZE, total)

  const chooseStatus = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/fixed-deposits")}
              className="h-10 w-10 bg-transparent"
              aria-label="Back to Fixed Deposits"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Application Status</h1>
              <p className="text-muted-foreground">All deposit accounts of the branch with their current status</p>
            </div>
          </div>
          <Button variant="outline" onClick={load} disabled={isLoading} className="gap-2 bg-transparent">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Status summary — click to filter */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => chooseStatus("all")}
            className={`rounded-lg border px-4 py-2 text-left transition-colors ${
              statusFilter === "all" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
            }`}
          >
            <p className="text-xs text-muted-foreground">All Accounts</p>
            <p className="text-lg font-bold">{allCount}</p>
          </button>
          {statusCounts.map((s) => (
            <button
              key={s.statusId}
              type="button"
              onClick={() => chooseStatus(String(s.statusId))}
              className={`rounded-lg border px-4 py-2 text-left transition-colors ${
                statusFilter === String(s.statusId) ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
              }`}
            >
              <p className="text-xs text-muted-foreground">{s.statusName}</p>
              <p className="text-lg font-bold">{s.count}</p>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5" />
                  Deposit Accounts
                </CardTitle>
                <CardDescription>Select View to open an account&apos;s full details</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Account no, member no, name or scheme"
                    className="pl-9"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={chooseStatus}
                >
                  <SelectTrigger className="sm:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statusCounts.map((s) => (
                      <SelectItem key={s.statusId} value={String(s.statusId)}>
                        {s.statusName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="sm:w-44">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="TERM">Term Deposit</SelectItem>
                    <SelectItem value="RECURRING">Recurring Deposit</SelectItem>
                    <SelectItem value="PIGMY">Pigmy Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={load}>
                  Retry
                </Button>
              </div>
            ) : isLoading && accounts.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search || statusFilter !== "all" || typeFilter !== "all"
                    ? "No deposit accounts match the search or filters."
                    : "No deposit accounts found."}
                </p>
              </div>
            ) : (
              <>
                <div className={`overflow-x-auto rounded-md border ${isLoading ? "opacity-60" : ""}`}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Account No</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Scheme</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Maturity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((a) => (
                        <TableRow key={a.accountNumber}>
                          <TableCell>
                            <div className="font-mono text-sm font-medium">{a.accountNumber}</div>
                            <Badge variant="outline" className="mt-0.5 px-1 py-0 text-[10px]">
                              {TYPE_LABELS[a.depositType] || a.depositType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{a.memberName}</div>
                            <div className="text-xs text-muted-foreground">M# {a.membershipNo}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {a.schemeName}
                            <div className="text-xs text-muted-foreground">{a.interestRate}% p.a.</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDate(a.openDate)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono text-sm">
                            {formatCurrency(a.amount)}
                            {a.depositType === "RECURRING" && a.amount != null && (
                              <div className="text-[10px] text-muted-foreground">per installment</div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono text-sm font-semibold">
                            {formatCurrency(a.balance)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(a.maturityDate)}
                            {a.maturityAmount != null && (
                              <div className="text-xs text-muted-foreground">{formatCurrency(a.maturityAmount)}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusClass(a.statusId)}>{a.statusName}</Badge>
                            {a.closeDate && (
                              <div className="mt-0.5 text-[10px] text-muted-foreground">on {formatDate(a.closeDate)}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 bg-transparent"
                              onClick={() => router.push(`/fixed-deposits/view?account=${encodeURIComponent(a.accountNumber)}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Showing {firstRow}–{lastRow} of {total}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      disabled={page <= 1 || isLoading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      disabled={page >= totalPages || isLoading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardWrapper>
  )
}
