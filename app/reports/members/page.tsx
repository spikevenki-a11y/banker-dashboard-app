"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Printer, Loader2, Search, Users, FileDown } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { useBranchInfo } from "../_components/use-branch-info"
import { openPrintWindow } from "../_components/open-print-window"
import { downloadPdf } from "../_components/download-pdf"

const fmt = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0))
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const TABS = [
  { value: "all",      label: "All Members" },
  { value: "inactive", label: "Inactive Members" },
  { value: "kyc",      label: "KYC Status" },
]

function MembersReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fetched, setFetched] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const branchInfo = useBranchInfo()
  const openTabRef = useRef(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  async function fetchReport(tab = activeTab) {
    openTabRef.current = false
    setLoading(true); setError(""); setRows([]); setFetched(false)
    try {
      const p = new URLSearchParams({ type: tab })
      if (fromDate) p.set("from_date", fromDate)
      if (toDate)   p.set("to_date", toDate)
      const res = await fetch(`/api/reports/members?${p}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to load report"); return }
      setRows(data.rows || [])
      openTabRef.current = true
      setFetched(true)
    } catch { setError("Network error. Please try again.") }
    finally { setLoading(false) }
  }

  function handleTabChange(val: string) {
    openTabRef.current = false
    setActiveTab(val); setRows([]); setFetched(false); setError("")
  }

  function handlePrint() {
    if (!printRef.current) return
    const title = TABS.find(t => t.value === activeTab)?.label || "Member Report"
    const dateRange = [fromDate && fmtDate(fromDate), toDate && fmtDate(toDate)].filter(Boolean).join(" to ")
    openPrintWindow(title, dateRange, branchInfo, printRef.current.innerHTML)
  }

  async function handleDownloadPdf() {
    if (!printRef.current) return
    setPdfLoading(true)
    try {
      const title = TABS.find(t => t.value === activeTab)?.label || "Member Report"
      const dateRange = [fromDate && fmtDate(fromDate), toDate && fmtDate(toDate)].filter(Boolean).join(" to ")
      await downloadPdf(title, dateRange, branchInfo, printRef.current.innerHTML)
    } finally { setPdfLoading(false) }
  }

  useEffect(() => {
    if (!openTabRef.current || !fetched || !printRef.current || rows.length === 0) return
    openTabRef.current = false
    const title = TABS.find(t => t.value === activeTab)?.label || "Member Report"
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
            <h1 className="text-3xl font-bold tracking-tight">Member Reports</h1>
            <p className="text-muted-foreground">View and print member-related reports</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
          </TabsList>

          {/* Filters */}
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                {activeTab === "all" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Joined From</Label>
                      <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Joined To</Label>
                      <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
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
                  <Users className="h-4 w-4" />
                  {rows.length} record{rows.length !== 1 ? "s" : ""} found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={printRef}>
                  <h1>{TABS.find(t => t.value === activeTab)?.label}</h1>
                  <h2>
                    {activeTab === "all" && fromDate ? `From: ${fmtDate(fromDate)}` : ""}
                    {activeTab === "all" && toDate ? ` To: ${fmtDate(toDate)}` : ""}
                  </h2>

                  {/* All Members / Inactive */}
                  {(activeTab === "all" || activeTab === "inactive") && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Membership No</TableHead>
                            <TableHead className="text-xs">Ledger Folio Number</TableHead>
                            <TableHead className="text-xs">Full Name</TableHead>
                            <TableHead className="text-xs">Father Name</TableHead>
                            <TableHead className="text-xs">Mobile</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Class</TableHead>
                            <TableHead className="text-xs">Balance</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Join Date</TableHead>
                            {activeTab === "inactive" && <TableHead className="text-xs">Close Date</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{r.membership_no}</TableCell>
                              <TableCell className="text-xs font-medium">{r.ledger_folio_number}</TableCell>
                              <TableCell className="text-xs font-medium">{r.full_name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.father_name || "—"}</TableCell>
                              <TableCell className="text-xs">{r.mobile_no || "—"}</TableCell>
                              <TableCell className="text-xs">{r.member_type}</TableCell>
                              <TableCell className="text-xs">{r.membership_class}</TableCell>
                              <TableCell className="text-xs">{r.share_balance}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${r.status === "ACTIVE" ? "border-teal-300 text-teal-700" : "border-red-300 text-red-700"}`}>
                                  {r.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{fmtDate(r.join_date)}</TableCell>
                              {activeTab === "inactive" && <TableCell className="text-xs">{fmtDate(r.close_date)}</TableCell>}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* KYC Status */}
                  {activeTab === "kyc" && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Membership No</TableHead>
                            <TableHead className="text-xs">Full Name</TableHead>
                            <TableHead className="text-xs">Mobile</TableHead>
                            <TableHead className="text-xs">Aadhaar No</TableHead>
                            <TableHead className="text-xs">DOB</TableHead>
                            <TableHead className="text-xs">Gender</TableHead>
                            <TableHead className="text-xs">KYC Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{r.membership_no}</TableCell>
                              <TableCell className="text-xs font-medium">{r.full_name}</TableCell>
                              <TableCell className="text-xs">{r.mobile_no || "—"}</TableCell>
                              <TableCell className="font-mono text-xs">{r.aadhaar_no || "—"}</TableCell>
                              <TableCell className="text-xs">{fmtDate(r.date_of_birth)}</TableCell>
                              <TableCell className="text-xs">{r.gender || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${r.kyc_status === "Verified" ? "border-teal-300 text-teal-700" : "border-amber-300 text-amber-700"}`}>
                                  {r.kyc_status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {fetched && rows.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No records found for the selected criteria.</p>
            </div>
          )}
        </Tabs>
      </div>
    </DashboardWrapper>
  )
}

export default function MembersReportPage() {
  return (
    <Suspense>
      <MembersReportContent />
    </Suspense>
  )
}
