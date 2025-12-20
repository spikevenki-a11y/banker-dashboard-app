"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"

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

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<{
    category: string
    name: string
    description: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

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
                      onClick={() =>
                        setSelectedReport({
                          category: category.title,
                          name: report.name,
                          description: report.description,
                        })
                      }
                      className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
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
    </div>
  )
}
