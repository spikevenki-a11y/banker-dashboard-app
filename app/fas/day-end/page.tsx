"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  RefreshCw,
  CalendarClock,
  Banknote,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Loader2,
  AlertCircle,
  FileWarning,
  History,
  Settings2,
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

// ── Types ──────────────────────────────────────────────────────────────────

interface CashAccount {
  code: number
  name: string
  balance: number
}

interface Step {
  step_name: string
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED"
  records_processed: number
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

interface DayendSession {
  id: string
  status: "INITIATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
  initiatedAt: string
  completedAt: string | null
  errorMessage: string | null
  nextBusinessDate: string | null
}

interface Summary {
  businessDate: string
  openingCashBalance: number
  cashReceipts: number
  cashPayments: number
  closingCashBalance: number
  currentCashBalance: number
  cashAccounts: CashAccount[]
  pendingVouchers: number
  unbalancedVouchers: number
  cashTransactions: number
  transferTransactions: number
  totalTransactions: number
  dayend: DayendSession | null
  steps: Step[]
}

interface CashFlow {
  id: string
  batchId: number
  voucherId: number
  voucherType: string
  businessDate: string
  flowType: "RECEIPT" | "PAYMENT"
  cashAccountCode: number
  cashAccountName: string
  amount: number
  counterAccountNames: string
  narration: string
  makerName: string
  makerEmpCode: string
  approvedAt: string | null
}

interface HistoryRow {
  id: string
  businessDate: string
  nextBusinessDate: string | null
  status: string
  initiatedAt: string
  completedAt: string | null
  errorMessage: string | null
  initiatedByName: string
  initiatedByEmpCode: string
  totalSteps: number
  doneSteps: number
  failedSteps: number
}

// ── Step metadata ──────────────────────────────────────────────────────────

const STEPS: { key: string; label: string; description: string }[] = [
  { key: "SAVINGS_ACCRUAL",   label: "Savings Accrual",   description: "Accrue daily interest on all active savings accounts" },
  { key: "TD_ACCRUAL",        label: "TD / RD Accrual",   description: "Accrue daily interest on term and recurring deposits" },
  { key: "RD_PENALTY",        label: "RD Penalty",        description: "Apply penalties for missed recurring deposit installments" },
  { key: "LOAN_ACCRUAL",      label: "Loan Accrual",      description: "Accrue daily interest on active loans and update NPA flags" },
  { key: "BORROWING_ACCRUAL", label: "Borrowing Accrual", description: "Accrue interest on institutional borrowings" },
  { key: "MATURITY_CHECK",    label: "Maturity Check",    description: "Identify deposits that have matured and flag for closure" },
  { key: "TRIAL_BALANCE",     label: "Trial Balance",     description: "Verify all posted GL batches are balanced for today" },
  { key: "DATE_ADVANCE",      label: "Date Advance",      description: "Seal day-end balances and advance the business date" },
]

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—"

const fmtDateTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    INITIATED:   "border-blue-300 bg-blue-50 text-blue-700",
    IN_PROGRESS: "border-yellow-300 bg-yellow-50 text-yellow-700",
    COMPLETED:   "border-green-300 bg-green-50 text-green-700",
    FAILED:      "border-red-300 bg-red-50 text-red-700",
    PENDING:     "border-gray-300 bg-gray-50 text-gray-600",
    RUNNING:     "border-yellow-300 bg-yellow-50 text-yellow-700",
    DONE:        "border-green-300 bg-green-50 text-green-700",
    RECEIPT:     "border-green-300 bg-green-50 text-green-700",
    PAYMENT:     "border-red-300 bg-red-50 text-red-700",
  }
  return (
    <Badge variant="outline" className={`text-[10px] ${map[status] || ""}`}>
      {status}
    </Badge>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function DayEndPage() {
  const router = useRouter()

  const [summary, setSummary] = useState<Summary | null>(null)
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([])
  const [cashFlowTotals, setCashFlowTotals] = useState({ receipts: 0, payments: 0 })
  const [history, setHistory] = useState<HistoryRow[]>([])

  const [loading, setLoading] = useState(false)
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [initiating, setInitiating] = useState(false)
  const [confirmInitiate, setConfirmInitiate] = useState(false)

  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [confirmStep, setConfirmStep] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<"overview" | "cash-flows" | "steps" | "history">("overview")
  const [flowFilter, setFlowFilter] = useState<"ALL" | "RECEIPT" | "PAYMENT">("ALL")

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/fas/dayend/summary")
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to fetch summary"); return }
      setSummary(data)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch cash flows
  const fetchCashFlows = useCallback(async () => {
    setFlowsLoading(true)
    try {
      const res = await fetch("/api/fas/dayend/cash-flows")
      const data = await res.json()
      if (res.ok) {
        setCashFlows(data.data || [])
        setCashFlowTotals({ receipts: data.totalReceipts || 0, payments: data.totalPayments || 0 })
      }
    } catch {
      // silent
    } finally {
      setFlowsLoading(false)
    }
  }, [])

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/fas/dayend/history")
      const data = await res.json()
      if (res.ok) setHistory(data.data || [])
    } catch {
      // silent
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    fetchHistory()
  }, [fetchSummary, fetchHistory])

  // Fetch cash flows when tab is opened
  useEffect(() => {
    if (activeTab === "cash-flows") fetchCashFlows()
  }, [activeTab, fetchCashFlows])

  // Initiate day-end
  async function handleInitiate() {
    setInitiating(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/fas/dayend/initiate", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to initiate day-end"); return }
      setSuccess("Day-end initiated. Run each step sequentially to close the day.")
      await fetchSummary()
      await fetchHistory()
      setActiveTab("steps")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setInitiating(false)
      setConfirmInitiate(false)
    }
  }

  // Run a single step
  async function handleRunStep(stepKey: string) {
    if (!summary?.dayend?.id) return
    setRunningStep(stepKey)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/fas/dayend/run-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayendId: summary.dayend.id, stepName: stepKey }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || `Step ${stepKey} failed`); return }
      setSuccess(
        `${STEPS.find((s) => s.key === stepKey)?.label} completed — ${data.recordsProcessed} record(s) processed.`
      )
      await fetchSummary()
      if (stepKey === "DATE_ADVANCE") await fetchHistory()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setRunningStep(null)
      setConfirmStep(null)
    }
  }

  const stepMap = Object.fromEntries(
    (summary?.steps || []).map((s) => [s.step_name, s])
  )

  const canRunStep = (key: string) => {
    if (!summary?.dayend) return false
    if (summary.dayend.status === "COMPLETED") return false
    const step = stepMap[key]
    if (!step) return false
    if (step.status === "DONE") return false
    const idx = STEPS.findIndex((s) => s.key === key)
    if (idx > 0) {
      const prevStep = stepMap[STEPS[idx - 1].key]
      if (!prevStep || prevStep.status !== "DONE") return false
    }
    return true
  }

  const dayendDone = summary?.dayend?.status === "COMPLETED"
  const hasPendingVouchers = (summary?.pendingVouchers || 0) > 0
  const filteredFlows = flowFilter === "ALL" ? cashFlows : cashFlows.filter((f) => f.flowType === flowFilter)

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">

            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/fas")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
                  <CalendarClock className="h-8 w-8 text-indigo-600" />
                  Day End
                </h1>
                <p className="text-muted-foreground">
                  Cash position &amp; day-end processing for{" "}
                  <span className="font-semibold text-foreground">
                    {loading ? "…" : fmtDate(summary?.businessDate || null)}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => { fetchSummary(); fetchHistory(); if (activeTab === "cash-flows") fetchCashFlows() }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Alerts */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 border-green-300 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            {hasPendingVouchers && (
              <Alert className="mb-4 border-yellow-300 bg-yellow-50 text-yellow-800">
                <FileWarning className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <strong>{summary?.pendingVouchers}</strong> pending voucher
                  {summary?.pendingVouchers !== 1 ? "s" : ""} must be verified before day-end.{" "}
                  <button
                    onClick={() => router.push("/fas/verify-vouchers")}
                    className="underline font-medium"
                  >
                    Verify now →
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {/* ── Cash Position Cards ──────────────────────────────────────── */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Cash Position — {fmtDate(summary?.businessDate || null)}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <Card className="border-l-4 border-l-indigo-400">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Opening Cash Balance</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">
                          {loading ? "—" : `₹${fmt(summary?.openingCashBalance || 0)}`}
                        </p>
                      </div>
                      <div className="rounded-lg bg-indigo-50 p-2.5">
                        <Banknote className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Balance at start of day</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-400">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Cash Receipts</p>
                        <p className="mt-1 text-2xl font-bold text-green-700">
                          {loading ? "—" : `₹${fmt(summary?.cashReceipts || 0)}`}
                        </p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-2.5">
                        <ArrowDownCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Cash received today
                      {(summary?.cashTransactions || 0) > 0 && (
                        <span className="ml-1">· {summary?.cashTransactions} txns</span>
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-400">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Cash Payments</p>
                        <p className="mt-1 text-2xl font-bold text-red-700">
                          {loading ? "—" : `₹${fmt(summary?.cashPayments || 0)}`}
                        </p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2.5">
                        <ArrowUpCircle className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Cash paid out today</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Closing Cash Balance</p>
                        <p className="mt-1 text-2xl font-bold text-blue-700">
                          {loading ? "—" : `₹${fmt(summary?.closingCashBalance || 0)}`}
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2.5">
                        <Coins className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Opening + Receipts − Payments</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── Secondary Stats ──────────────────────────────────────────── */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Day-End Status</p>
                      <div className="mt-1">
                        {loading ? "—" : summary?.dayend ? (
                          <StatusBadge status={summary.dayend.status} />
                        ) : (
                          <Badge variant="outline" className="border-gray-300 bg-gray-50 text-[10px] text-gray-500">
                            NOT STARTED
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-2.5">
                      <Settings2 className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {summary?.dayend?.completedAt
                      ? `Done ${fmtDateTime(summary.dayend.completedAt)}`
                      : summary?.dayend?.initiatedAt
                      ? `Started ${fmtDateTime(summary.dayend.initiatedAt)}`
                      : "Not yet initiated"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Pending Vouchers</p>
                      <p className={`mt-1 text-xl font-bold ${hasPendingVouchers ? "text-red-700" : "text-green-700"}`}>
                        {loading ? "—" : summary?.pendingVouchers}
                      </p>
                    </div>
                    <div className={`rounded-lg p-2.5 ${hasPendingVouchers ? "bg-red-50" : "bg-green-50"}`}>
                      <FileWarning className={`h-5 w-5 ${hasPendingVouchers ? "text-red-500" : "text-green-500"}`} />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Awaiting checker verification</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Today's Vouchers</p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {loading ? "—" : summary?.totalTransactions}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2.5">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {summary?.cashTransactions || 0} cash · {summary?.transferTransactions || 0} transfer
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Net Cash Flow</p>
                      <p className={`mt-1 text-xl font-bold ${
                        (summary?.cashReceipts || 0) >= (summary?.cashPayments || 0)
                          ? "text-green-700"
                          : "text-red-700"
                      }`}>
                        {loading
                          ? "—"
                          : `₹${fmt(Math.abs((summary?.cashReceipts || 0) - (summary?.cashPayments || 0)))}`}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2.5">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {(summary?.cashReceipts || 0) >= (summary?.cashPayments || 0) ? "Net receipt" : "Net payment"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── Cash Accounts Breakdown ──────────────────────────────────── */}
            {(summary?.cashAccounts?.length || 0) > 0 && (
              <div className="mb-4 rounded-lg border bg-card p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Cash In Hand Accounts
                </p>
                <div className="flex flex-wrap gap-4">
                  {summary!.cashAccounts.map((acc) => (
                    <div key={acc.code} className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <Banknote className="h-4 w-4 text-indigo-500" />
                      <div>
                        <p className="text-xs font-semibold">{acc.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {acc.code} · ₹{fmt(acc.balance)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-4 flex gap-1 border-b">
              {(
                [
                  { key: "overview",    label: "Overview" },
                  { key: "cash-flows",  label: "Cash Flows" },
                  { key: "steps",       label: "Day-End Steps" },
                  { key: "history",     label: "History" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-b-2 border-indigo-600 text-indigo-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ══════════════ OVERVIEW TAB ══════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-4">

                {/* Cash Flow Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-indigo-600" />
                      Cash Flow Summary
                    </CardTitle>
                    <CardDescription>
                      Cash movement for {fmtDate(summary?.businessDate || null)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {[
                            { label: "Opening Cash Balance",  value: summary?.openingCashBalance || 0,  color: "text-foreground",   bold: false },
                            { label: "+ Cash Receipts",       value: summary?.cashReceipts || 0,        color: "text-green-700",    bold: false },
                            { label: "− Cash Payments",       value: summary?.cashPayments || 0,        color: "text-red-700",      bold: false },
                            { label: "= Closing Cash Balance",value: summary?.closingCashBalance || 0,  color: "text-indigo-700",   bold: true  },
                          ].map(({ label, value, color, bold }, i) => (
                            <tr key={i} className={`${i % 2 === 0 ? "bg-muted/30" : ""} ${bold ? "border-t-2" : ""}`}>
                              <td className={`px-4 py-2.5 ${bold ? "font-bold" : "font-medium"} text-muted-foreground`}>
                                {label}
                              </td>
                              <td className={`px-4 py-2.5 text-right font-mono ${color} ${bold ? "font-bold text-base" : ""}`}>
                                ₹{fmt(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Day-End Action */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-indigo-600" />
                      Day-End Options
                    </CardTitle>
                    <CardDescription>
                      Initiate and run all day-end steps to close the financial day
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dayendDone ? (
                      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">Day-End Completed</p>
                          <p className="text-sm text-green-700">
                            Business date advanced to{" "}
                            <strong>{fmtDate(summary?.dayend?.nextBusinessDate || null)}</strong>.
                            All steps done at {fmtDateTime(summary?.dayend?.completedAt || null)}.
                          </p>
                        </div>
                      </div>
                    ) : summary?.dayend ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Session {summary.dayend.status.toLowerCase()} since{" "}
                          {fmtDateTime(summary.dayend.initiatedAt)}.
                        </div>
                        {summary.dayend.errorMessage && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{summary.dayend.errorMessage}</AlertDescription>
                          </Alert>
                        )}
                        <Button
                          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => setActiveTab("steps")}
                        >
                          <Play className="h-4 w-4" />
                          Continue Day-End Steps
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          No active day-end session. Ensure all vouchers are verified, then
                          initiate to begin the closing process.
                        </p>
                        <div className="flex items-center gap-3">
                          <Button
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => setConfirmInitiate(true)}
                            disabled={initiating || hasPendingVouchers || loading}
                          >
                            {initiating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            Initiate Day-End
                          </Button>
                          {hasPendingVouchers && (
                            <p className="flex items-center gap-1.5 text-xs text-destructive">
                              <AlertCircle className="h-3.5 w-3.5" />
                              {summary?.pendingVouchers} pending voucher{summary?.pendingVouchers !== 1 ? "s" : ""} must be cleared first
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ══════════════ CASH FLOWS TAB ══════════════ */}
            {activeTab === "cash-flows" && (
              <div className="space-y-4">

                {/* Filter + Totals */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    {(["ALL", "RECEIPT", "PAYMENT"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFlowFilter(f)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          flowFilter === f
                            ? f === "RECEIPT"
                              ? "bg-green-600 text-white"
                              : f === "PAYMENT"
                              ? "bg-red-600 text-white"
                              : "bg-indigo-600 text-white"
                            : "border bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f === "ALL" ? "All Flows" : f === "RECEIPT" ? "Receipts Only" : "Payments Only"}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Receipts: <span className="font-semibold text-green-700">₹{fmt(cashFlowTotals.receipts)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Payments: <span className="font-semibold text-red-700">₹{fmt(cashFlowTotals.payments)}</span>
                    </span>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-indigo-600" />
                      Cash Flow Transactions
                    </CardTitle>
                    <CardDescription>
                      All verified cash vouchers for {fmtDate(summary?.businessDate || null)} —
                      debit entries = receipts, credit entries = payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {flowsLoading ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Loading cash flows…
                      </div>
                    ) : filteredFlows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <Banknote className="mb-3 h-10 w-10 text-muted-foreground" />
                        <p className="font-semibold text-foreground">No cash flow records</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {flowFilter === "ALL"
                            ? "No verified cash vouchers found for today."
                            : `No ${flowFilter.toLowerCase()} transactions found.`}
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6 text-xs">Voucher #</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Cash A/c</TableHead>
                            <TableHead className="text-xs">Against</TableHead>
                            <TableHead className="text-xs">Narration</TableHead>
                            <TableHead className="text-xs">Maker</TableHead>
                            <TableHead className="text-right text-xs pr-6">Amount (₹)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFlows.map((flow) => (
                            <TableRow key={flow.id} className="hover:bg-muted/40">
                              <TableCell className="pl-6">
                                <div className="font-mono text-xs font-semibold">{flow.voucherId}</div>
                                <div className="text-[10px] text-muted-foreground">Batch #{flow.batchId}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {flow.flowType === "RECEIPT" ? (
                                    <ArrowDownCircle className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <ArrowUpCircle className="h-3.5 w-3.5 text-red-500" />
                                  )}
                                  <StatusBadge status={flow.flowType} />
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">{flow.cashAccountName}</TableCell>
                              <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground">
                                {flow.counterAccountNames}
                              </TableCell>
                              <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground">
                                {flow.narration}
                              </TableCell>
                              <TableCell className="text-xs">
                                {flow.makerName}
                                {flow.makerEmpCode && (
                                  <span className="ml-1 text-muted-foreground">({flow.makerEmpCode})</span>
                                )}
                              </TableCell>
                              <TableCell className={`pr-6 text-right font-mono text-sm font-semibold ${
                                flow.flowType === "RECEIPT" ? "text-green-700" : "text-red-700"
                              }`}>
                                {flow.flowType === "RECEIPT" ? "+" : "−"}₹{fmt(flow.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={6} className="pl-6 text-xs font-bold">
                              {flowFilter === "ALL" ? "Total" : flowFilter === "RECEIPT" ? "Total Receipts" : "Total Payments"}
                            </TableCell>
                            <TableCell className={`pr-6 text-right font-mono font-bold ${
                              flowFilter === "PAYMENT" ? "text-red-700" : flowFilter === "RECEIPT" ? "text-green-700" : "text-indigo-700"
                            }`}>
                              ₹{fmt(
                                flowFilter === "RECEIPT"
                                  ? cashFlowTotals.receipts
                                  : flowFilter === "PAYMENT"
                                  ? cashFlowTotals.payments
                                  : cashFlowTotals.receipts + cashFlowTotals.payments
                              )}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ══════════════ STEPS TAB ══════════════ */}
            {activeTab === "steps" && (
              <div className="space-y-4">
                {!summary?.dayend ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <Clock className="mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="font-semibold text-foreground">Day-end not initiated</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Go to Overview and initiate the day-end session first.
                      </p>
                      <Button className="mt-4 gap-2" variant="outline" onClick={() => setActiveTab("overview")}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to Overview
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-indigo-600" />
                        Day-End Steps
                      </CardTitle>
                      <CardDescription>
                        Run each step in order — each step must complete before the next can run
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6 text-xs w-8">#</TableHead>
                            <TableHead className="text-xs">Step</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs">Records</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Completed At</TableHead>
                            <TableHead className="text-right text-xs pr-6">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {STEPS.map((s, idx) => {
                            const stepData = stepMap[s.key]
                            const canRun = canRunStep(s.key)
                            const isRunning = runningStep === s.key
                            return (
                              <TableRow key={s.key} className="hover:bg-muted/50">
                                <TableCell className="pl-6 text-xs font-mono text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="text-xs font-semibold">{s.label}</TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[200px]">{s.description}</TableCell>
                                <TableCell className="font-mono text-xs">{stepData?.records_processed ?? "—"}</TableCell>
                                <TableCell>
                                  {stepData ? (
                                    <StatusBadge status={stepData.status} />
                                  ) : (
                                    <Badge variant="outline" className="border-gray-200 text-[10px] text-gray-400">PENDING</Badge>
                                  )}
                                  {stepData?.error_message && (
                                    <p className="mt-1 text-[10px] text-red-600 max-w-[160px] truncate" title={stepData.error_message}>
                                      {stepData.error_message}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {fmtDateTime(stepData?.completed_at || null)}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  {stepData?.status === "DONE" ? (
                                    <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant={stepData?.status === "FAILED" ? "destructive" : "outline"}
                                      className="gap-1.5 text-xs"
                                      onClick={() => setConfirmStep(s.key)}
                                      disabled={!canRun || !!runningStep}
                                    >
                                      {isRunning
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Play className="h-3.5 w-3.5" />}
                                      {stepData?.status === "FAILED" ? "Retry" : "Run"}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
                {dayendDone && (
                  <Alert className="border-green-300 bg-green-50 text-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      All steps completed. Business date advanced to{" "}
                      <strong>{fmtDate(summary?.dayend?.nextBusinessDate || null)}</strong>.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* ══════════════ HISTORY TAB ══════════════ */}
            {activeTab === "history" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-600" />
                    Day-End History
                  </CardTitle>
                  <CardDescription>Last 30 day-end runs for this branch</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading history…
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <History className="mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No day-end history available.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6 text-xs">Business Date</TableHead>
                          <TableHead className="text-xs">Next Date</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Steps</TableHead>
                          <TableHead className="text-xs">Initiated By</TableHead>
                          <TableHead className="text-xs">Started</TableHead>
                          <TableHead className="text-xs pr-6">Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((h) => (
                          <TableRow key={h.id} className="hover:bg-muted/50">
                            <TableCell className="pl-6 text-xs font-semibold">{fmtDate(h.businessDate)}</TableCell>
                            <TableCell className="text-xs">{fmtDate(h.nextBusinessDate)}</TableCell>
                            <TableCell><StatusBadge status={h.status} /></TableCell>
                            <TableCell className="text-xs">
                              <span className="text-green-700 font-semibold">{h.doneSteps}</span>
                              <span className="text-muted-foreground">/{h.totalSteps}</span>
                              {h.failedSteps > 0 && (
                                <span className="ml-1 text-red-600">({h.failedSteps} failed)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {h.initiatedByName}
                              {h.initiatedByEmpCode && (
                                <span className="ml-1 text-muted-foreground">({h.initiatedByEmpCode})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fmtDateTime(h.initiatedAt)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground pr-6">{fmtDateTime(h.completedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

          </main>
        </div>
      </div>

      {/* Confirm Initiate */}
      <AlertDialog open={confirmInitiate} onOpenChange={setConfirmInitiate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initiate Day-End?</AlertDialogTitle>
            <AlertDialogDescription>
              This will start the day-end process for{" "}
              <strong>{fmtDate(summary?.businessDate || null)}</strong>. Run each step
              sequentially to complete the process and advance the business date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={initiating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInitiate}
              disabled={initiating}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {initiating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initiate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Run Step */}
      <AlertDialog open={!!confirmStep} onOpenChange={(open) => { if (!open) setConfirmStep(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Run {STEPS.find((s) => s.key === confirmStep)?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {STEPS.find((s) => s.key === confirmStep)?.description}.
              This will process records for{" "}
              <strong>{fmtDate(summary?.businessDate || null)}</strong> and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!runningStep}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmStep && handleRunStep(confirmStep)}
              disabled={!!runningStep}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {runningStep && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Step
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardWrapper>
  )
}
