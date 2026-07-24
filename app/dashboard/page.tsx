"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Wallet, FileText, CreditCard, ArrowUpRight, Clock, RefreshCw, Banknote, PiggyBank, TrendingUp, Activity, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardWrapper } from "../_components/dashboard-wrapper"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface Activity {
  id: string
  member: string
  action: string
  amount: string
  time: string
  status: string
  module: string
}

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  activeLoans: number
  totalDeposits: number
  fdCount: number
  mfdCount: number
  totalMFD: number
  totalFD: number
  totalShares: number
  todayTransactions: number
  pendingVouchers: number
}

const depositData = [
  { month: "Jan", amount: 18500 },
  { month: "Feb", amount: 19200 },
  { month: "Mar", amount: 20100 },
  { month: "Apr", amount: 21300 },
  { month: "May", amount: 22800 },
  { month: "Jun", amount: 24500 },
]

const loanData = [
  { month: "Jan", approved: 42, disbursed: 38 },
  { month: "Feb", approved: 48, disbursed: 45 },
  { month: "Mar", approved: 55, disbursed: 50 },
  { month: "Apr", approved: 61, disbursed: 58 },
  { month: "May", approved: 68, disbursed: 65 },
  { month: "Jun", approved: 75, disbursed: 72 },
]

const moduleColors: Record<string, string> = {
  loan: "bg-purple-100 text-purple-700 border-purple-200",
  savings: "bg-teal-100 text-teal-700 border-teal-200",
  fd: "bg-orange-100 text-orange-700 border-orange-200",
  mfd: "bg-amber-100 text-amber-700 border-amber-200",
  shares: "bg-green-100 text-green-700 border-green-200",
  member: "bg-blue-100 text-blue-700 border-blue-200",
  voucher: "bg-indigo-100 text-indigo-700 border-indigo-200",
}

