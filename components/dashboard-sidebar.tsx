"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  CreditCard,
  TrendingUp,
  Settings,
  Building2,
  Calculator,
  BarChart3,
  ShieldAlert,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Admin",
    icon: ShieldAlert,
    href: "/admin",
    requiresAdmin: true,
  },
  {
    label: "Members",
    icon: Users,
    href: "/members",
  },
  {
    label: "Savings",
    icon: Wallet,
    href: "/savings",
  },
  {
    label: "Fixed Deposits",
    icon: FileText,
    href: "/fixed-deposits",
  },
  {
    label: "Loans",
    icon: CreditCard,
    href: "/loans",
  },
  {
    label: "Bank Level",
    icon: Calculator,
    href: "/bank-level",
  },
  {
    label: "FAS",
    icon: Calculator,
    href: "/fas",
  },
  {
    label: "Finance",
    icon: TrendingUp,
    href: "/finance",
  },
  {
    label: "Reports",
    icon: BarChart3,
    href: "/reports",
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const visibleRoutes = routes.filter((route: any) => {
    if (route.requiresAdmin) {
      return user?.role === "admin"
    }
    return true
  })

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Building2 className="h-6 w-6 text-sidebar-primary" />
        <span className="ml-2 text-lg font-semibold text-sidebar-foreground">NextZen</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === route.href
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <route.icon className="h-5 w-5" />
            {route.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <Link
          href="/settings"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </div>
  )
}
