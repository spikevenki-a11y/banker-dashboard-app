"use client"

import { Card } from "@/components/ui/card"
import { Users, Wallet, FileText, CreditCard, TrendingUp, Shield } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
  console.log("[v0] DashboardPage - isAuthenticated:", isAuthenticated, "isLoading:", isLoading)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-600">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Banker Dashboard</span>
            </div>
            {/* Login button in navigation */}
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
              Enterprise Banking{" "}
              <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Management System
              </span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Complete financial management solution for modern banking institutions. Manage customers, deposits, loans,
              and financial analytics in one unified platform.
            </p>

            {/* Application and Login buttons */}
            <div className="flex flex-col gap-4 sm:flex-row justify-center">
              <Link href="/application">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Application
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                  Staff Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-foreground">
            Powerful Banking Features
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Member Management",
                description: "Comprehensive customer profiles with KYC compliance and account management.",
              },
              {
                icon: Wallet,
                title: "Savings Accounts",
                description: "Flexible savings products with interest calculations and transaction tracking.",
              },
              {
                icon: CreditCard,
                title: "Loan Management",
                description: "Streamlined loan application, approval, and EMI management system.",
              },
              {
                icon: FileText,
                title: "Fixed Deposits",
                description: "Secure fixed deposit products with maturity tracking and renewal options.",
              },
              {
                icon: TrendingUp,
                title: "Financial Analytics",
                description: "Real-time financial insights and comprehensive reporting dashboards.",
              },
              {
                icon: Shield,
                title: "Security & Compliance",
                description: "Enterprise-grade security with audit trails and compliance management.",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <feature.icon className="mb-4 h-8 w-8 text-blue-600" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-teal-600 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-white">
            Ready to Transform Your Banking Operations?
          </h2>
          <p className="mb-8 text-lg text-blue-50">
            Join modern financial institutions using our platform to streamline operations and enhance customer
            experience.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row justify-center">
            <Link href="/application">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Submit Application
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100">
                Staff Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="font-semibold text-foreground">Product</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Security
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Company</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Resources</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Legal</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    License
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Banker Dashboard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
