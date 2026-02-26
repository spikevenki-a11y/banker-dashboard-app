"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import {
  FileText,
  TrendingUp,
  Users,
  Wallet,
  CreditCard,
  PiggyBank,
  DollarSign,
  AlertCircle,
  FileBarChart,
  Download,
  Search,
  Printer,
  Eye,
  Loader2,
  XCircle,
} from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

const reportCategories = [
  {
    title: "Member Reports",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    reports: [
      { name: "Member List Report", description: "Comprehensive list of all members with details" },
      //{ name: "New Member Registration", description: "Recently registered members" },
      //{ name: "Active Members Report", description: "Currently active member accounts" },
      { name: "Inactive Members Report", description: "Dormant and inactive accounts" },
      { name: "Member KYC Status", description: "KYC verification status of all members" },
    ],
  },
  {
    title: "Savings Reports",
    icon: Wallet,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    reports: [
      { name: "Savings Account Statement", description: "Detailed account statements with transactions" },
      { name: "Savings Outstanding Report", description: "Outstanding balance summary of all accounts" },
      { name: "Deposit Summary", description: "Total deposits by period" },
      { name: "Withdrawal Summary", description: "Total withdrawals by period" },
      { name: "Interest Calculation Report", description: "Interest earned and credited details" },
      { name: "Dormant Accounts", description: "Accounts with no activity" },
    ],
  },
  {
    title: "Fixed Deposit Reports",
    icon: PiggyBank,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    reports: [
      { name: "FD Maturity Report", description: "Upcoming and matured fixed deposits" },
      { name: "Outstanding FD Report", description: "All currently active fixed deposits" },
      { name: "FD Interest Report", description: "Interest calculations and payouts" },
      { name: "FD Closure Report", description: "Closed and premature closure details" },
      { name: "FD Renewal Report", description: "Renewed fixed deposit details" },
    ],
  },
  {
    title: "Loan Reports",
    icon: CreditCard,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    reports: [
      { name: "Loan Disbursement Report", description: "All disbursed loans by period" },
      { name: "Loan Outstanding Report", description: "Current outstanding loan balances" },
      //{ name: "EMI Collection Report", description: "EMI payments collected" },
      { name: "Overdue Loans Report", description: "Loans with overdue payments" },
      { name: "Loan Closure Report", description: "Fully repaid and closed loans" },
      { name: "NPA Report", description: "Non-performing assets analysis" },
      //{ name: "Loan Application Status", description: "Pending and approved applications" },
    ],
  },
  {
    title: "Financial Reports",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
    reports: [
      { name: "Balance Sheet", description: "Assets, liabilities, and equity statement" },
      { name: "Profit & Loss Statement", description: "Income and expenses summary" },
      { name: "Cash Flow Statement", description: "Cash inflows and outflows" },
      { name: "Trial Balance", description: "Debit and credit balance verification" },
      { name: "Income & Expenditure", description: "Detailed income and expense breakdown" },
      { name: "Daily Cash Report", description: "Daily cash position and transactions" },
    ],
  },
  {
    title: "Transaction Reports",
    icon: FileText,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    reports: [
      { name: "Daily Transaction Report", description: "All transactions for the day" },
      { name: "Print Voucher", description: "Print voucher by date and voucher number" },
      { name: "Transaction Summary by Type", description: "Grouped by transaction type" },
      { name: "Branch-wise Transactions", description: "Transactions by branch" },
      { name: "User Activity Report", description: "Transactions by staff member" },
      { name: "Failed Transactions", description: "Failed and rejected transactions" },
    ],
  },
  {
    title: "Compliance & Audit Reports",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    reports: [
      { name: "Audit Trail Report", description: "System activity and changes log" },
      { name: "Regulatory Compliance", description: "Compliance with banking regulations" },
      { name: "KYC Compliance Report", description: "KYC documentation status" },
      { name: "Large Transaction Report", description: "Transactions above threshold" },
      { name: "Suspicious Activity Report", description: "Flagged transactions for review" },
    ],
  },
  {
    title: "Share & Dividend Reports",
    icon: DollarSign,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    reports: [
      { name: "Share Register", description: "Member shareholding details" },
      { name: "Share Transaction Report", description: "Share deposits and withdrawals" },
      { name: "Dividend Distribution", description: "Dividend calculations and payouts" },
      { name: "Share Certificate Report", description: "Issued share certificates" },
    ],
  },
  {
    title: "Custom Reports",
    icon: FileBarChart,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    reports: [
      { name: "Custom Date Range Report", description: "Generate reports for specific periods" },
      { name: "Branch Performance", description: "Branch-wise performance metrics" },
      { name: "Age-wise Analysis", description: "Data analysis by time periods" },
      { name: "Comparative Analysis", description: "Period-over-period comparison" },
    ],
  },
]

