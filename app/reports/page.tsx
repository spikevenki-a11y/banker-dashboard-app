"use client"

import { formatDate } from "@/lib/date-format"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  TrendingUp,
  Users,
  Wallet,
  CreditCard,
  PiggyBank,
  DollarSign,
  BookOpen,
  Download,
  Search,
  Printer,
  Loader2,
  XCircle,
} from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"
import { buildVoucherDocument, type VoucherPrintData } from "@/lib/print/voucher"
import { printHtml } from "@/lib/print/print-html"
import { downloadHtmlAsPdf } from "@/lib/print/html-to-pdf"

const reportCategories = [
  {
    title: "Member Reports",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    reports: [
      { name: "Member List Report",    description: "Comprehensive list of all members with details",  href: "/reports/members?type=all" },
      { name: "Inactive Members Report", description: "Dormant and inactive accounts",                 href: "/reports/members?type=inactive" },
      { name: "Member KYC Status",     description: "KYC verification status of all members",          href: "/reports/members?type=kyc" },
    ],
  },
  {
    title: "Savings Reports",
    icon: Wallet,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    reports: [
      { name: "Savings Account Statement",  description: "Detailed account statements with transactions", href: "/reports/savings?type=statement" },
      { name: "Savings Outstanding Report", description: "Outstanding balance summary of all accounts",   href: "/reports/savings?type=outstanding" },
      { name: "Deposit Summary",            description: "Total deposits by period",                       href: "/reports/savings?type=deposits" },
      { name: "Withdrawal Summary",         description: "Total withdrawals by period",                    href: "/reports/savings?type=withdrawals" },
      { name: "Dormant Accounts",           description: "Accounts with no activity in 180+ days",        href: "/reports/savings?type=dormant" },
    ],
  },
  {
    title: "Fixed Deposit Reports",
    icon: PiggyBank,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    reports: [
      { name: "FD Maturity Report",   description: "Upcoming and matured fixed deposits",        href: "/reports/deposits?type=maturity" },
      { name: "Outstanding FD Report", description: "All currently active fixed deposits",        href: "/reports/deposits?type=outstanding" },
      { name: "FD Closure Report",    description: "Closed and premature closure details",        href: "/reports/deposits?type=closure" },
    ],
  },
  {
    title: "Loan Reports",
    icon: CreditCard,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    reports: [
      { name: "Loan Disbursement Report", description: "All disbursed loans by period",           href: "/reports/loans?type=disbursement" },
      { name: "Loan Outstanding Report",  description: "Current outstanding loan balances",        href: "/reports/loans?type=outstanding" },
      { name: "Overdue Loans Report",     description: "Loans with overdue payments",              href: "/reports/loans?type=overdue" },
      { name: "Loan Closure Report",      description: "Fully repaid and closed loans",            href: "/reports/loans?type=closure" },
      { name: "Loan Application",         description: "Print or download a member's loan application form", href: "/reports/loans/application" },
    ],
  },
  {
    title: "Finance & Accounting Reports",
    icon: BookOpen,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    reports: [
      { name: "General Ledger Report",    description: "All GL entries grouped by account code for the period",        href: "/reports/accounting?type=general-ledger" },
      { name: "Trial Balance",            description: "Net debit/credit balance per account",                          href: "/reports/accounting?type=trial-balance" },
      { name: "Profit & Loss Statement",  description: "Income and expense accounts for the period",                    href: "/reports/accounting?type=profit-loss" },
      { name: "Balance Sheet",            description: "Assets and liabilities as of a date",                           href: "/reports/accounting?type=balance-sheet" },
      { name: "Cash Book",                description: "All cash account transactions with running balance",             href: "/reports/accounting?type=cash-book" },
      { name: "Bank Book",                description: "All bank account transactions for the period",                  href: "/reports/accounting?type=bank-book" },
      { name: "Day Book",                 description: "All GL transactions for the selected date",               href: "/reports/accounting?type=day-book" },
      { name: "Journal Register",         description: "Voucher-level summary of all GL batches",                       href: "/reports/accounting?type=journal" },
      { name: "Expense Report",           description: "Transactions posted to expense accounts",                       href: "/reports/accounting?type=expense" },
      { name: "Income Report",            description: "Transactions posted to income accounts",                        href: "/reports/accounting?type=income" },
    ],
  },
  {
    title: "Financial Reports",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
    reports: [
      { name: "Trial Balance",            description: "Debit and credit balance verification (approved batches)", href: "/reports/financial?type=trial-balance" },
      { name: "Daily Cash Report",        description: "Cash account transactions by date range",                  href: "/reports/financial?type=cash" },
      { name: "Transaction Summary",      description: "GL batches grouped by voucher type",                       href: "/reports/financial?type=summary" },
    ],
  },
  {
    title: "Transaction Reports",
    icon: FileText,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    reports: [
      { name: "Daily Transaction Report", description: "All transactions for the day",             href: "/reports/daily-transactions" },
      { name: "Print Voucher",            description: "Print voucher by date and voucher number",  href: "" },
    ],
  },
  {
    title: "Share & Dividend Reports",
    icon: DollarSign,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    reports: [
      { name: "Share Register",         description: "Member shareholding details",                 href: "/reports/shares?type=register" },
      { name: "Share Transaction Report", description: "Share deposits and withdrawals by period",  href: "/reports/shares?type=transactions" },
    ],
  },
]


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
  member: VoucherPrintData["member"]
}

export default function ReportsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  // Print Voucher state
  const [printVoucherOpen, setPrintVoucherOpen] = useState(false)
  const [pvDate, setPvDate] = useState("")
  const [pvVoucherNo, setPvVoucherNo] = useState("")
  const [pvLoading, setPvLoading] = useState(false)
  const [pvError, setPvError] = useState("")
  const [pvData, setPvData] = useState<VoucherData | null>(null)

  function handleReportClick(report: { name: string; description: string; href: string }) {
    if (report.name === "Print Voucher") {
      setPrintVoucherOpen(true)
      setPvDate("")
      setPvVoucherNo("")
      setPvError("")
      setPvData(null)
    } else if (report.href) {
      router.push(report.href)
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

  const voucherHtml = useMemo(() => (pvData ? buildVoucherDocument(pvData) : ""), [pvData])
  const [pvDownloading, setPvDownloading] = useState(false)

  function handlePrintVoucher() {
    if (voucherHtml) printHtml(voucherHtml)
  }

  async function handleDownloadVoucher() {
    if (!voucherHtml || !pvData) return
    setPvDownloading(true)
    try {
      await downloadHtmlAsPdf(voucherHtml, `Voucher_${pvData.voucher.voucherNo}_${formatDate(pvData.voucher.businessDate)}.pdf`)
    } catch (error) {
      console.error("Voucher PDF download failed:", error)
      setPvError("Could not create the PDF. Please try again.")
    } finally {
      setPvDownloading(false)
    }
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
                      onClick={() => handleReportClick(report)}
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
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button size="sm" className="gap-2" onClick={handleDownloadVoucher} disabled={pvDownloading}>
                  {pvDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {pvDownloading ? "Preparing PDF..." : "Download PDF"}
                </Button>
              </div>

              {pvError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{pvError}</AlertDescription>
                </Alert>
              )}

              {/* Voucher preview: the same HTML that is printed and saved as PDF */}
              <iframe
                title={`Voucher No. ${pvData.voucher.voucherNo}`}
                srcDoc={voucherHtml}
                className="h-[70vh] w-full rounded-lg border border-border bg-white"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardWrapper>
  )
}
