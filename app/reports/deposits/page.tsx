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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Printer, Loader2, Search, PiggyBank, FileDown } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { useBranchInfo } from "../_components/use-branch-info"
import { openPrintWindow } from "../_components/open-print-window"
import { downloadPdf } from "../_components/download-pdf"

const fmt = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1:  { label: "Active",            color: "border-teal-300 text-teal-700" },
  6:  { label: "Matured",           color: "border-blue-300 text-blue-700" },
  9:  { label: "Closed",            color: "border-slate-300 text-slate-700" },
  10: { label: "Premature Closure", color: "border-red-300 text-red-700" },
}

const TABS = [
  { value: "maturity",    label: "FD Maturity" },
  { value: "outstanding", label: "Outstanding FDs" },
  { value: "closure",     label: "FD Closure" },
]

function DepositsReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "maturity")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [reportDate, setReportDate] = useState("")
  const [schemeId, setSchemeId] = useState("")
  const [schemes, setSchemes] = useState<{ scheme_id: number; scheme_name: string }[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fetched, setFetched] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const branchInfo = useBranchInfo()
  const openTabRef = useRef(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    fetch("/api/deposits/schemes", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.schemes) setSchemes(d.schemes) })
      .catch(() => {})
  }, [])

  async function fetchReport(tab = activeTab) {
    openTabRef.current = false
    setLoading(true); setError(""); setRows([]); setSummary(null); setFetched(false)
    try {
      const p = new URLSearchParams({ type: tab })
      if (fromDate) p.set("from_date", fromDate)
      if (toDate)   p.set("to_date", toDate)
      if (tab === "outstanding" && reportDate) p.set("report_date", reportDate)
      if ((tab === "maturity" || tab === "outstanding") && schemeId && schemeId !== "all") {
        p.set("scheme_id", schemeId)
      }
      const res = await fetch(`/api/reports/deposits?${p}`, { credentials: "include" })
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
    setReportDate(""); setSchemeId("")
  }

  function getDateRangeLabel() {
    const schemeName = schemeId && schemeId !== "all"
      ? schemes.find(s => String(s.scheme_id) === schemeId)?.scheme_name
      : undefined
    if (activeTab === "outstanding") {
      const parts: string[] = []
      if (reportDate) parts.push(`As of: ${fmtDate(reportDate)}`)
      if (schemeName) parts.push(`Scheme: ${schemeName}`)
      return parts.join("  ·  ")
    }
    if (activeTab === "maturity") {
      const parts: string[] = [
        [fromDate && fmtDate(fromDate), toDate && fmtDate(toDate)].filter(Boolean).join(" to ")
      ].filter(Boolean)
      if (schemeName) parts.push(`Scheme: ${schemeName}`)
      return parts.join("  ·  ")
    }
    return [fromDate && fmtDate(fromDate), toDate && fmtDate(toDate)].filter(Boolean).join(" to ")
  }

  function handlePrint() {
    if (!printRef.current) return
    const title = TABS.find(t => t.value === activeTab)?.label || "FD Report"
    openPrintWindow(title, getDateRangeLabel(), branchInfo, printRef.current.innerHTML)
  }

  async function handleDownloadPdf() {
    if (!printRef.current) return
    setPdfLoading(true)
    try {
      const title = TABS.find(t => t.value === activeTab)?.label || "FD Report"
      await downloadPdf(title, getDateRangeLabel(), branchInfo, printRef.current.innerHTML)
    } finally { setPdfLoading(false) }
  }

  useEffect(() => {
    if (!openTabRef.current || !fetched || !printRef.current || rows.length === 0) return
    openTabRef.current = false
    const title = TABS.find(t => t.value === activeTab)?.label || "FD Report"
    openPrintWindow(title, getDateRangeLabel(), branchInfo, printRef.current.innerHTML, false)
  }, [fetched, rows]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardWrapper>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/reports")} className="h-10 w-10 bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fixed Deposit Reports</h1>
            <p className="text-muted-foreground">View and print fixed deposit reports</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
          </TabsList>

          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                {(activeTab === "maturity" || activeTab === "closure") && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">{activeTab === "maturity" ? "Maturity From" : "Closure From"}</Label>
                      <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{activeTab === "maturity" ? "Maturity To" : "Closure To"}</Label>
                      <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
                    </div>
                  </>
                )}
                {activeTab === "maturity" && !fromDate && !toDate && (
                  <p className="text-xs text-muted-foreground self-end pb-2">Defaults to next 90 days</p>
                )}
                {activeTab === "maturity" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Scheme</Label>
                    <Select value={schemeId} onValueChange={setSchemeId}>
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="All Schemes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Schemes</SelectItem>
                        {schemes.map(s => (
                          <SelectItem key={s.scheme_id} value={String(s.scheme_id)}>{s.scheme_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {activeTab === "outstanding" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Report Date</Label>
                      <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Scheme</Label>
                      <Select value={schemeId} onValueChange={setSchemeId}>
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="All Schemes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Schemes</SelectItem>
                          {schemes.map(s => (
                            <SelectItem key={s.scheme_id} value={String(s.scheme_id)}>{s.scheme_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
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
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          {fetched && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  {rows.length} record{rows.length !== 1 ? "s" : ""} found
                  {summary && (
                    <span className="ml-4 font-normal">
                      · Total Deposit: <strong>{fmt(summary.total_deposit)}</strong>
                      {summary.total_maturity !== undefined && (
                        <> · Total Maturity: <strong>{fmt(summary.total_maturity)}</strong></>
                      )}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={printRef}>
                  <h1>{TABS.find(t => t.value === activeTab)?.label}</h1>
                  <h2>{getDateRangeLabel() || (activeTab === "maturity" && !fromDate && !toDate ? "Next 90 Days" : "")}</h2>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Account No</TableHead>
                          <TableHead className="text-xs">Member</TableHead>
                          <TableHead className="text-xs">Membership No</TableHead>
                          <TableHead className="text-xs">Scheme</TableHead>
                          <TableHead className="text-xs">Period</TableHead>
                          <TableHead className="text-xs">Open Date</TableHead>
                          {activeTab === "maturity" || activeTab === "outstanding"
                            ? <TableHead className="text-xs">Maturity Date</TableHead>
                            : <TableHead className="text-xs">Close Date</TableHead>
                          }
                          <TableHead className="text-xs">Rate %</TableHead>
                          <TableHead className="text-right text-xs">Deposit Amt</TableHead>
                          {(activeTab === "maturity" || activeTab === "outstanding") && (
                            <TableHead className="text-right text-xs">Maturity Amt</TableHead>
                          )}
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => {
                          const st = STATUS_MAP[Number(r.accountstatus)] || { label: String(r.accountstatus), color: "" }
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{r.account_number}</TableCell>
                              <TableCell className="text-xs font-medium">{r.full_name || "—"}</TableCell>
                              <TableCell className="font-mono text-xs">{r.membership_no}</TableCell>
                              <TableCell className="text-xs">{r.scheme_name || "—"}</TableCell>
                              <TableCell className="text-xs">{r.period_months ? `${r.period_months}M` : "—"}</TableCell>
                              <TableCell className="text-xs">{fmtDate(r.open_date)}</TableCell>
                              {activeTab === "maturity" || activeTab === "outstanding"
                                ? <TableCell className="text-xs font-medium">{fmtDate(r.maturity_date)}</TableCell>
                                : <TableCell className="text-xs">{fmtDate(r.close_date)}</TableCell>
                              }
                              <TableCell className="text-xs">{r.interest_rate}%</TableCell>
                              <TableCell className="text-right text-xs font-mono">{fmt(r.deposit_amount)}</TableCell>
                              {(activeTab === "maturity" || activeTab === "outstanding") && (
                                <TableCell className="text-right text-xs font-mono">{fmt(r.maturity_amount)}</TableCell>
                              )}
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                      {rows.length > 0 && (
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={(activeTab === "maturity" || activeTab === "outstanding") ? 8 : 8} className="text-xs font-bold">Total</TableCell>
                            <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_deposit)}</TableCell>
                            {(activeTab === "maturity" || activeTab === "outstanding") && (
                              <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_maturity)}</TableCell>
                            )}
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {fetched && rows.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <PiggyBank className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No records found for the selected criteria.</p>
            </div>
          )}
        </Tabs>
      </div>
    </DashboardWrapper>
  )
}

export default function DepositsReportPage() {
  return (
    <Suspense>
      <DepositsReportContent />
    </Suspense>
  )
}
