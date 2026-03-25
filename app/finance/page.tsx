"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  FileText,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  IndianRupee,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardWrapper } from "../_components/dashboard-wrapper"
import { Skeleton } from "@/components/ui/skeleton"

interface FinanceStats {
  stats: {
    totalDeposits: number
    savingsTotal: number
    fdTotal: number
    totalLoans: number
    interestEarned: number
    interestPaid: number
    netInterestIncome: number
    interestMargin: string | number
  }
  monthlyData: Array<{
    month: string
    deposits: number
    loans: number
    income: number
    expenses: number
    revenue: number
  }>
  portfolioData: Array<{
    name: string
    value: number
    color: string
  }>
  incomeByCategory: Array<{
    name: string
    balance: number
    total: number
  }>
  expensesByCategory: Array<{
    name: string
    balance: number
    total: number
  }>
  todaysSummary: {
    transactionCount: number
    totalCredits: number
    totalDebits: number
  }
}

interface InterestAnalysis {
  interestData: Array<{
    category: string
    earned: number
    paid: number
    net: number
  }>
  totalInterestEarned: number
  totalInterestPaid: number
  netInterest: number
  interestMargin: string | number
  loanInterestEarned: number
  fdInterestPaid: number
  savingsInterestPaid: number
  borrowingInterestPaid: number
  revenueBreakdown: Array<{
    source: string
    amount: number
    percentage: number
    trend: string
  }>
  expenseBreakdown: Array<{
    source: string
    amount: number
    percentage: number
  }>
  totalIncome: number
  totalExpense: number
  netRevenue: number
}