export default function DashboardPage() {
  const router = useRouter()
  const PAGE_SIZE = 10
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const { user, isAuthenticated, isLoading } = useAuth()

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/activities?branchId=${user?.branch}&limit=100`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setActivities(data)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/stats?branchId=${user?.branch}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchActivities(), fetchStats()])
    setRefreshing(false)
  }

  useEffect(() => {
    fetchActivities()
    fetchStats()
  }, [fetchActivities, fetchStats])

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)} K`
    }
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const statsCards = [
    {
      title: "Liquid Deposit",
      value: stats?.totalMembers?.toString() || "0",
      subtitle: `${stats?.activeMembers || 0} active`,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      lightBg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      accent: "border-l-blue-500",
      badge: "bg-blue-100 text-blue-700",
    },
    {
      title: "Total Members",
      value: stats?.totalMembers?.toString() || "0",
      subtitle: `${stats?.activeMembers || 0} active`,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      lightBg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      accent: "border-l-blue-500",
      badge: "bg-blue-100 text-blue-700",
    },
    {
      title: "Share Capital",
      value: formatAmount(stats?.totalShares || 0),
      subtitle: "Member shares",
      icon: PiggyBank,
      gradient: "from-green-500 to-emerald-500",
      lightBg: "bg-green-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      accent: "border-l-green-500",
      badge: "bg-green-100 text-green-700",
    },
    {
      title: "Total Deposits",
      value: formatAmount(stats?.totalDeposits || 0),
      subtitle: "Savings + FD",
      icon: Wallet,
      gradient: "from-teal-500 to-emerald-600",
      lightBg: "bg-teal-50",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      accent: "border-l-teal-500",
      badge: "bg-teal-100 text-teal-700",
    },
    {
      title: "Fixed Deposits",
      value: `${stats?.totalFD || 0} / ${stats?.totalMFD || 0}`,
      subtitle: `FD ${stats?.fdCount || 0} · MFD ${stats?.mfdCount || 0}`,
      icon: FileText,
      gradient: "from-orange-500 to-amber-500",
      lightBg: "bg-orange-50",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      accent: "border-l-orange-500",
      badge: "bg-orange-100 text-orange-700",
    },
    {
      title: "Active Loans",
      value: stats?.activeLoans?.toString() || "0",
      subtitle: "Applications",
      icon: CreditCard,
      gradient: "from-violet-500 to-purple-600",
      lightBg: "bg-violet-50",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      accent: "border-l-violet-500",
      badge: "bg-violet-100 text-violet-700",
    },
    {
      title: "Today's Transactions",
      value: stats?.todayTransactions?.toString() || "0",
      subtitle: "All modules",
      icon: Banknote,
      gradient: "from-indigo-500 to-blue-600",
      lightBg: "bg-indigo-50",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      accent: "border-l-indigo-500",
      badge: "bg-indigo-100 text-indigo-700",
    },
    {
      title: "Pending Vouchers",
      value: stats?.pendingVouchers?.toString() || "0",
      subtitle: "Awaiting approval",
      icon: Clock,
      gradient: "from-amber-500 to-yellow-500",
      lightBg: "bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      accent: "border-l-amber-500",
      badge: "bg-amber-100 text-amber-700",
    },
  ]

  return (
    <>
    <DashboardWrapper>

      {/* Hero Header Banner */}
      <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white" />
          <div className="absolute -bottom-12 -left-4 h-48 w-48 rounded-full bg-white" />
          <div className="absolute top-4 right-32 h-20 w-20 rounded-full bg-white" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner border border-white/30">
              <span className="text-2xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.fullName}!</h1>
              <div className="mt-1 flex items-center gap-2 text-blue-100">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">{user?.branch}</span>
                <span className="text-blue-300">·</span>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm">Live Dashboard</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white backdrop-blur-sm transition-all"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statsLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="mt-4 h-3 w-20" />
                <Skeleton className="mt-2 h-7 w-16" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          statsCards.map((stat) => (
            <Card
              key={stat.title}
              className={`group relative overflow-hidden border-l-4 ${stat.accent} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}
            >
              <CardContent className="p-5">
                <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${stat.iconBg} shadow-sm`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div className="mt-3 space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{stat.title}</p>
                  <p className="text-xl font-extrabold text-foreground leading-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
                <div className={`absolute bottom-0 right-0 h-16 w-16 rounded-tl-full opacity-5 bg-gradient-to-br ${stat.gradient}`} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts — hidden for now */}
      <div className="mb-6 grid gap-6 md:grid-cols-2 hidden">
        <Card>
          <CardHeader>
            <CardTitle>Deposit Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: "Deposit Amount (₹K)",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={depositData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs text-muted-foreground" />
                  <YAxis className="text-xs text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-1))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                approved: {
                  label: "Approved Loans",
                  color: "hsl(var(--chart-1))",
                },
                disbursed: {
                  label: "Disbursed Loans",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loanData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs text-muted-foreground" />
                  <YAxis className="text-xs text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="approved" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="disbursed" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/30 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-100">
                <Activity className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Recent Activities</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Latest transactions across all modules</p>
              </div>
            </div>
            {!activitiesLoading && activities.length > 0 && (
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs font-semibold px-3">
                {activities.length} records
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activitiesLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                <Clock className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-semibold text-foreground">No recent activities</p>
              <p className="text-sm text-muted-foreground mt-1">Transactions will appear here once recorded</p>
            </div>
          ) : (() => {
            const totalPages = Math.ceil(activities.length / PAGE_SIZE)
            const paged = activities.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
            return (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-800/30 hover:bg-slate-50/80">
                      <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Member</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Action</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Module</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Amount</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Time</TableHead>
                      <TableHead className="pr-6 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((activity, idx) => (
                      <TableRow
                        key={activity.id}
                        className="group transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
                      >
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-bold shadow-sm flex-shrink-0">
                              {activity.member?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className="font-semibold text-sm text-foreground">{activity.member}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground/80 py-3.5">{activity.action}</TableCell>
                        <TableCell className="py-3.5">
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold capitalize px-2.5 py-0.5 ${moduleColors[activity.module?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                          >
                            {activity.module}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-foreground py-3.5">{activity.amount}</TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3.5">{activity.time}</TableCell>
                        <TableCell className="pr-6 py-3.5">
                          <Badge
                            className={
                              activity.status === "completed" || activity.status === "active"
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs"
                                : activity.status === "pending"
                                ? "bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs"
                                : "bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs"
                            }
                          >
                            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                              activity.status === "completed" || activity.status === "active"
                                ? "bg-emerald-500"
                                : activity.status === "pending"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`} />
                            {activity.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 dark:bg-slate-800/20">
                  <span className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, activities.length)}</span> of <span className="font-semibold text-foreground">{activities.length}</span> records
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0 text-xs font-bold"
                    >
                      «
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={currentPage === 1}
                      className="h-7 px-3 text-xs font-medium"
                    >
                      ‹ Prev
                    </Button>
                    <span className="px-3 py-1 rounded-lg border bg-white dark:bg-slate-800 text-xs font-bold shadow-sm text-foreground min-w-[60px] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage === totalPages}
                      className="h-7 px-3 text-xs font-medium"
                    >
                      Next ›
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0 text-xs font-bold"
                    >
                      »
                    </Button>
                  </div>
                </div>
              </>
            )
          })()}
        </CardContent>
      </Card>

    </DashboardWrapper>
    </>
  )
}
