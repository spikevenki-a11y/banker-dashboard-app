"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableFooter, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Printer, Loader2, Search, TrendingUp, FileDown } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { useBranchInfo } from "../_components/use-branch-info"
import { openPrintWindow } from "../_components/open-print-window"
import { downloadPdf } from "../_components/download-pdf"

const fmt = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const TABS = [
  { value: "trial-balance", label: "Trial Balance" },
  { value: "cash",          label: "Daily Cash Report" },
  { value: "summary",       label: "Transaction Summary" },
]

function FinancialReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "trial-balance")
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

  async function fetchReport(tab = activeTab) {
    openTabRef.current = false
    setLoading(true); setError(""); setRows([]); setSummary(null); setFetched(false)
    try {
      const p = new URLSearchParams({ type: tab })
      if (fromDate) p.set("from_date", fromDate)
      if (toDate)   p.set("to_date", toDate)
      const res = await fetch(`/api/reports/financial?${p}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to load report"); return }
      setRows(data.rows || [])
      setSummary(data.summary || null)
      openTabRef.current = true
      setFetched(true)
    } catch { setError("Network error. Please try again.") }
    finally { setLoading(false) }
  }

  function handleTabChange(val: string) {
    openTabRef.current = false
    setActiveTab(val); setRows([]); setSummary(null); setFetched(false); setError("")
  }

  function handlePrint() {
    if (!printRef.current) return
    const title = TABS.find(t => t.value === activeTab)?.label || "Financial Report"
    const dateRange = [fromDate && fmtDate(fromDate), toDate && fmtDate(toDate)].filter(Boolean).join(" to ")
    openPrintWindow(title, dateRange, branchInfo, printRef.current.innerHTML)
  }

  async function handleDownloadPdf() {
    if (!printRef.current) return
    setPdfLoading(true)
    try {
      const title = TABS.find(t => t.value === activeTab)?.label || "Financial Report"
      const dateRange = [fromDate && fmtDate(fromDate), toDate && fmtDate(toDate)].filter(Boolean).join(" to ")
      await downloadPdf(title, dateRange, branchInfo, printRef.current.innerHTML)
    } finally { setPdfLoading(false) }
  }

  useEffect(() => {
    if (!openTabRef.current || !fetched || !printRef.current || rows.length === 0) return
    openTabRef.current = false
    const title = TABS.find(t => t.value === activeTab)?.label || "Financial Report"
    const dateRange = [fromDate && fmtDate(fromDate), toDate && fmtDate(toDate)].filter(Boolean).join(" to ")
    openPrintWindow(title, dateRange, branchInfo, printRef.current.innerHTML, false)
  }, [fetched, rows]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardWrapper>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/reports")} className="h-10 w-10 bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
            <p className="text-muted-foreground">GL-based financial reports from approved batches</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
          </TabsList>

          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">From Date</Label>
                  <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To Date</Label>
                  <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
                </div>
                <Button onClick={() => fetchReport()} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Generate Report
                </Button>
                {fetched && rows.length > 0 && (
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" onClick={handlePrint} className="gap-2 bg-transparent">
                      <Printer className="h-4 w-4" /> Print
                    </Button>
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading} className="gap-2 bg-transparent">
                      {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      {pdfLoading ? "Generating..." : "Download PDF"}
                    </Button>
                  </div>
                )}
              </div>
              {activeTab === "trial-balance" && (
                <p className="mt-2 text-xs text-muted-foreground">Shows only approved GL batches.</p>
              )}
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          {fetched && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {rows.length} record{rows.length !== 1 ? "s" : ""} found
                  {summary?.total_debit !== undefined && (
                    <span className="ml-4 font-normal">
                      · Debit: <strong>{fmt(summary.total_debit)}</strong>
                      {" "}· Credit: <strong>{fmt(summary.total_credit)}</strong>
                    </span>
                  )}
                  {summary?.net !== undefined && (
                    <span className="ml-4 font-normal">
                      · Net Cash: <strong className={summary.net >= 0 ? "text-teal-600" : "text-red-600"}>{fmt(summary.net)}</strong>
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={printRef}>
                  <h1>{TABS.find(t => t.value === activeTab)?.label}</h1>
                  <h2>{fromDate ? `From: ${fmtDate(fromDate)}` : ""}{toDate ? ` To: ${fmtDate(toDate)}` : ""}</h2>
                  <div className="overflow-x-auto">

                    {/* Trial Balance */}
                    {activeTab === "trial-balance" && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">GL Account Code</TableHead>
                            <TableHead className="text-right text-xs">Total Debit</TableHead>
                            <TableHead className="text-right text-xs">Total Credit</TableHead>
                            <TableHead className="text-right text-xs">Net Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{r.accountcode}</TableCell>
                              <TableCell className="text-right text-xs font-mono">{fmt(r.total_debit)}</TableCell>
                              <TableCell className="text-right text-xs font-mono">{fmt(r.total_credit)}</TableCell>
                              <TableCell className={`text-right text-xs font-mono font-medium ${Number(r.net_balance) >= 0 ? "text-teal-700" : "text-red-700"}`}>
                                {fmt(Math.abs(Number(r.net_balance)))} {Number(r.net_balance) >= 0 ? "Dr" : "Cr"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        {rows.length > 0 && (
                          <TableFooter>
                            <TableRow>
                              <TableCell className="text-xs font-bold">Total</TableCell>
                              <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_debit)}</TableCell>
                              <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_credit)}</TableCell>
                              <TableCell />
                            </TableRow>
                          </TableFooter>
                        )}
                      </Table>
                    )}

                    {/* Cash Report */}
                    {activeTab === "cash" && (
                      <>
                        {summary && (
                          <div className="mb-4 flex flex-wrap gap-3">
                            {[
                              ["Cash In (Dr)", fmt(summary.cash_in), "text-teal-700"],
                              ["Cash Out (Cr)", fmt(summary.cash_out), "text-red-700"],
                              ["Net Cash", fmt(summary.net), summary.net >= 0 ? "text-teal-700" : "text-red-700"],
                            ].map(([l, v, c]) => (
                              <div key={l as string} className="rounded border px-3 py-2">
                                <p className="text-xs text-muted-foreground">{l}</p>
                                <p className={`font-bold ${c}`}>{v}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Voucher No</TableHead>
                              <TableHead className="text-xs">Type</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Narration</TableHead>
                              <TableHead className="text-right text-xs">Cash In (Dr)</TableHead>
                              <TableHead className="text-right text-xs">Cash Out (Cr)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{fmtDate(r.date)}</TableCell>
                                <TableCell className="font-mono text-xs">{r.voucher_no || "—"}</TableCell>
                                <TableCell className="text-xs">{r.voucher_type || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[10px] ${r.batch_status === "APPROVED" ? "border-teal-300 text-teal-700" : "border-amber-300 text-amber-700"}`}>
                                    {r.batch_status || "—"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate">{r.narration || "—"}</TableCell>
                                <TableCell className="text-right text-xs font-mono text-teal-700">
                                  {Number(r.debit_amount) > 0 ? fmt(r.debit_amount) : "—"}
                                </TableCell>
                                <TableCell className="text-right text-xs font-mono text-red-700">
                                  {Number(r.credit_amount) > 0 ? fmt(r.credit_amount) : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          {rows.length > 0 && (
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={5} className="text-xs font-bold">Total</TableCell>
                                <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.cash_in)}</TableCell>
                                <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.cash_out)}</TableCell>
                              </TableRow>
                            </TableFooter>
                          )}
                        </Table>
                      </>
                    )}

                    {/* Transaction Summary */}
                    {activeTab === "summary" && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Voucher Type</TableHead>
                            <TableHead className="text-right text-xs">Batches</TableHead>
                            <TableHead className="text-right text-xs">Total Debit</TableHead>
                            <TableHead className="text-right text-xs">Total Credit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs font-medium">{r.voucher_type}</TableCell>
                              <TableCell className="text-right text-xs">{r.batch_count}</TableCell>
                              <TableCell className="text-right text-xs font-mono">{fmt(r.total_debit)}</TableCell>
                              <TableCell className="text-right text-xs font-mono">{fmt(r.total_credit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        {rows.length > 0 && (
                          <TableFooter>
                            <TableRow>
                              <TableCell colSpan={2} className="text-xs font-bold">Total</TableCell>
                              <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_debit)}</TableCell>
                              <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_credit)}</TableCell>
                            </TableRow>
                          </TableFooter>
                        )}
                      </Table>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {fetched && rows.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No records found for the selected criteria.</p>
            </div>
          )}
        </Tabs>
      </div>
    </DashboardWrapper>
  )
}

export default function FinancialReportPage() {
  return (
    <Suspense>
      <FinancialReportContent />
    </Suspense>
  )
}