// --- Number to words utility (Indian system) ---
function numberToWords(num: number): string {
  if (num === 0) return "Zero"
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  function convertGroup(n: number): string {
    if (n === 0) return ""
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertGroup(n % 100) : "")
  }

  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const remainder = Math.floor(num % 1000)
  const paise = Math.round((num % 1) * 100)

  let result = ""
  if (crore) result += convertGroup(crore) + " Crore "
  if (lakh) result += convertGroup(lakh) + " Lakh "
  if (thousand) result += convertGroup(thousand) + " Thousand "
  if (remainder) result += convertGroup(remainder)
  result = result.trim() + " Rupees"
  if (paise > 0) result += " and " + convertGroup(paise) + " Paise"
  result += " Only"
  return result
}

interface VoucherLine {
  id: string
  accountCode: number
  accountName: string
  refAccountId: string
  debitAmount: number
  creditAmount: number
  narration: string
}

interface VoucherData {
  voucher: {
    voucherNo: number
    batchId: number
    voucherType: string
    businessDate: string
    status: string
    createdAt: string
    approvedAt: string
    makerName: string
    makerEmpCode: string
    checkerName: string
    checkerEmpCode: string
  }
  lines: VoucherLine[]
  totals: { totalDebit: number; totalCredit: number }
  branch: {
    branchName: string
    bankName: string
    address: string
    city: string
    state: string
    postalCode: string
    phone: string
    email: string
  }
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<{
    category: string
    name: string
    description: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Print Voucher state
  const [printVoucherOpen, setPrintVoucherOpen] = useState(false)
  const [pvDate, setPvDate] = useState("")
  const [pvVoucherNo, setPvVoucherNo] = useState("")
  const [pvLoading, setPvLoading] = useState(false)
  const [pvError, setPvError] = useState("")
  const [pvData, setPvData] = useState<VoucherData | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  function handleReportClick(report: { name: string; description: string }, category: string) {
    if (report.name === "Print Voucher") {
      setPrintVoucherOpen(true)
      setPvDate("")
      setPvVoucherNo("")
      setPvError("")
      setPvData(null)
    } else {
      setSelectedReport({ category, name: report.name, description: report.description })
    }
  }

  async function fetchVoucher() {
    setPvError("")
    setPvData(null)

    if (!pvDate) {
      setPvError("Please select a date")
      return
    }
    if (!pvVoucherNo || isNaN(Number(pvVoucherNo))) {
      setPvError("Please enter a valid voucher number")
      return
    }

    setPvLoading(true)
    try {
      const res = await fetch(
        `/api/reports/print-voucher?voucherNo=${encodeURIComponent(pvVoucherNo)}&date=${encodeURIComponent(pvDate)}`
      )
      const data = await res.json()
      if (!res.ok) {
        setPvError(data.error || "Failed to fetch voucher")
        return
      }
      setPvData(data)
    } catch {
      setPvError("Network error. Please try again.")
    } finally {
      setPvLoading(false)
    }
  }

  function handlePrintVoucher() {
    if (!printRef.current) return
    const printContents = printRef.current.innerHTML
    const win = window.open("", "_blank", "width=800,height=600")
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher No. ${pvData?.voucher.voucherNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1a1a1a; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; font-size: 12px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
          .header h1 { font-size: 18px; font-weight: 700; }
          .header h2 { font-size: 14px; font-weight: 600; margin-top: 2px; }
          .header p { font-size: 11px; color: #6b7280; }
          .voucher-title { text-align: center; font-size: 15px; font-weight: 700; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
          .meta-row span { display: inline-block; }
          .amount-words { font-style: italic; margin: 10px 0; font-size: 12px; padding: 6px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 48px; font-size: 12px; }
          .signatures div { text-align: center; min-width: 140px; }
          .signatures .line { border-top: 1px solid #1a1a1a; padding-top: 4px; margin-top: 40px; }
          .footer-note { text-align: center; margin-top: 24px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
          tfoot td { font-weight: 700; background: #f3f4f6; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        ${printContents}
      </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  const filteredCategories = reportCategories
    .map((category) => ({
      ...category,
      reports: category.reports.filter(
        (report) =>
          report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.reports.length > 0)

  return (
    <DashboardWrapper>
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-pretty text-muted-foreground">Generate and download comprehensive banking reports</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search reports by name or category..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">No reports found</p>
            <p className="text-pretty text-sm text-muted-foreground">Try adjusting your search query</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <Card key={category.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${category.bgColor}`}>
                    <category.icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-balance">{category.title}</CardTitle>
                    <CardDescription className="text-pretty">
                      {category.reports.length} report{category.reports.length !== 1 ? "s" : ""} available
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {category.reports.map((report) => (
                    <button
                      key={report.name}
                      onClick={() => handleReportClick(report, category.title)}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {report.name === "Print Voucher" ? (
                        <Printer className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className="text-balance text-sm font-medium text-foreground">{report.name}</p>
                        <p className="text-pretty text-xs text-muted-foreground">{report.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generic Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">{selectedReport?.name}</DialogTitle>
            <DialogDescription className="text-pretty">{selectedReport?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Report Period</Label>
              <Select defaultValue="current-month">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="current-week">Current Week</SelectItem>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="current-year">Current Year</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Report Format</Label>
              <Select defaultValue="pdf">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="print">Print</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="detailed" className="rounded border-input" />
              <Label htmlFor="detailed" className="text-sm font-normal">
                Include detailed breakdown
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setSelectedReport(null)}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Voucher Dialog */}
      <Dialog open={printVoucherOpen} onOpenChange={(open) => { setPrintVoucherOpen(open); if (!open) { setPvData(null); setPvError(""); } }}>
        <DialogContent className={pvData ? "max-w-4xl max-h-[90vh] overflow-y-auto" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <Printer className="h-5 w-5" />
              Print Voucher
            </DialogTitle>
            <DialogDescription className="text-pretty">
              Enter the date and voucher number to retrieve and print the voucher.
            </DialogDescription>
          </DialogHeader>

          {/* Search form */}
          {!pvData && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="pv-date">Date <span className="text-destructive">*</span></Label>
                <Input
                  id="pv-date"
                  type="date"
                  value={pvDate}
                  onChange={(e) => setPvDate(e.target.value)}
                  disabled={pvLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pv-voucher">Voucher Number <span className="text-destructive">*</span></Label>
                <Input
                  id="pv-voucher"
                  type="text"
                  placeholder="e.g. 1, 2, 3..."
                  value={pvVoucherNo}
                  onChange={(e) => setPvVoucherNo(e.target.value.replace(/[^0-9]/g, ""))}
                  disabled={pvLoading}
                  onKeyDown={(e) => { if (e.key === "Enter") fetchVoucher() }}
                />
              </div>

              {pvError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{pvError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setPrintVoucherOpen(false)} disabled={pvLoading}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" onClick={fetchVoucher} disabled={pvLoading}>
                  {pvLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {pvLoading ? "Fetching..." : "Fetch Voucher"}
                </Button>
              </div>
            </div>
          )}

          {/* Voucher Preview */}
          {pvData && (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={() => { setPvData(null); setPvError(""); }}
                >
                  <Search className="h-4 w-4" />
                  New Search
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handlePrintVoucher}>
                  <Eye className="h-4 w-4" />
                  Preview / Print
                </Button>
                <Button size="sm" className="gap-2" onClick={handlePrintVoucher}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>

              {/* Printable Voucher Content */}
              <div
                ref={printRef}
                className="rounded-lg border border-border bg-card p-6 text-foreground"
              >
                {/* Header */}
                <div className="header mb-4 border-b-2 border-foreground pb-3 text-center">
                  <h1 className="text-lg font-bold">{pvData.branch.bankName}</h1>
                  <h2 className="text-sm font-semibold">{pvData.branch.branchName}</h2>
                  {pvData.branch.address && (
                    <p className="text-xs text-muted-foreground">
                      {[pvData.branch.address, pvData.branch.city, pvData.branch.state, pvData.branch.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {pvData.branch.phone && (
                    <p className="text-xs text-muted-foreground">
                      Ph: {pvData.branch.phone}
                      {pvData.branch.email ? ` | Email: ${pvData.branch.email}` : ""}
                    </p>
                  )}
                </div>

                {/* Voucher title */}
                <div className="voucher-title mb-3 text-center text-sm font-bold uppercase tracking-widest">
                  {pvData.voucher.voucherType === "CASH" ? "Cash Voucher" : "Transfer Voucher"}
                </div>

                {/* Meta info */}
                <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">Voucher No:</span>
                    <span className="font-semibold">{pvData.voucher.voucherNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">Batch No:</span>
                    <span className="font-semibold">{pvData.voucher.batchId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">Date:</span>
                    <span className="font-semibold">
                      {new Date(pvData.voucher.businessDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold text-green-700 border-green-300 bg-green-50">
                      {pvData.voucher.status}
                    </Badge>
                  </div>
                </div>

                {/* Transaction Lines Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24 text-xs">GL Code</TableHead>
                      <TableHead className="text-xs">Account Name</TableHead>
                      <TableHead className="text-xs">Ref A/c</TableHead>
                      <TableHead className="text-right text-xs">Debit (Rs.)</TableHead>
                      <TableHead className="text-right text-xs">Credit (Rs.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pvData.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-xs font-mono">{line.accountCode}</TableCell>
                        <TableCell className="text-xs">{line.accountName}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {line.refAccountId && line.refAccountId !== "0" ? line.refAccountId : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {line.debitAmount > 0
                            ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(line.debitAmount)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {line.creditAmount > 0
                            ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(line.creditAmount)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs font-bold">Total</TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono">
                        {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(pvData.totals.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono">
                        {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(pvData.totals.totalCredit)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>

                {/* Narration */}
                {pvData.lines[0]?.narration && (
                  <div className="mt-3 text-xs">
                    <span className="font-medium text-muted-foreground">Narration: </span>
                    <span>{pvData.lines[0].narration}</span>
                  </div>
                )}

                {/* Amount in words */}
                <div className="amount-words mt-3 rounded border border-border bg-muted/50 p-2 text-xs italic">
                  <span className="font-medium">Amount in words: </span>
                  {numberToWords(pvData.totals.totalDebit)}
                </div>

                {/* Signatures */}
                <div className="signatures mt-12 flex justify-between text-xs">
                  <div className="text-center">
                    <div className="line mt-10 border-t border-foreground pt-1">
                      Prepared By
                    </div>
                    <div className="text-muted-foreground">{pvData.voucher.makerName}</div>
                  </div>
                  <div className="text-center">
                    <div className="line mt-10 border-t border-foreground pt-1">
                      Approved By
                    </div>
                    <div className="text-muted-foreground">{pvData.voucher.checkerName}</div>
                  </div>
                  <div className="text-center">
                    <div className="line mt-10 border-t border-foreground pt-1">
                      Authorized Signatory
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="footer-note mt-6 border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
                  This is a computer-generated voucher. Printed on{" "}
                  {new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardWrapper>
  )
}
