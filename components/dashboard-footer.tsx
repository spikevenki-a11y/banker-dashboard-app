"use client"

import { useEffect, useState } from "react"
import { formatDateTime } from "@/lib/date-format"

// Figma: ARDB Homepage – Dev Handoff › Footer — full-width bar under the sidebar and
// main area: release / version (left), vendor credit (centre), last login (right).

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? ""
/** Optional: where "Release notes" links to. Without it the label shows as plain text. */
const RELEASE_NOTES_URL = process.env.NEXT_PUBLIC_RELEASE_NOTES_URL ?? ""

function useLastLogin() {
  const [lastLogin, setLastLogin] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/auth/last-login", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.lastLogin) setLastLogin(data.lastLogin)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return lastLogin
}

export function DashboardFooter() {
  const lastLogin = useLastLogin()

  return (
    <footer className="grid h-10 shrink-0 grid-cols-2 items-center gap-4 md:grid-cols-[1fr_auto_1fr] border-t border-ardb-border bg-ardb-surface px-8 text-xs leading-4 text-ardb-muted">
      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        {RELEASE_NOTES_URL ? (
          <a
            href={RELEASE_NOTES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ardb-brand hover:underline"
          >
            Release notes
          </a>
        ) : (
          <span className="font-semibold text-ardb-brand">Release notes</span>
        )}
        {APP_VERSION && <span>Version {APP_VERSION}</span>}
      </div>

      {/* Hidden on narrow screens so the bar never overflows */}
      <p className="hidden whitespace-nowrap text-center md:block">Powered by Srivari Information Technology</p>

      <p className="truncate text-right">
        {lastLogin && (
          <>
            Last login: <span className="font-bold">{formatDateTime(lastLogin)}</span>
          </>
        )}
      </p>
    </footer>
  )
}
