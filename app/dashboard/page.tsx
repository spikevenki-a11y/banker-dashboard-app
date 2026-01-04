"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Wallet, FileText, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

const stats = [
  {
    title: "Total Members",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Active Loans",
    value: "458",
    change: "+8.2%",
    trend: "up",
    icon: CreditCard,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Total Deposits",
    value: "₹24.5L",
    change: "+15.3%",
    trend: "up",
    icon: Wallet,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
  {
    title: "Fixed Deposits",
    value: "₹18.2L",
    change: "-2.4%",
    trend: "down",
    icon: FileText,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
]

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

const recentActivities = [
  {
    id: "1",
    member: "Vengatesh",
    action: "Opened Savings Account",
    amount: "₹5,000",
    time: "2 minutes ago",
    status: "completed",
  },
  {
    id: "2",
    member: "Priya",
    action: "Loan Application",
    amount: "₹50,000",
    time: "15 minutes ago",
    status: "pending",
  },
  {
    id: "3",
    member: "Surya",
    action: "FD Matured",
    amount: "₹25,000",
    time: "1 hour ago",
    status: "completed",
  },
  {
    id: "4",
    member: "Sudharsan",
    action: "Withdrawal",
    amount: "₹2,500",
    time: "2 hours ago",
    status: "completed",
  },
  {
    id: "5",
    member: "Muniyandi",
    action: "EMI Payment",
    amount: "₹1,250",
    time: "3 hours ago",
    status: "completed",
  },
]

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">
          Monitoring banking operations for <span className="font-semibold text-primary">{user?.branch}</span>.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <Badge variant="secondary" className={stat.trend === "up" ? "text-teal-600" : "text-orange-600"}>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  )}
                  {stat.change}
                </Badge>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
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
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">{activity.member}</TableCell>
                  <TableCell>{activity.action}</TableCell>
                  <TableCell>{activity.amount}</TableCell>
                  <TableCell className="text-muted-foreground">{activity.time}</TableCell>
                  <TableCell>
                    <Badge
                      variant={activity.status === "completed" ? "default" : "secondary"}
                      className={
                        activity.status === "completed" ? "bg-teal-100 text-teal-700" : "bg-orange-100 text-orange-700"
                      }
                    >
                      {activity.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