// Format currency in Indian Rupees
const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`
  }
  return `₹${amount.toLocaleString("en-IN")}`
}

const formatFullCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

export default function FinancePage() {
  const [stats, setStats] = useState<FinanceStats | null>(null)
  const [interestAnalysis, setInterestAnalysis] = useState<InterestAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const [statsRes, interestRes] = await Promise.all([
        fetch("/api/finance/stats"),
        fetch("/api/finance/interest-analysis")
      ])

      if (!statsRes.ok || !interestRes.ok) {
        throw new Error("Failed to fetch finance data")
      }

      const [statsData, interestData] = await Promise.all([
        statsRes.json(),
        interestRes.json()
      ])

      setStats(statsData)
      setInterestAnalysis(interestData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Default data for charts when no data is available
  const defaultMonthlyData = [
    { month: "Jan", deposits: 0, loans: 0, revenue: 0 },
    { month: "Feb", deposits: 0, loans: 0, revenue: 0 },
    { month: "Mar", deposits: 0, loans: 0, revenue: 0 },
    { month: "Apr", deposits: 0, loans: 0, revenue: 0 },
    { month: "May", deposits: 0, loans: 0, revenue: 0 },
    { month: "Jun", deposits: 0, loans: 0, revenue: 0 },
    { month: "Jul", deposits: 0, loans: 0, revenue: 0 },
    { month: "Aug", deposits: 0, loans: 0, revenue: 0 },
    { month: "Sep", deposits: 0, loans: 0, revenue: 0 },
    { month: "Oct", deposits: 0, loans: 0, revenue: 0 },
    { month: "Nov", deposits: 0, loans: 0, revenue: 0 },
    { month: "Dec", deposits: 0, loans: 0, revenue: 0 },
  ]

  const defaultPortfolioData = [
    { name: "Savings Accounts", value: 0, color: "hsl(var(--chart-1))" },
    { name: "Fixed Deposits", value: 0, color: "hsl(var(--chart-2))" },
    { name: "Active Loans", value: 0, color: "hsl(var(--chart-3))" },
  ]

  const defaultInterestData = [
    { category: "Savings Interest", earned: 0, paid: 0, net: 0 },
    { category: "FD Interest", earned: 0, paid: 0, net: 0 },
    { category: "Loan Interest", earned: 0, paid: 0, net: 0 },
    { category: "Total", earned: 0, paid: 0, net: 0 },
  ]

  const monthlyData = stats?.monthlyData?.length ? stats.monthlyData : defaultMonthlyData
  const portfolioData = stats?.portfolioData?.length ? stats.portfolioData : defaultPortfolioData
  const interestData = interestAnalysis?.interestData?.length ? interestAnalysis.interestData : defaultInterestData
  const revenueBreakdown = interestAnalysis?.revenueBreakdown || []

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex h-screen overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-background p-6">
              <div className="mb-6">
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-80" />
              </div>
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-[400px] w-full" />
            </main>
          </div>
        </div>
      </DashboardWrapper>
    )
  }

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Finance Management</h1>
                <p className="text-muted-foreground">Bank-wide financial overview and analytics</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Select defaultValue="2024">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">Year 2024</SelectItem>
                    <SelectItem value="2023">Year 2023</SelectItem>
                    <SelectItem value="2022">Year 2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <Wallet className="h-6 w-6 text-blue-600" />
                    </div>
                    <Badge variant="secondary" className="text-teal-600">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Deposits</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {formatCurrency(stats?.stats.totalDeposits || 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Savings: {formatCurrency(stats?.stats.savingsTotal || 0)} | FD: {formatCurrency(stats?.stats.fdTotal || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-purple-50 p-3">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                    <Badge variant="secondary" className="text-teal-600">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Loans</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {formatCurrency(stats?.stats.totalLoans || 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Outstanding loan balance</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-teal-50 p-3">
                      <TrendingUp className="h-6 w-6 text-teal-600" />
                    </div>
                    <Badge variant="secondary" className="text-teal-600">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      Income
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {formatCurrency(interestAnalysis?.totalIncome || stats?.stats.interestEarned || 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">All income sources</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-orange-50 p-3">
                      <TrendingDown className="h-6 w-6 text-orange-600" />
                    </div>
                    <Badge variant="secondary" className="text-orange-600">
                      <ArrowDownRight className="mr-1 h-3 w-3" />
                      Expense
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {formatCurrency(interestAnalysis?.totalExpense || stats?.stats.interestPaid || 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">All expense categories</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="deposits-loans">Deposits vs Loans</TabsTrigger>
                <TabsTrigger value="interest">Interest Analysis</TabsTrigger>
                <TabsTrigger value="revenue">Revenue & Expenses</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          revenue: {
                            label: "Net Revenue",
                            color: "hsl(var(--chart-1))",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs text-muted-foreground" />
                            <YAxis className="text-xs text-muted-foreground" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                              type="monotone"
                              dataKey="revenue"
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
                      <CardTitle>Portfolio Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {portfolioData.some(item => item.value > 0) ? (
                        <ChartContainer
                          config={{
                            savings: {
                              label: "Savings",
                              color: "hsl(var(--chart-1))",
                            },
                            fd: {
                              label: "Fixed Deposits",
                              color: "hsl(var(--chart-2))",
                            },
                            loans: {
                              label: "Loans",
                              color: "hsl(var(--chart-3))",
                            },
                          }}
                          className="h-[300px]"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={portfolioData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {portfolioData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <ChartTooltip content={<ChartTooltipContent />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                          No portfolio data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Net Interest Margin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted p-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Interest Earned</p>
                          <p className="text-2xl font-bold text-teal-600">
                            {formatFullCurrency(interestAnalysis?.totalInterestEarned || 0)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-teal-600" />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted p-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Interest Paid</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatFullCurrency(interestAnalysis?.totalInterestPaid || 0)}
                          </p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-orange-600" />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Net Interest Income</p>
                          <p className="text-3xl font-bold text-primary">
                            {formatFullCurrency(interestAnalysis?.netInterest || 0)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Today's Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Today&apos;s Transaction Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Total Transactions</p>
                        <p className="mt-1 text-2xl font-bold">{stats?.todaysSummary?.transactionCount || 0}</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Total Credits</p>
                        <p className="mt-1 text-2xl font-bold text-teal-600">
                          {formatCurrency(stats?.todaysSummary?.totalCredits || 0)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Total Debits</p>
                        <p className="mt-1 text-2xl font-bold text-orange-600">
                          {formatCurrency(stats?.todaysSummary?.totalDebits || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deposits-loans" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deposits vs Loans Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        deposits: {
                          label: "Deposits",
                          color: "hsl(var(--chart-1))",
                        },
                        loans: {
                          label: "Loans",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                      className="h-[400px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs text-muted-foreground" />
                          <YAxis className="text-xs text-muted-foreground" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="deposits" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="loans" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Deposit Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Savings Accounts</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(stats?.stats.savingsTotal || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-teal-600" />
                          <span className="text-sm font-medium">Fixed Deposits</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(stats?.stats.fdTotal || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <span className="text-sm font-semibold">Total Deposits</span>
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrency(stats?.stats.totalDeposits || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Loan Portfolio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">Outstanding Loans</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(stats?.stats.totalLoans || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <span className="text-sm font-semibold">Total Loan Portfolio</span>
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrency(stats?.stats.totalLoans || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="interest" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Interest Income vs Expense</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Interest Earned</TableHead>
                          <TableHead className="text-right">Interest Paid</TableHead>
                          <TableHead className="text-right">Net Interest</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interestData.map((item) => (
                          <TableRow key={item.category} className={item.category === "Total" ? "font-semibold bg-muted/50" : ""}>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-right text-teal-600">
                              {formatFullCurrency(item.earned)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              {formatFullCurrency(item.paid)}
                            </TableCell>
                            <TableCell className={`text-right ${item.net >= 0 ? "text-teal-600" : "text-orange-600"}`}>
                              {formatFullCurrency(Math.abs(item.net))}
                              {item.net < 0 && " (expense)"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="rounded-lg bg-teal-50 p-3">
                          <TrendingUp className="h-6 w-6 text-teal-600" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Loan Interest Income</h3>
                        <p className="mt-1 text-2xl font-bold text-teal-600">
                          {formatCurrency(interestAnalysis?.loanInterestEarned || 0)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Primary income source</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="rounded-lg bg-orange-50 p-3">
                          <TrendingDown className="h-6 w-6 text-orange-600" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-muted-foreground">FD Interest Expense</h3>
                        <p className="mt-1 text-2xl font-bold text-orange-600">
                          {formatCurrency(interestAnalysis?.fdInterestPaid || 0)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Largest expense category</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="rounded-lg bg-blue-50 p-3">
                          <IndianRupee className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Interest Margin</h3>
                        <p className="mt-1 text-2xl font-bold text-foreground">
                          {interestAnalysis?.interestMargin || 0}%
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Net interest / Total earned</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="revenue" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Income Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueBreakdown.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Source</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Share</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {revenueBreakdown.map((item) => (
                              <TableRow key={item.source}>
                                <TableCell className="font-medium">{item.source}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatFullCurrency(item.amount)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-24 rounded-full bg-muted">
                                      <div 
                                        className="h-2 rounded-full bg-teal-500" 
                                        style={{ width: `${item.percentage}%` }} 
                                      />
                                    </div>
                                    <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                          No income data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Expense Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {interestAnalysis?.expenseBreakdown && interestAnalysis.expenseBreakdown.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Share</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {interestAnalysis.expenseBreakdown.map((item) => (
                              <TableRow key={item.source}>
                                <TableCell className="font-medium">{item.source}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatFullCurrency(item.amount)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-24 rounded-full bg-muted">
                                      <div 
                                        className="h-2 rounded-full bg-orange-500" 
                                        style={{ width: `${item.percentage}%` }} 
                                      />
                                    </div>
                                    <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                          No expense data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Total Revenue (YTD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Year-to-Date Total Income</p>
                          <p className="mt-2 text-4xl font-bold text-teal-600">
                            {formatFullCurrency(interestAnalysis?.totalIncome || 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Net Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Total Income</span>
                        <span className="text-lg font-semibold text-teal-600">
                          {formatCurrency(interestAnalysis?.totalIncome || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
                        <span className="text-lg font-semibold text-orange-600">
                          {formatCurrency(interestAnalysis?.totalExpense || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-4">
                        <span className="text-sm font-bold">Net Revenue</span>
                        <span className={`text-xl font-bold ${(interestAnalysis?.netRevenue || 0) >= 0 ? "text-teal-600" : "text-orange-600"}`}>
                          {formatCurrency(interestAnalysis?.netRevenue || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
