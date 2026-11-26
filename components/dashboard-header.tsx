"use client"

import { formatDate } from "@/lib/date-format"
import { formatCurrency } from "@/lib/number-format"
import { EyeOff, User, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CountBadge, DesignIcon } from "@/app/dashboard/_components/panel"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

// Figma: ARDB Homepage – Dev Handoff › Top bar — 72px white bar: search (left),
// then cash in hand, notifications and the profile menu (right).

type Identity = {
  name?: string
  role?: string
  initials?: string
  businessDate?: string
  branch_name?: string
}

const STORAGE_KEY_CASH_HIDDEN = "header-cash-hidden"

function useCashInHand() {
  const [cash, setCash] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/dashboard/cash-in-hand", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.cashInHand === "number") setCash(data.cashInHand)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return cash
}

export function DashboardHeader({ notificationCount = 0 }: { notificationCount?: number }) {
  const { logout } = useAuth()
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)

  const [identity, setIdentity] = useState<Identity | null>(null)
  useEffect(() => {
    fetch("/api/auth/identity", { credentials: "include" })
      .then((r) => r.json())
      .then(setIdentity)
      .catch(() => setIdentity(null))
  }, [])

  const cashInHand = useCashInHand()
  // Eye toggle: hide the cash figure (remembered on this device)
  const [cashHidden, setCashHidden] = useState(false)
  useEffect(() => {
    try {
      setCashHidden(window.localStorage.getItem(STORAGE_KEY_CASH_HIDDEN) === "1")
    } catch {}
  }, [])
  const toggleCash = () =>
    setCashHidden((hidden) => {
      try {
        window.localStorage.setItem(STORAGE_KEY_CASH_HIDDEN, hidden ? "0" : "1")
      } catch {}
      return !hidden
    })

  // Ctrl+K / ⌘K focuses the search box, as the shortcut hint says
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-6 border-b border-ardb-border bg-ardb-surface px-4 md:px-8">
      {/* Search */}
      <label className="flex h-10 w-full min-w-0 max-w-[480px] cursor-text items-center gap-2 rounded-lg border border-ardb-border bg-ardb-subtle px-3 focus-within:ring-2 focus-within:ring-sidebar-ring">
        <DesignIcon name="search" size={20} />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search members, accounts, loans, transactions…"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-sm leading-5 text-ardb-ink outline-none placeholder:text-ardb-muted"
        />
        <kbd className="hidden whitespace-nowrap font-sans text-xs leading-4 text-ardb-muted sm:inline">Ctrl K</kbd>
      </label>

      {/* Branch and business date (not in the design; kept so staff always see them) */}
      <div className="hidden shrink-0 items-center gap-2 xl:flex">
        {identity?.branch_name && (
          <span className="rounded-full bg-ardb-icon-surface px-3 py-1 text-xs font-medium leading-4 text-ardb-brand">
            {identity.branch_name}
          </span>
        )}
        <span
          className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium leading-4 text-red-600"
          title="Business date"
        >
          {formatDate(identity?.businessDate, "No Date")}
        </span>
      </div>

      <div className="min-w-0 flex-1" />

      {/* Cash in hand */}
      <div className="hidden shrink-0 items-center gap-3 lg:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ardb-icon-surface">
          <DesignIcon name="cash" size={20} />
        </div>
        <div className="flex flex-col whitespace-nowrap">
          <span className="text-xs leading-4 text-ardb-muted">Cash in hand</span>
          <span className="text-sm font-medium leading-5 text-ardb-ink tabular-nums">
            {cashInHand === null ? "—" : cashHidden ? "₹ ••••••" : formatCurrency(cashInHand)}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleCash}
          title={cashHidden ? "Show cash in hand" : "Hide cash in hand"}
          aria-label={cashHidden ? "Show cash in hand" : "Hide cash in hand"}
          aria-pressed={cashHidden}
          className="flex h-6 w-6 items-center justify-center rounded text-ardb-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          {cashHidden ? <EyeOff className="h-5 w-5" strokeWidth={1.75} /> : <DesignIcon name="show" size={20} />}
        </button>
      </div>

      {/* Notifications */}
      <button
        type="button"
        title="Notifications"
        aria-label={notificationCount > 0 ? `Notifications (${notificationCount})` : "Notifications"}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ardb-icon-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <DesignIcon name="notification" size={20} />
        {notificationCount > 0 && (
          <CountBadge count={notificationCount} className="absolute -top-2 left-6" />
        )}
      </button>

      {/* Profile menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex shrink-0 items-center gap-3 rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ardb-brand text-sm font-medium leading-5 text-white">
              {identity?.initials || "U"}
            </span>
            <span className="hidden flex-col whitespace-nowrap sm:flex">
              <span className="text-sm font-medium leading-5 text-ardb-ink">{identity?.name || "User"}</span>
              <span className="text-xs leading-4 text-ardb-muted">{identity?.role || "Staff"}</span>
            </span>
            <DesignIcon name="chevron-down" size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
