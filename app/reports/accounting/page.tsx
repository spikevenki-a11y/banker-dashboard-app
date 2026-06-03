"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Printer, Loader2, Search, BookOpen, TrendingUp, TrendingDown, FileDown } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { useBranchInfo } from "../_components/use-branch-info"
import { openPrintWindow } from "../_components/open-print-window"
import { downloadPdf } from "../_components/download-pdf"

const fmt = (n: number | string | null | undefined) =>
  Number(n || 0) === 0
    ? "—"
    : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtAmt = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const REPORT_META: Record<string, { label: string; description: string; isSingleDate?: boolean }> = {
  "general-ledger": { label: "General Ledger Report",    description: "All GL entries grouped by account code" },
  "trial-balance":  { label: "Trial Balance",            description: "Net debit/credit balance per account" },
  "profit-loss":    { label: "Profit & Loss Statement",  description: "Income and expense accounts for the period" },
  "balance-sheet":  { label: "Balance Sheet",            description: "Assets and liabilities as of date", isSingleDate: true },
  "cash-book":      { label: "Cash Book",                description: "All cash account transactions with running balance" },
  "bank-book":      { label: "Bank Book",                description: "All bank account transactions" },
  "day-book":       { label: "Day Book",                 description: "All GL transactions for the selected date range" },
  "journal":        { label: "Journal Register",         description: "Voucher-level summary of all GL batches" },
  "expense":        { label: "Expense Report",           description: "Transactions posted to expense accounts" },
  "income":         { label: "Income Report",            description: "Transactions posted to income accounts" },
}

function AccountingReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "general-ledger"
  const meta = REPORT_META[type] || REPORT_META["general-ledger"]

  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [rows, setRows] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fetched, setFetched] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const branchInfo = useBranchInfo()
  const openTabRef = useRef(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  async function fetchReport() {
    if (!fromDate) { setError("Please select a from date"); return }
    openTabRef.current = false
    setLoading(true); setError(""); setRows([]); setSummary(null); setFetched(false)
    try {
      const p = new URLSearchParams({ type, from_date: fromDate, to_date: toDate || fromDate })
      const res = await fetch(`/api/reports/accounting?${p}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to load report"); return }
      setRows(data.rows || [])
      setSummary(data.summary || null)
      openTabRef.current = true
      setFetched(true)
    } catch { setError("Network error. Please try again.") }
    finally { setLoading(false) }
  }

  function handlePrint() {
    if (!printRef.current) return
    openPrintWindow(meta.label, dateLabel, branchInfo, printRef.current.innerHTML)
  }

  const dateLabel = meta.isSingleDate
    ? `As of ${fmtDate(toDate || fromDate)}`
    : fromDate && toDate
    ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}`
    : fromDate
    ? `${fmtDate(fromDate)}`
    : ""

  async function handleDownloadPdf() {
    if (!printRef.current) return
    setPdfLoading(true)
    try {
      await downloadPdf(meta.label, dateLabel, branchInfo, printRef.current.innerHTML)
    } finally { setPdfLoading(false) }
  }

  useEffect(() => {
    if (!openTabRef.current || !fetched || !printRef.current || rows.length === 0) return
    openTabRef.current = false
    openPrintWindow(meta.label, dateLabel, branchInfo, printRef.current.innerHTML, false)
  }, [fetched, rows]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardWrapper>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/reports")} className="h-10 w-10 bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{meta.label}</h1>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </div>
          {fetched && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint} className="gap-2 bg-transparent">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading} className="gap-2 bg-transparent">
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {pdfLoading ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{meta.isSingleDate ? "As of Date" : "From Date"} *</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
              </div>
              {!meta.isSingleDate && (
                <div className="space-y-1">
                  <Label className="text-xs">To Date</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                </div>
              )}
              <Button onClick={fetchReport} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Loading..." : "Generate"}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {/* Report output */}
        {fetched && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" />
                  {meta.label}
                  {dateLabel && <span className="text-sm font-normal text-muted-foreground">— {dateLabel}</span>}
                </CardTitle>
                <Badge variant="outline">{rows.length} {rows.length === 1 ? "row" : "rows"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={printRef}>
                {/* Print header (hidden on screen via CSS, visible when printed) */}
                <div className="hidden print:block px-4 pb-2 text-center">
                  <h1>{meta.label}</h1>
                  <h2>{dateLabel}</h2>
                </div>

                {rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BookOpen className="h-12 w-12 opacity-30 mb-3" />
                    <p>No data found for the selected period</p>
                  </div>
                ) : (
                  <ReportTable type={type} rows={rows} summary={summary} />
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardWrapper>
  )
}

function ReportTable({ type, rows, summary }: { type: string; rows: any[]; summary: any }) {
  switch (type) {
    case "general-ledger":
    case "day-book":
      return <GLTable rows={rows} summary={summary} showAccount={type === "day-book"} />

    case "trial-balance":
      return <TrialBalanceTable rows={rows} summary={summary} />

    case "profit-loss":
      return <PLTable rows={rows} summary={summary} />

    case "balance-sheet":
      return <BalanceSheetTable rows={rows} summary={summary} />

    case "cash-book":
      return <CashBookTable rows={rows} summary={summary} />

    case "bank-book":
      return <BankBookTable rows={rows} summary={summary} />

    case "journal":
      return <JournalTable rows={rows} summary={summary} />

    case "expense":
    case "income":
      return <IncomeExpenseTable rows={rows} summary={summary} type={type} />

    default:
      return null
  }
}

/* ── General Ledger / Day Book ─────────────────────────────────────────── */
function GLTable({ rows, summary, showAccount }: { rows: any[]; summary: any; showAccount?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Voucher</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            {showAccount && <TableHead className="text-xs">Batch</TableHead>}
            <TableHead className="text-xs font-mono">Account Code</TableHead>
            <TableHead className="text-xs">Account Name</TableHead>
            <TableHead className="text-xs">Narration</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-right">Debit (₹)</TableHead>
            <TableHead className="text-xs text-right">Credit (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.business_date)}</TableCell>
              <TableCell className="text-xs font-mono">{r.voucher_no}</TableCell>
              <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.voucher_type}</Badge></TableCell>
              {showAccount && <TableCell className="text-xs font-mono">{r.batch_id}</TableCell>}
              <TableCell className="text-xs font-mono">{r.accountcode}</TableCell>
              <TableCell className="text-xs">{r.accountname || "—"}</TableCell>
              <TableCell className="text-xs max-w-48 truncate">{r.narration || "—"}</TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className={`text-[10px] ${r.status === "APPROVED" ? "text-teal-700 border-teal-300" : "text-amber-700 border-amber-300"}`}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.debit_amount)}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.credit_amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={showAccount ? 8 : 7} className="text-xs font-bold">Total ({summary?.entries || rows.length} entries)</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.totalDebit)}</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.totalCredit)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

/* ── Trial Balance ─────────────────────────────────────────────────────── */
function TrialBalanceTable({ rows, summary }: { rows: any[]; summary: any }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-mono">Account Code</TableHead>
            <TableHead className="text-xs">Account Name</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs text-right">Gross Debit (₹)</TableHead>
            <TableHead className="text-xs text-right">Gross Credit (₹)</TableHead>
            <TableHead className="text-xs text-right">Net Debit (₹)</TableHead>
            <TableHead className="text-xs text-right">Net Credit (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const typeName = ["", "Liability", "Asset", "Income", "Expense"][Number(r.accounttypecode)] || r.accounttypecode
            return (
              <TableRow key={i} className="hover:bg-muted/30">
                <TableCell className="text-xs font-mono">{r.accountcode}</TableCell>
                <TableCell className="text-xs">{r.accountname || "—"}</TableCell>
                <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{typeName}</Badge></TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(r.total_debit)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(r.total_credit)}</TableCell>
                <TableCell className="text-xs text-right font-mono font-semibold text-red-600">{fmt(r.net_debit)}</TableCell>
                <TableCell className="text-xs text-right font-mono font-semibold text-teal-600">{fmt(r.net_credit)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} className="text-xs font-bold">Total</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.totalDebit)}</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.totalCredit)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

