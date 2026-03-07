"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

interface Transaction {
  id: string
  transactionId: string | number
  date: string
  customerName: string
  accountNumber: string
  transactionType: string
  paymentMethod: string
  debitAmount: number
  creditAmount: number
  status: string
  narration: string
  module: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface Totals {
  totalDebit: number
  totalCredit: number
  totalTransactions: number
}

export default function DailyTransactionsReportPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  })
  const [totals, setTotals] = useState<Totals>({
    totalDebit: 0,
    totalCredit: 0,
    totalTransactions: 0,
  })
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filters
  const today = new Date().toISOString().split("T")[0]
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [transactionType, setTransactionType] = useState("ALL")
  const [paymentMethod, setPaymentMethod] = useState("ALL")
  const [pageSize, setPageSize] = useState("25")

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        page: page.toString(),
        pageSize,
        transactionType,
        paymentMethod,
      })

      const res = await fetch(`/api/reports/daily-transactions?${params}`)
      const data = await res.json()

      if (!res.ok) {
        console.error("Failed to fetch transactions:", data.error)
        return
      }

      setTransactions(data.transactions)
      setPagination(data.pagination)
      setTotals(data.totals)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, pageSize, transactionType, paymentMethod])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleSearch = () => {
    fetchTransactions(1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchTransactions(newPage)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    if (statusLower === "approved" || statusLower === "completed" || statusLower === "success") {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
    } else if (statusLower === "pending") {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
    } else if (statusLower === "rejected" || statusLower === "failed") {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
    }
    return <Badge variant="secondary">{status || "N/A"}</Badge>
  }

  const getModuleBadge = (module: string) => {
    switch (module) {
      case "SAVINGS":
        return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">Savings</Badge>
      case "SHARES":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Shares</Badge>
      case "LOANS":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Loans</Badge>
      case "DEPOSITS":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Deposits</Badge>
      default:
        return <Badge variant="secondary">{module}</Badge>
    }
  }

  const exportToCSV = async () => {
    setExporting(true)
    try {
      // Fetch all transactions for export
      const params = new URLSearchParams({
        fromDate,
        toDate,
        page: "1",
        pageSize: "10000", // Large number to get all records
        transactionType,
        paymentMethod,
      })

      const res = await fetch(`/api/reports/daily-transactions?${params}`)
      const data = await res.json()

      if (!res.ok) {
        console.error("Failed to fetch transactions for export:", data.error)
        return
      }

      const allTransactions = data.transactions as Transaction[]

      // Create CSV content
      const headers = [
        "Transaction ID",
        "Date",
        "Customer Name",
        "Account Number",
        "Module",
        "Transaction Type",
        "Payment Method",
        "Debit Amount",
        "Credit Amount",
        "Status",
        "Narration",
      ]

      const rows = allTransactions.map((t) => [
        t.transactionId,
        formatDate(t.date),
        t.customerName,
        t.accountNumber,
        t.module,
        t.transactionType,
        t.paymentMethod,
        t.debitAmount.toFixed(2),
        t.creditAmount.toFixed(2),
        t.status,
        `"${(t.narration || "").replace(/"/g, '""')}"`,
      ])

      // Add totals row
      rows.push([])
      rows.push(["TOTALS", "", "", "", "", "", "", data.totals.totalDebit.toFixed(2), data.totals.totalCredit.toFixed(2), "", ""])

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `daily-transactions-${fromDate}-to-${toDate}.csv`
      link.click()
    } catch (error) {
      console.error("Error exporting to CSV:", error)
    } finally {
      setExporting(false)
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      // Fetch all transactions for export
      const params = new URLSearchParams({
        fromDate,
        toDate,
        page: "1",
        pageSize: "10000",
        transactionType,
        paymentMethod,
      })

      const res = await fetch(`/api/reports/daily-transactions?${params}`)
      const data = await res.json()

      if (!res.ok) {
        console.error("Failed to fetch transactions for export:", data.error)
        return
      }

      const allTransactions = data.transactions as Transaction[]

      // Create Excel-compatible XML
      const excelContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="₹#,##0.00"/>
  </Style>
  <Style ss:ID="Total">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#F0F0F0" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Daily Transactions">
  <Table>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="150"/>
   <Column ss:Width="120"/>
   <Column ss:Width="80"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Column ss:Width="200"/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Transaction ID</Data></Cell>
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Customer Name</Data></Cell>
    <Cell><Data ss:Type="String">Account Number</Data></Cell>
    <Cell><Data ss:Type="String">Module</Data></Cell>
    <Cell><Data ss:Type="String">Transaction Type</Data></Cell>
    <Cell><Data ss:Type="String">Payment Method</Data></Cell>
    <Cell><Data ss:Type="String">Debit Amount</Data></Cell>
    <Cell><Data ss:Type="String">Credit Amount</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Narration</Data></Cell>
   </Row>
   ${allTransactions
     .map(
       (t) => `<Row>
    <Cell><Data ss:Type="String">${t.transactionId}</Data></Cell>
    <Cell><Data ss:Type="String">${formatDate(t.date)}</Data></Cell>
    <Cell><Data ss:Type="String">${t.customerName}</Data></Cell>
    <Cell><Data ss:Type="String">${t.accountNumber}</Data></Cell>
    <Cell><Data ss:Type="String">${t.module}</Data></Cell>
    <Cell><Data ss:Type="String">${t.transactionType}</Data></Cell>
    <Cell><Data ss:Type="String">${t.paymentMethod}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${t.debitAmount}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${t.creditAmount}</Data></Cell>
    <Cell><Data ss:Type="String">${t.status}</Data></Cell>
    <Cell><Data ss:Type="String">${(t.narration || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>
   </Row>`
     )
     .join("\n")}
   <Row ss:StyleID="Total">
    <Cell><Data ss:Type="String">TOTALS</Data></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.totals.totalDebit}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.totals.totalCredit}</Data></Cell>
    <Cell></Cell>
    <Cell></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`

      const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `daily-transactions-${fromDate}-to-${toDate}.xls`
      link.click()
    } catch (error) {
      console.error("Error exporting to Excel:", error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/reports">
              <Button variant="outline" size="icon" className="bg-transparent">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">Daily Transaction Report</h1>
              <p className="text-pretty text-muted-foreground">View and export daily transactions with filters</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-transparent gap-2" onClick={exportToCSV} disabled={exporting || loading}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export CSV
            </Button>
            <Button variant="outline" className="bg-transparent gap-2" onClick={exportToExcel} disabled={exporting || loading}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Export Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Filter transactions by date range, type, and payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={handleSearch} className="w-full gap-2" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-foreground">{totals.totalTransactions.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Debit</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalDebit)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Credit</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalCredit)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
                <p className={`text-2xl font-bold ${totals.totalCredit - totals.totalDebit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totals.totalCredit - totals.totalDebit)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                Showing {transactions.length} of {pagination.total} transactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Rows per page:</Label>
              <Select value={pageSize} onValueChange={(v) => { setPageSize(v); }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="bg-transparent" onClick={() => fetchTransactions(pagination.page)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">No transactions found</p>
                <p className="text-pretty text-sm text-muted-foreground">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Txn ID</TableHead>
                        <TableHead className="w-28">Date</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="w-20">Module</TableHead>
                        <TableHead className="w-28">Type</TableHead>
                        <TableHead className="w-24">Method</TableHead>
                        <TableHead className="text-right w-28">Debit</TableHead>
                        <TableHead className="text-right w-28">Credit</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-mono text-sm">{txn.transactionId}</TableCell>
                          <TableCell>{formatDate(txn.date)}</TableCell>
                          <TableCell className="font-medium">{txn.customerName}</TableCell>
                          <TableCell className="font-mono text-sm">{txn.accountNumber}</TableCell>
                          <TableCell>{getModuleBadge(txn.module)}</TableCell>
                          <TableCell>{txn.transactionType}</TableCell>
                          <TableCell>{txn.paymentMethod}</TableCell>
                          <TableCell className="text-right font-mono">
                            {txn.debitAmount > 0 ? (
                              <span className="text-red-600">{formatCurrency(txn.debitAmount)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {txn.creditAmount > 0 ? (
                              <span className="text-green-600">{formatCurrency(txn.creditAmount)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(txn.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={7}>Page Total</TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {formatCurrency(transactions.reduce((sum, t) => sum + t.debitAmount, 0))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {formatCurrency(transactions.reduce((sum, t) => sum + t.creditAmount, 0))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum: number
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i
                        } else {
                          pageNum = pagination.page - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? "default" : "outline"}
                            size="sm"
                            className={pagination.page !== pageNum ? "bg-transparent" : ""}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages || loading}
                    >
                      Next
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
