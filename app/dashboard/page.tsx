"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Wallet, FileText, CreditCard, ArrowUpRight, ArrowDownRight, Clock, RefreshCw, Banknote, PiggyBank } from "lucide-react"
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

export default function DashboardPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const { user, isAuthenticated, isLoading } = useAuth()

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/activities?branchId=1&limit=10", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setActivities(data)
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats?branchId=1", { credentials: "include" })
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
      title: "Total Members",
      value: stats?.totalMembers?.toString() || "0",
      subtitle: `${stats?.activeMembers || 0} active`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Active Loans",
      value: stats?.activeLoans?.toString() || "0",
      subtitle: "Applications",
      icon: CreditCard,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Deposits",
      value: formatAmount(stats?.totalDeposits || 0),
      subtitle: "Savings + FD",
      icon: Wallet,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      title: "Fixed Deposits",
      value: stats?.fdCount?.toString() || "0",
      subtitle: "Active FDs",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Share Capital",
      value: formatAmount(stats?.totalShares || 0),
      subtitle: "Member shares",
      icon: PiggyBank,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Today's Transactions",
      value: stats?.todayTransactions?.toString() || "0",
      subtitle: "All modules",
      icon: Banknote,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Pending Vouchers",
      value: stats?.pendingVouchers?.toString() || "0",
      subtitle: "Awaiting approval",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ]

  return (
    <>
    <DashboardWrapper>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">
            Monitoring banking operations for <span className="font-semibold text-primary">{user?.branch}</span>.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statsLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="mt-4 h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          statsCards.map((stat) => (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-xs font-medium text-muted-foreground">{stat.title}</h3>
                  <p className="mt-1 text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts */}
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activities</CardTitle>
          <Badge variant="outline" className="text-xs">
            Last 10 transactions
          </Badge>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No recent activities found</p>
              <p className="text-sm text-muted-foreground/70">Transactions will appear here once recorded</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.member}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {activity.module}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{activity.amount}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{activity.time}</TableCell>
                    <TableCell>
                      <Badge
                        variant={activity.status === "completed" || activity.status === "active" ? "default" : "secondary"}
                        className={
                          activity.status === "completed" || activity.status === "active"
                            ? "bg-teal-100 text-teal-700"
                            : activity.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-orange-100 text-orange-700"
                        }
                      >
                        {activity.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </DashboardWrapper>
    </>
  )
}