/* ── Profit & Loss ─────────────────────────────────────────────────────── */
function PLTable({ rows, summary }: { rows: any[]; summary: any }) {
  const income  = rows.filter((r) => Number(r.accounttypecode) === 3)
  const expense = rows.filter((r) => Number(r.accounttypecode) === 4)
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-mono">Account Code</TableHead>
            <TableHead className="text-xs">Account Name</TableHead>
            <TableHead className="text-xs text-right">Debit (₹)</TableHead>
            <TableHead className="text-xs text-right">Credit (₹)</TableHead>
            <TableHead className="text-xs text-right">Net Amount (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-teal-50 dark:bg-teal-950/20">
            <TableCell colSpan={5} className="text-xs font-bold text-teal-700 py-2 pl-4">INCOME</TableCell>
          </TableRow>
          {income.map((r, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="text-xs font-mono pl-8">{r.accountcode}</TableCell>
              <TableCell className="text-xs">{r.accountname}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.total_debit)}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.total_credit)}</TableCell>
              <TableCell className="text-xs text-right font-mono font-semibold text-teal-700">{fmtAmt(r.net_amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-teal-50/60 dark:bg-teal-950/10">
            <TableCell colSpan={4} className="text-xs font-semibold text-right pr-4 py-1.5">Total Income</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono text-teal-700">{fmtAmt(summary?.totalIncome)}</TableCell>
          </TableRow>

          <TableRow className="bg-red-50 dark:bg-red-950/20">
            <TableCell colSpan={5} className="text-xs font-bold text-red-700 py-2 pl-4">EXPENSES</TableCell>
          </TableRow>
          {expense.map((r, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="text-xs font-mono pl-8">{r.accountcode}</TableCell>
              <TableCell className="text-xs">{r.accountname}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.total_debit)}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.total_credit)}</TableCell>
              <TableCell className="text-xs text-right font-mono font-semibold text-red-700">{fmtAmt(r.net_amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-red-50/60 dark:bg-red-950/10">
            <TableCell colSpan={4} className="text-xs font-semibold text-right pr-4 py-1.5">Total Expenses</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono text-red-700">{fmtAmt(summary?.totalExpense)}</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow className={summary?.netProfit >= 0 ? "bg-teal-100 dark:bg-teal-900/30" : "bg-red-100 dark:bg-red-900/30"}>
            <TableCell colSpan={4} className="text-sm font-bold text-right pr-4">
              {summary?.netProfit >= 0 ? "Net Profit" : "Net Loss"}
            </TableCell>
            <TableCell className={`text-sm text-right font-bold font-mono ${summary?.netProfit >= 0 ? "text-teal-700" : "text-red-700"}`}>
              {fmtAmt(Math.abs(summary?.netProfit || 0))}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

/* ── Balance Sheet ─────────────────────────────────────────────────────── */
function BalanceSheetTable({ rows, summary }: { rows: any[]; summary: any }) {
  const assets      = rows.filter((r) => Number(r.accounttypecode) === 2)
  const liabilities = rows.filter((r) => Number(r.accounttypecode) === 1)
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-mono">Account Code</TableHead>
            <TableHead className="text-xs">Account Name</TableHead>
            <TableHead className="text-xs text-right">Debit (₹)</TableHead>
            <TableHead className="text-xs text-right">Credit (₹)</TableHead>
            <TableHead className="text-xs text-right">Net Amount (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-blue-50 dark:bg-blue-950/20">
            <TableCell colSpan={5} className="text-xs font-bold text-blue-700 py-2 pl-4">ASSETS</TableCell>
          </TableRow>
          {assets.map((r, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="text-xs font-mono pl-8">{r.accountcode}</TableCell>
              <TableCell className="text-xs">{r.accountname}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.total_debit)}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.total_credit)}</TableCell>
              <TableCell className="text-xs text-right font-mono font-semibold text-blue-700">{fmtAmt(r.net_amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-blue-50/60">
            <TableCell colSpan={4} className="text-xs font-semibold text-right pr-4 py-1.5">Total Assets</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono text-blue-700">{fmtAmt(summary?.totalAssets)}</TableCell>
          </TableRow>

          <TableRow className="bg-purple-50 dark:bg-purple-950/20">
            <TableCell colSpan={5} className="text-xs font-bold text-purple-700 py-2 pl-4">LIABILITIES</TableCell>
          </TableRow>
          {liabilities.map((r, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="text-xs font-mono pl-8">{r.accountcode}</TableCell>
              <TableCell className="text-xs">{r.accountname}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.total_debit)}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.total_credit)}</TableCell>
              <TableCell className="text-xs text-right font-mono font-semibold text-purple-700">{fmtAmt(r.net_amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-purple-50/60">
            <TableCell colSpan={4} className="text-xs font-semibold text-right pr-4 py-1.5">Total Liabilities</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono text-purple-700">{fmtAmt(summary?.totalLiabilities)}</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-xs font-bold text-right pr-4">Balance Check (Assets − Liabilities)</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">
              {fmtAmt((summary?.totalAssets || 0) - (summary?.totalLiabilities || 0))}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

/* ── Cash Book ─────────────────────────────────────────────────────────── */
function CashBookTable({ rows, summary }: { rows: any[]; summary: any }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Voucher</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Narration</TableHead>
            <TableHead className="text-xs text-right">Cash In (₹)</TableHead>
            <TableHead className="text-xs text-right">Cash Out (₹)</TableHead>
            <TableHead className="text-xs text-right">Balance (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.business_date)}</TableCell>
              <TableCell className="text-xs font-mono">{r.voucher_no}</TableCell>
              <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.voucher_type}</Badge></TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className={`text-[10px] ${r.status === "APPROVED" ? "text-teal-700 border-teal-300" : "text-amber-700 border-amber-300"}`}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs max-w-48 truncate">{r.narration || "—"}</TableCell>
              <TableCell className="text-xs text-right font-mono text-teal-700">{fmt(r.debit_amount)}</TableCell>
              <TableCell className="text-xs text-right font-mono text-red-600">{fmt(r.credit_amount)}</TableCell>
              <TableCell className="text-xs text-right font-mono font-semibold">{fmtAmt(r.running_balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} className="text-xs font-bold">Closing Balance</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono text-teal-700">{fmtAmt(summary?.totalDebit)}</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono text-red-600">{fmtAmt(summary?.totalCredit)}</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.closingBalance)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

/* ── Bank Book ─────────────────────────────────────────────────────────── */
function BankBookTable({ rows, summary }: { rows: any[]; summary: any }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs font-mono">Account</TableHead>
            <TableHead className="text-xs">Bank Account</TableHead>
            <TableHead className="text-xs">Voucher</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Narration</TableHead>
            <TableHead className="text-xs text-right">Debit (₹)</TableHead>
            <TableHead className="text-xs text-right">Credit (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.business_date)}</TableCell>
              <TableCell className="text-xs font-mono">{r.accountcode}</TableCell>
              <TableCell className="text-xs">{r.bank_account || "—"}</TableCell>
              <TableCell className="text-xs font-mono">{r.voucher_no}</TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className={`text-[10px] ${r.status === "APPROVED" ? "text-teal-700 border-teal-300" : "text-amber-700 border-amber-300"}`}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs max-w-48 truncate">{r.narration || "—"}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.debit_amount)}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmt(r.credit_amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} className="text-xs font-bold">Total</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.totalDebit)}</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.totalCredit)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

/* ── Journal Register ──────────────────────────────────────────────────── */
function JournalTable({ rows, summary }: { rows: any[]; summary: any }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs font-mono">Batch</TableHead>
            <TableHead className="text-xs font-mono">Voucher</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Narration</TableHead>
            <TableHead className="text-xs text-right">Debit (₹)</TableHead>
            <TableHead className="text-xs text-right">Credit (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.business_date)}</TableCell>
              <TableCell className="text-xs font-mono">{r.batch_id}</TableCell>
              <TableCell className="text-xs font-mono">{r.voucher_no}</TableCell>
              <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.voucher_type}</Badge></TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className={`text-[10px] ${r.status === "APPROVED" ? "text-teal-700 border-teal-300" : "text-amber-700 border-amber-300"}`}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs max-w-48 truncate">{r.narration || "—"}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmtAmt(r.total_debit)}</TableCell>
              <TableCell className="text-xs text-right font-mono">{fmtAmt(r.total_credit)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} className="text-xs font-bold">{summary?.vouchers || rows.length} vouchers</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.totalDebit)}</TableCell>
            <TableCell className="text-xs text-right font-bold font-mono">{fmtAmt(summary?.totalCredit)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

/* ── Income / Expense ──────────────────────────────────────────────────── */
function IncomeExpenseTable({ rows, summary, type }: { rows: any[]; summary: any; type: string }) {
  const isIncome = type === "income"
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Voucher</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs font-mono">Account Code</TableHead>
            <TableHead className="text-xs">Account Name</TableHead>
            <TableHead className="text-xs">Narration</TableHead>
            <TableHead className="text-xs text-right">Debit (₹)</TableHead>
            <TableHead className="text-xs text-right">Credit (₹)</TableHead>
            <TableHead className="text-xs text-right">{isIncome ? "Income" : "Expense"} (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const net = isIncome
              ? Number(r.credit_amount || 0) - Number(r.debit_amount || 0)
              : Number(r.debit_amount || 0) - Number(r.credit_amount || 0)
            return (
              <TableRow key={i} className="hover:bg-muted/30">
                <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.business_date)}</TableCell>
                <TableCell className="text-xs font-mono">{r.voucher_no}</TableCell>
                <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.voucher_type}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{r.accountcode}</TableCell>
                <TableCell className="text-xs">{r.accountname}</TableCell>
                <TableCell className="text-xs max-w-48 truncate">{r.narration || "—"}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(r.debit_amount)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(r.credit_amount)}</TableCell>
                <TableCell className={`text-xs text-right font-mono font-semibold ${isIncome ? "text-teal-700" : "text-red-600"}`}>
                  {fmtAmt(net)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={8} className="text-xs font-bold text-right pr-4">
              Net {isIncome ? "Income" : "Expense"} ({summary?.entries || rows.length} entries)
            </TableCell>
            <TableCell className={`text-xs text-right font-bold font-mono ${isIncome ? "text-teal-700" : "text-red-600"}`}>
              {fmtAmt(summary?.net)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

export default function AccountingReportPage() {
  return (
    <Suspense fallback={
      <DashboardWrapper>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardWrapper>
    }>
      <AccountingReportContent />
    </Suspense>
  )
}
