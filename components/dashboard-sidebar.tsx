"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"
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
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
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
    label: "Term Deposits",
    icon: FileText,
    href: "/fixed-deposits",
  },
  {
    label: "Lockers",
    icon: Lock,
    href: "/lockers",
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

// ── Collapsed state ─────────────────────────────────────────────────────────
// Each page renders its own DashboardWrapper, so the sidebar remounts on navigation.
// The preference lives outside React (and in localStorage) so every page shows the
// same state straight away, without a flash of the expanded sidebar.
const STORAGE_KEY = "sidebar-collapsed"
const NARROW_QUERY = "(max-width: 767px)" // below md the sidebar is always collapsed
const listeners = new Set<() => void>()
let collapsedPref: boolean | null = null

function readPref(): boolean {
  if (collapsedPref === null) {
    try {
      collapsedPref = window.localStorage.getItem(STORAGE_KEY) === "1"
    } catch {
      collapsedPref = false
    }
  }
  return collapsedPref
}

function setPref(value: boolean) {
  collapsedPref = value
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0")
  } catch {
    // storage unavailable: keep the in-memory value for this session
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const mq = window.matchMedia(NARROW_QUERY)
  mq.addEventListener("change", listener)
  // Keep other open tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      collapsedPref = e.newValue === "1"
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    mq.removeEventListener("change", listener)
    window.removeEventListener("storage", onStorage)
  }
}

const isNarrowScreen = () => window.matchMedia(NARROW_QUERY).matches

function useSidebarState() {
  const pref = useSyncExternalStore(subscribe, readPref, () => false)
  const isNarrow = useSyncExternalStore(subscribe, isNarrowScreen, () => false)
  return { collapsed: isNarrow || pref, isNarrow, toggle: () => setPref(!readPref()) }
}

const itemClass = (active: boolean, collapsed: boolean) =>
  cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    collapsed && "justify-center px-0",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  )

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { collapsed, isNarrow, toggle } = useSidebarState()

  const visibleRoutes = routes.filter((route: any) => {
    if (route.requiresAdmin) {
      return user?.role === "admin"
    }
    return true
  })

  return (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed ? "justify-center" : "pl-6 pr-3",
        )}
      >
        {/* Collapsed (wide screens): the expand button takes the logo's place */}
        {!(collapsed && !isNarrow) && <Building2 className="h-6 w-6 shrink-0 text-sidebar-primary" />}
        {!collapsed && <span className="ml-2 text-lg font-semibold text-sidebar-foreground">NextZen</span>}

        {/* Collapse / expand toggle — hidden on narrow screens, where the sidebar stays collapsed */}
        {!isNarrow && (
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !collapsed && "ml-auto",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        )}
      </div>

      <nav className={cn("min-h-0 flex-1 space-y-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {visibleRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            title={collapsed ? route.label : undefined}
            aria-label={collapsed ? route.label : undefined}
            className={itemClass(pathname === route.href, collapsed)}
          >
            <route.icon className="h-5 w-5 shrink-0" />
            {!collapsed && route.label}
          </Link>
        ))}
      </nav>

      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          aria-label={collapsed ? "Settings" : undefined}
          className={itemClass(pathname === "/settings", collapsed)}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && "Settings"}
        </Link>
      </div>
    </div>
  )
}
