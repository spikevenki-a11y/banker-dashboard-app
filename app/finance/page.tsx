"use client"

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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

const monthlyData = [
  { month: "Jan", deposits: 22500, loans: 18000, revenue: 4500 },
  { month: "Feb", deposits: 24200, loans: 19500, revenue: 4700 },
  { month: "Mar", deposits: 26100, loans: 21000, revenue: 5100 },
  { month: "Apr", deposits: 28300, loans: 23500, revenue: 4800 },
  { month: "May", deposits: 30800, loans: 25200, revenue: 5600 },
  { month: "Jun", deposits: 33500, loans: 27800, revenue: 5700 },
  { month: "Jul", deposits: 35200, loans: 29500, revenue: 5700 },
  { month: "Aug", deposits: 37800, loans: 31200, revenue: 6600 },
  { month: "Sep", deposits: 39500, loans: 33800, revenue: 5700 },
  { month: "Oct", deposits: 42100, loans: 35500, revenue: 6600 },
  { month: "Nov", deposits: 44800, loans: 38200, revenue: 6600 },
  { month: "Dec", deposits: 48500, loans: 41000, revenue: 7500 },
]

const portfolioData = [
  { name: "Savings Accounts", value: 24500, color: "hsl(var(--chart-1))" },
  { name: "Fixed Deposits", value: 18200, color: "hsl(var(--chart-2))" },
  { name: "Active Loans", value: 15300, color: "hsl(var(--chart-3))" },
  { name: "Cash Reserves", value: 8200, color: "hsl(var(--chart-4))" },
]

const interestData = [
  { category: "Savings Interest", earned: 45200, paid: 42800, net: 2400 },
  { category: "FD Interest", earned: 28900, paid: 65400, net: -36500 },
  { category: "Loan Interest", earned: 128500, paid: 0, net: 128500 },
  { category: "Total", earned: 202600, paid: 108200, net: 94400 },
]

const revenueBreakdown = [
  { source: "Loan Interest", amount: "₹128,500", percentage: 63, trend: "up" },
  { source: "Account Fees", amount: "₹35,200", percentage: 17, trend: "up" },
  { source: "Service Charges", amount: "₹28,400", percentage: 14, trend: "down" },
  { source: "Other Income", amount: "₹12,500", percentage: 6, trend: "up" },
]

export default function FinancePage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Finance Management</h1>
              <p className="text-muted-foreground">Bank-wide financial overview and analytics</p>
            </div>
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

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <Wallet className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="text-teal-600">
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                    +12.5%
                  </Badge>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Deposits</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">₹48.5M</p>
                  <p className="mt-1 text-xs text-muted-foreground">Savings + Fixed Deposits</p>
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
                    +8.2%
                  </Badge>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Loans</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">₹41.0M</p>
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
                    +15.3%
                  </Badge>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Interest Earned</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">₹202.6K</p>
                  <p className="mt-1 text-xs text-muted-foreground">Total interest income</p>
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
                    -5.2%
                  </Badge>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Interest Paid</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">₹108.2K</p>
                  <p className="mt-1 text-xs text-muted-foreground">Total interest expense</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deposits-loans">Deposits vs Loans</TabsTrigger>
              <TabsTrigger value="interest">Interest Analysis</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Breakdown</TabsTrigger>
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
                          label: "Revenue",
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
                        cash: {
                          label: "Cash",
                          color: "hsl(var(--chart-4))",
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
                        <p className="text-2xl font-bold text-teal-600">₹202,600</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-teal-600" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted p-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Interest Paid</p>
                        <p className="text-2xl font-bold text-orange-600">₹108,200</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Net Interest Income</p>
                        <p className="text-3xl font-bold text-primary">₹94,400</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-primary" />
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
                      <span className="font-semibold">₹24.5M</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-teal-600" />
                        <span className="text-sm font-medium">Fixed Deposits</span>
                      </div>
                      <span className="font-semibold">₹18.2M</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <span className="text-sm font-semibold">Total Deposits</span>
                      <span className="text-lg font-bold text-foreground">₹42.7M</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Loan Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">Personal Loans</span>
                      </div>
                      <span className="font-semibold">₹12.5M</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">Business Loans</span>
                      </div>
                      <span className="font-semibold">₹15.3M</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Mortgage Loans</span>
                      </div>
                      <span className="font-semibold">₹13.2M</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <span className="text-sm font-semibold">Total Loans</span>
                      <span className="text-lg font-bold text-foreground">₹41.0M</span>
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
                        <TableHead>Interest Earned</TableHead>
                        <TableHead>Interest Paid</TableHead>
                        <TableHead>Net Interest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interestData.map((item) => (
                        <TableRow key={item.category} className={item.category === "Total" ? "font-semibold" : ""}>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-teal-600">${item.earned.toLocaleString()}</TableCell>
                          <TableCell className="text-orange-600">${item.paid.toLocaleString()}</TableCell>
                          <TableCell className={item.net >= 0 ? "text-teal-600" : "text-orange-600"}>
                            ${Math.abs(item.net).toLocaleString()}
                            {item.net < 0 && " (loss)"}
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
                      <h3 className="text-sm font-medium text-muted-foreground">Loan Interest</h3>
                      <p className="mt-1 text-2xl font-bold text-teal-600">₹128.5K</p>
                      <p className="mt-1 text-xs text-muted-foreground">63% of total income</p>
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
                      <p className="mt-1 text-2xl font-bold text-orange-600">₹65.4K</p>
                      <p className="mt-1 text-xs text-muted-foreground">60% of total expense</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg bg-blue-50 p-3">
                        <DollarSign className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Interest Margin</h3>
                      <p className="mt-1 text-2xl font-bold text-foreground">46.6%</p>
                      <p className="mt-1 text-xs text-muted-foreground">Net interest / Total earned</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Revenue Source</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueBreakdown.map((item) => (
                        <TableRow key={item.source}>
                          <TableCell className="font-medium">{item.source}</TableCell>
                          <TableCell className="font-semibold">{item.amount}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 rounded-full bg-muted">
                                <div className="h-2 rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
                              </div>
                              <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={item.trend === "up" ? "text-teal-600" : "text-orange-600"}
                            >
                              {item.trend === "up" ? (
                                <ArrowUpRight className="mr-1 h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="mr-1 h-3 w-3" />
                              )}
                              {item.trend === "up" ? "Increasing" : "Decreasing"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Revenue (YTD)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Year-to-Date Total</p>
                        <p className="mt-2 text-4xl font-bold text-primary">₹204,600</p>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="text-teal-600">
                          <ArrowUpRight className="mr-1 h-3 w-3" />
                          +18.5% vs last year
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Operating Efficiency</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Cost-to-Income Ratio</span>
                      <span className="text-lg font-semibold">42.3%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Return on Assets (ROA)</span>
                      <span className="text-lg font-semibold">1.85%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Return on Equity (ROE)</span>
                      <span className="text-lg font-semibold">12.5%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
