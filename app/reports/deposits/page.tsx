"use client"

import { useState, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableFooter, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Printer, Loader2, Search, PiggyBank } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

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
  const [rows, setRows] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fetched, setFetched] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  async function fetchReport(tab = activeTab) {
    setLoading(true); setError(""); setRows([]); setSummary(null); setFetched(false)
    try {
      const p = new URLSearchParams({ type: tab })
      if (fromDate) p.set("from_date", fromDate)
      if (toDate)   p.set("to_date", toDate)
      const res = await fetch(`/api/reports/deposits?${p}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to load report"); return }
      setRows(data.rows || [])
      setSummary(data.summary || null)
      setFetched(true)
    } catch { setError("Network error. Please try again.") }
    finally { setLoading(false) }
  }

  function handleTabChange(val: string) {
    setActiveTab(val); setRows([]); setSummary(null); setFetched(false); setError("")
  }

  function handlePrint() {
    if (!printRef.current) return
    const win = window.open("", "_blank", "width=1100,height=700")
    if (!win) return
    const title = TABS.find(t => t.value === activeTab)?.label || "FD Report"
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
      h1{font-size:16px;font-weight:bold}h2{font-size:12px;color:#555;margin:4px 0 10px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #ccc;padding:5px 8px;font-size:11px}th{background:#f0f0f0;font-weight:600}
      tfoot td{font-weight:bold;background:#f0f0f0}.text-right{text-align:right}
    </style></head><body>${printRef.current.innerHTML}</body></html>`)
    win.document.close(); win.focus(); setTimeout(() => win.print(), 400)
  }

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
                <Button onClick={() => fetchReport()} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Generate Report
                </Button>
                {fetched && rows.length > 0 && (
                  <Button variant="outline" onClick={handlePrint} className="gap-2 bg-transparent ml-auto">
                    <Printer className="h-4 w-4" /> Print
                  </Button>
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
                  <h2>{fromDate ? `From: ${fmtDate(fromDate)}` : ""}{toDate ? ` To: ${fmtDate(toDate)}` : ""}</h2>
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
