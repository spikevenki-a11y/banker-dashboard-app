"use client"

import { useEffect, useState } from "react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"
import { SummaryCard } from "./_components/summary-card"
import { TrendChartCard, type TrendPoint } from "./_components/trend-chart-card"
import { QuickActionsCard } from "./_components/quick-actions-card"
import { DepositMixCard, type DepositSegment } from "./_components/deposit-mix-card"
import { NotificationsCard, type NotificationItem } from "./_components/notifications-card"
import { PendingTasksCard, type PendingTask } from "./_components/pending-tasks-card"

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  activeLoans: number
  totalDeposits: number // savings + active term deposits
  fdCount: number
  mfdCount: number
  totalMFD: number
  totalFD: number // active term deposits
  totalShares: number
  todayTransactions: number
  pendingVouchers: number
}

// ── Sample data from the Figma design ───────────────────────────────────────
// No API exists for these panels yet. Replace with live data when endpoints are added.
const TREND_SAMPLE: TrendPoint[] = [
  { month: "Apr", year: 2025, deposits: 92, loans: 70 },
  { month: "May", year: 2025, deposits: 98, loans: 74 },
  { month: "Jun", year: 2025, deposits: 108, loans: 80 },
  { month: "Jul", year: 2025, deposits: 115, loans: 84 },
  { month: "Aug", year: 2025, deposits: 122, loans: 90 },
  { month: "Sep", year: 2025, deposits: 130, loans: 96 },
  { month: "Oct", year: 2025, deposits: 138, loans: 101 },
  { month: "Nov", year: 2025, deposits: 146, loans: 108 },
  { month: "Dec", year: 2025, deposits: 155, loans: 113 },
  { month: "Jan", year: 2026, deposits: 163, loans: 119 },
  { month: "Feb", year: 2026, deposits: 172, loans: 126 },
  { month: "Mar", year: 2026, deposits: 184, loans: 134 },
]

const NOTIFICATIONS_SAMPLE: NotificationItem[] = [
  { title: "Software maintenance scheduled", detail: "07 Nov 2026, 10:00 PM – 2:00 AM", status: "warning" },
  { title: "CBS integration enabled", detail: "Thiruvannamalai & Vellore · 05 Nov 2026", status: "success" },
  { title: "Complete member eKYC and consent", detail: "Due today · 06 Nov 2026", status: "warning" },
  { title: "RCS review meeting", detail: "Monday, 09 Nov 2026", status: "info" },
]

// ₹18.76 Cr / ₹4.82 L / ₹12,500
function formatAmount(amount: number) {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`
  return `₹${amount.toLocaleString("en-IN")}`
}

const formatCount = (n: number | undefined) => (n ?? 0).toLocaleString("en-IN")

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [branchName, setBranchName] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/dashboard/stats", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStats(data))
      .catch((error) => console.error("Error fetching stats:", error))
      .finally(() => setStatsLoading(false))

    fetch("/api/auth/identity", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((identity) => setBranchName(identity?.branch_name ?? null))
      .catch(() => setBranchName(null))
  }, [])

  const summary = [
    {
      icon: "members",
      label: "Members",
      value: formatCount(stats?.totalMembers),
      detail: `${formatCount(stats?.activeMembers)} active`,
    },
    {
      icon: "deposits",
      label: "Total deposits",
      value: formatAmount(stats?.totalDeposits ?? 0),
      detail: `FD ${formatCount(stats?.fdCount)} · MFD ${formatCount(stats?.mfdCount)}`,
    },
    {
      icon: "loans",
      label: "Total loans",
      value: formatCount(stats?.activeLoans),
      detail: "Approved, disbursed & active",
    },
    {
      icon: "transactions",
      label: "Today's transactions",
      value: formatCount(stats?.todayTransactions),
      detail: `Pending vouchers ${formatCount(stats?.pendingVouchers)}`,
    },
  ]

  // The stats API doesn't split out recurring deposits, so that segment is not shown
  const depositMix: DepositSegment[] = [
    { key: "savings", color: "blue", label: "Savings", amount: Math.max(0, (stats?.totalDeposits ?? 0) - (stats?.totalFD ?? 0)) },
    { key: "term", color: "green", label: "Term deposits", amount: stats?.totalFD ?? 0 },
    { key: "mfd", color: "violet", label: "MFD", amount: stats?.totalMFD ?? 0 },
  ]

  // Only "Unposted vouchers" is live; the other counts are sample values until APIs exist
  const pendingTasks: PendingTask[] = [
    { label: "Loan applications", count: 7 },
    { label: "KYC verifications", count: 5 },
    { label: "Account approvals", count: 3 },
    { label: "Unposted vouchers", count: stats?.pendingVouchers ?? 0 },
    { label: "Term deposit matured", count: 2 },
  ]

  return (
    <DashboardWrapper>
      {/* Cancels the wrapper's p-6 so the design's page tint reaches the edges */}
      <div className="@container -m-6 min-h-[calc(100%+3rem)] bg-ardb-page p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-center text-2xl font-bold leading-9 text-ardb-ink sm:text-[28px]">
              {branchName ?? "Dashboard"}
            </h1>
            <p className="text-sm leading-5 text-ardb-muted">Here&apos;s what&apos;s happening in the bank today.</p>
          </header>

          <section aria-label="Summary" className="grid gap-6 @xl:grid-cols-2 @5xl:grid-cols-4">
            {summary.map((card) => (
              <SummaryCard key={card.label} {...card} loading={statsLoading} />
            ))}
          </section>

          <div className="grid items-start gap-6 @5xl:grid-cols-[minmax(0,1fr)_336px]">
            <div className="@container flex min-w-0 flex-col gap-6">
              <TrendChartCard data={TREND_SAMPLE} />
              <div className="grid gap-6 @[45rem]:grid-cols-2">
                <QuickActionsCard />
                <DepositMixCard segments={depositMix} formatAmount={formatAmount} loading={statsLoading} />
              </div>
            </div>

            <div className="grid content-start gap-6 @2xl:grid-cols-2 @5xl:grid-cols-1">
              <NotificationsCard items={NOTIFICATIONS_SAMPLE} />
              <PendingTasksCard tasks={pendingTasks} />
            </div>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  )
}
