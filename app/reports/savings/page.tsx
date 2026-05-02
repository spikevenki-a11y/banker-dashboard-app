"use client"

import { useState, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Printer, Loader2, Search, Wallet } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

const fmt = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const TABS = [
  { value: "outstanding", label: "Outstanding Balances" },
  { value: "statement",   label: "Account Statement" },
  { value: "deposits",    label: "Deposit Summary" },
  { value: "withdrawals", label: "Withdrawal Summary" },
  { value: "dormant",     label: "Dormant Accounts" },
]

function SavingsReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "outstanding")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [rows, setRows] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fetched, setFetched] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  async function fetchReport(tab = activeTab) {
    if (tab === "statement" && !accountNumber.trim()) {
      setError("Please enter an account number"); return
    }
    setLoading(true); setError(""); setRows([]); setSummary(null); setFetched(false)
    try {
      const p = new URLSearchParams({ type: tab })
      if (fromDate) p.set("from_date", fromDate)
      if (toDate)   p.set("to_date", toDate)
      if (tab === "statement") p.set("account_number", accountNumber.trim())
      const res = await fetch(`/api/reports/savings?${p}`, { credentials: "include" })
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
    const title = TABS.find(t => t.value === activeTab)?.label || "Savings Report"
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:20px;font-size:12px;color:#111}
      h1{font-size:16px;font-weight:bold}h2{font-size:12px;color:#555;margin:4px 0 10px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #ccc;padding:5px 8px;font-size:11px}th{background:#f0f0f0;font-weight:600}
      tfoot td{font-weight:bold;background:#f0f0f0}.text-right{text-align:right}
      .summary{display:flex;gap:16px;margin-bottom:12px}.sum-box{border:1px solid #ccc;padding:6px 10px;border-radius:4px}
      .sum-label{font-size:10px;color:#666}.sum-val{font-size:13px;font-weight:bold}
    </style></head><body>${printRef.current.innerHTML}</body></html>`)
    win.document.close(); win.focus(); setTimeout(() => win.print(), 400)
  }

  const tabLabel = TABS.find(t => t.value === activeTab)?.label || ""

  return (
    <DashboardWrapper>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/reports")} className="h-10 w-10 bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Savings Reports</h1>
            <p className="text-muted-foreground">View and print savings account reports</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap h-auto gap-1">
            {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
          </TabsList>

          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                {activeTab === "statement" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Account Number *</Label>
                    <Input
                      placeholder="e.g. 23108001000001"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                      className="w-52"
                      onKeyDown={e => e.key === "Enter" && fetchReport()}
                    />
                  </div>
                )}
                {["statement","deposits","withdrawals"].includes(activeTab) && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">From Date</Label>
                      <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To Date</Label>
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
                  <Wallet className="h-4 w-4" />
                  {rows.length} record{rows.length !== 1 ? "s" : ""} found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={printRef}>
                  <h1>{tabLabel}</h1>
                  {summary?.account && (
                    <div className="summary">
                      {[
                        ["Account", summary.account.account_number],
                        ["Member", summary.account.full_name],
                        ["Scheme", summary.account.scheme_name],
                        ["Balance", fmt(summary.account.available_balance)],
                      ].map(([l, v]) => (
                        <div key={l} className="sum-box">
                          <div className="sum-label">{l}</div>
                          <div className="sum-val">{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {summary && !summary.account && (
                    <div className="summary mb-4 flex flex-wrap gap-3">
                      {summary.total_accounts !== undefined && (
                        <div className="rounded border px-3 py-2">
                          <p className="text-xs text-muted-foreground">Total Accounts</p>
                          <p className="font-bold">{summary.total_accounts}</p>
                        </div>
                      )}
                      {summary.total_balance !== undefined && (
                        <div className="rounded border px-3 py-2">
                          <p className="text-xs text-muted-foreground">Total Balance</p>
                          <p className="font-bold text-teal-700">{fmt(summary.total_balance)}</p>
                        </div>
                      )}
                      {summary.total_amount !== undefined && (
                        <div className="rounded border px-3 py-2">
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className="font-bold text-teal-700">{fmt(summary.total_amount)}</p>
                        </div>
                      )}
                      {summary.total_transactions !== undefined && (
                        <div className="rounded border px-3 py-2">
                          <p className="text-xs text-muted-foreground">Transactions</p>
                          <p className="font-bold">{summary.total_transactions}</p>
                        </div>
                      )}
                      {summary.total_dormant !== undefined && (
                        <div className="rounded border px-3 py-2">
                          <p className="text-xs text-muted-foreground">Dormant Accounts</p>
                          <p className="font-bold text-amber-700">{summary.total_dormant}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Outstanding */}
                  {activeTab === "outstanding" && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Account No</TableHead>
                          <TableHead className="text-xs">Member</TableHead>
                          <TableHead className="text-xs">Membership No</TableHead>
                          <TableHead className="text-xs">Scheme</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Opening Date</TableHead>
                          <TableHead className="text-right text-xs">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{r.account_number}</TableCell>
                            <TableCell className="text-xs font-medium">{r.full_name}</TableCell>
                            <TableCell className="font-mono text-xs">{r.membership_no}</TableCell>
                            <TableCell className="text-xs">{r.scheme_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] border-teal-300 text-teal-700">{r.account_status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{fmtDate(r.opening_date)}</TableCell>
                            <TableCell className="text-right text-xs font-mono font-medium">{fmt(r.available_balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {rows.length > 0 && (
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={6} className="text-xs font-bold">Total</TableCell>
                            <TableCell className="text-right text-xs font-bold font-mono">
                              {fmt(summary?.total_balance)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  )}

                  {/* Statement */}
                  {activeTab === "statement" && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Voucher</TableHead>
                          <TableHead className="text-xs">Narration</TableHead>
                          <TableHead className="text-right text-xs">Debit</TableHead>
                          <TableHead className="text-right text-xs">Credit</TableHead>
                          <TableHead className="text-right text-xs">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{fmtDate(r.date)}</TableCell>
                            <TableCell className="text-xs">{r.transaction_type}</TableCell>
                            <TableCell className="font-mono text-xs">{r.voucher_no || "—"}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{r.narration || "—"}</TableCell>
                            <TableCell className="text-right text-xs font-mono">
                              {Number(r.debit_amount) > 0 ? fmt(r.debit_amount) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono">
                              {Number(r.credit_amount) > 0 ? fmt(r.credit_amount) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono">{fmt(r.running_balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {rows.length > 0 && (
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={4} className="text-xs font-bold">Total</TableCell>
                            <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_debit)}</TableCell>
                            <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_credit)}</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  )}

                  {/* Deposits / Withdrawals summary */}
                  {(activeTab === "deposits" || activeTab === "withdrawals") && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-right text-xs">Transactions</TableHead>
                          <TableHead className="text-right text-xs">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{fmtDate(r.date)}</TableCell>
                            <TableCell className="text-right text-xs">{r.count}</TableCell>
                            <TableCell className="text-right text-xs font-mono font-medium">{fmt(r.total_amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {rows.length > 0 && (
                        <TableFooter>
                          <TableRow>
                            <TableCell className="text-xs font-bold">Total</TableCell>
                            <TableCell className="text-right text-xs font-bold">{summary?.total_transactions}</TableCell>
                            <TableCell className="text-right text-xs font-bold font-mono">{fmt(summary?.total_amount)}</TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  )}

                  {/* Dormant */}
                  {activeTab === "dormant" && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Account No</TableHead>
                          <TableHead className="text-xs">Member</TableHead>
                          <TableHead className="text-xs">Membership No</TableHead>
                          <TableHead className="text-xs">Scheme</TableHead>
                          <TableHead className="text-xs">Last Transaction</TableHead>
                          <TableHead className="text-right text-xs">Days Inactive</TableHead>
                          <TableHead className="text-right text-xs">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{r.account_number}</TableCell>
                            <TableCell className="text-xs font-medium">{r.full_name}</TableCell>
                            <TableCell className="font-mono text-xs">{r.membership_no}</TableCell>
                            <TableCell className="text-xs">{r.scheme_name}</TableCell>
                            <TableCell className="text-xs">{fmtDate(r.last_transaction_date)}</TableCell>
                            <TableCell className="text-right text-xs text-amber-700 font-medium">{r.days_inactive ?? "Never"}</TableCell>
                            <TableCell className="text-right text-xs font-mono">{fmt(r.available_balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {fetched && rows.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <Wallet className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No records found for the selected criteria.</p>
            </div>
          )}
        </Tabs>
      </div>
    </DashboardWrapper>
  )
}

export default function SavingsReportPage() {
  return (
    <Suspense>
      <SavingsReportContent />
    </Suspense>
  )
}
