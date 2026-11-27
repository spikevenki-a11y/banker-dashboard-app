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
  Bot,
  Calculator,
  BarChart3,
  ShieldAlert,
  Lock,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { REPORT_LOGO_ALT, REPORT_LOGO_NATURAL, REPORT_LOGO_PATH } from "@/lib/print/report-logo"

/** NCARDB logo for the sidebar header; `className` sets its height (width follows). */
function SidebarLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={REPORT_LOGO_PATH}
      alt={REPORT_LOGO_ALT}
      width={REPORT_LOGO_NATURAL.width}
      height={REPORT_LOGO_NATURAL.height}
      className={cn("w-auto shrink-0 object-contain", className)}
    />
  )
}

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
    label: "Borrowings",
    icon: Landmark,
    href: "/bank-level/borrowings",
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

// Menu item (Figma sidebar): 36px tall, 6px radius, 20px icon, 12px gaps; the active
// item is filled with the brand blue
const itemClass = (active: boolean, collapsed: boolean) =>
  cn(
    "flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    collapsed && "justify-center px-0",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  )

const ICON_PROPS = { className: "h-5 w-5 shrink-0", strokeWidth: 1.75 } as const

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
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {collapsed ? (
        // Collapsed: small logo only
        <div className="flex h-[72px] shrink-0 items-center justify-center border-b border-sidebar-border bg-ardb-surface">
          {!isNarrow ? (
            // Wide screens: hovering or focusing the logo swaps in the expand icon;
            // clicking expands the sidebar
            <button
              type="button"
              onClick={toggle}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              aria-expanded={false}
              className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <SidebarLogo className="h-8 transition-all duration-200 group-hover:scale-75 group-hover:opacity-0 group-focus-visible:scale-75 group-focus-visible:opacity-0" />
              <PanelLeftOpen className="absolute h-5 w-5 scale-75 text-sidebar-accent-foreground opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100" />
            </button>
          ) : (
            <SidebarLogo className="h-8" />
          )}
        </div>
      ) : (
        // Expanded: brand block — emblem, name and tagline, then a divider (Figma "Brand")
        <div className="relative shrink-0 bg-ardb-surface px-6 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <SidebarLogo className="h-32" />
            <p className="text-xl font-bold leading-7 text-ardb-ink">TNSCARDB</p>
            <p className="text-xs leading-4 text-ardb-muted">People · Agriculture · Prosperity</p>
          </div>
          <div className="mt-6 h-px bg-ardb-border" />

          {/* Collapse toggle — hidden on narrow screens, where the sidebar stays collapsed */}
          {!isNarrow && (
            <button
              type="button"
              onClick={toggle}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              aria-expanded={true}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-ardb-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <nav className={cn("min-h-0 flex-1 space-y-[5px] overflow-y-auto py-4", collapsed ? "px-2" : "pl-[15px] pr-[5px]")}>
        {visibleRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            title={collapsed ? route.label : undefined}
            aria-label={collapsed ? route.label : undefined}
            className={itemClass(pathname === route.href, collapsed)}
          >
            <route.icon {...ICON_PROPS} />
            {!collapsed && route.label}
          </Link>
        ))}
      </nav>

      <div className={cn("space-y-[5px] border-t border-sidebar-border py-3", collapsed ? "px-2" : "pl-[15px] pr-[5px]")}>
        <Link
          href="/report-bot"
          title={collapsed ? "Report bot" : undefined}
          aria-label={collapsed ? "Report bot" : undefined}
          className={itemClass(pathname === "/report-bot" || pathname.startsWith("/report-bot/"), collapsed)}
        >
          <Bot {...ICON_PROPS} />
          {!collapsed && "Report bot"}
        </Link>
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          aria-label={collapsed ? "Settings" : undefined}
          className={itemClass(pathname === "/settings", collapsed)}
        >
          <Settings {...ICON_PROPS} />
          {!collapsed && "Settings"}
        </Link>
      </div>
    </div>
  )
}
