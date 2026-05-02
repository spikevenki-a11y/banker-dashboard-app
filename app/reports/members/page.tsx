"use client"

import { useState, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Printer, Loader2, Search, Users } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

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

  async function fetchReport(tab = activeTab) {
    setLoading(true); setError(""); setRows([]); setFetched(false)
    try {
      const p = new URLSearchParams({ type: tab })
      if (fromDate) p.set("from_date", fromDate)
      if (toDate)   p.set("to_date", toDate)
      const res = await fetch(`/api/reports/members?${p}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to load report"); return }
      setRows(data.rows || [])
      setFetched(true)
    } catch { setError("Network error. Please try again.") }
    finally { setLoading(false) }
  }

  function handleTabChange(val: string) {
    setActiveTab(val); setRows([]); setFetched(false); setError("")
  }

  function handlePrint() {
    if (!printRef.current) return
    const win = window.open("", "_blank", "width=1100,height=700")
    if (!win) return
    const title = TABS.find(t => t.value === activeTab)?.label || "Member Report"
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:20px;font-size:12px;color:#111}
      h1{font-size:16px;font-weight:bold}h2{font-size:12px;color:#555;margin:4px 0 12px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #ccc;padding:5px 8px;font-size:11px}
      th{background:#f0f0f0;font-weight:600}
      tfoot td{font-weight:bold;background:#f0f0f0}
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
                            <TableHead className="text-xs">Full Name</TableHead>
                            <TableHead className="text-xs">Father Name</TableHead>
                            <TableHead className="text-xs">Mobile</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Class</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Join Date</TableHead>
                            {activeTab === "inactive" && <TableHead className="text-xs">Close Date</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{r.membership_no}</TableCell>
                              <TableCell className="text-xs font-medium">{r.full_name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.father_name || "—"}</TableCell>
                              <TableCell className="text-xs">{r.mobile_no || "—"}</TableCell>
                              <TableCell className="text-xs">{r.member_type}</TableCell>
                              <TableCell className="text-xs">{r.membership_class}</TableCell>
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
