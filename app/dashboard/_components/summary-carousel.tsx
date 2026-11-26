"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { SummaryCard } from "./summary-card"

export type SummaryItem = {
  icon: string
  label: string
  value: string
  detail: string
}

/** How many summary cards are on screen at once. */
const VISIBLE = 4

/**
 * Summary row: shows four cards at a time. When there are more, a Previous arrow sits on
 * the first visible card and a Next arrow on the last, each moving the window one card.
 */
export function SummaryCarousel({ items, loading }: { items: SummaryItem[]; loading?: boolean }) {
  const [start, setStart] = useState(0)
  const maxStart = Math.max(0, items.length - VISIBLE)
  const first = Math.min(start, maxStart)
  const visible = items.slice(first, first + VISIBLE)
  const paged = items.length > VISIBLE

  return (
    <section
      aria-label="Summary"
      aria-roledescription="carousel"
      className="grid gap-6 @xl:grid-cols-2 @5xl:grid-cols-4"
    >
      {visible.map((card, i) => (
        <div key={card.label} className="relative min-w-0">
          <SummaryCard {...card} loading={loading} />
          {paged && i === 0 && (
            <NavArrow
              direction="previous"
              disabled={first === 0}
              onClick={() => setStart(Math.max(0, first - 1))}
            />
          )}
          {paged && i === visible.length - 1 && (
            <NavArrow
              direction="next"
              disabled={first >= maxStart}
              onClick={() => setStart(Math.min(maxStart, first + 1))}
            />
          )}
        </div>
      ))}
    </section>
  )
}

function NavArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next"
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight
  const label = direction === "previous" ? "Previous summary cards" : "Next summary cards"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-ardb-border bg-ardb-surface text-ardb-brand shadow-sm transition-colors",
        "hover:bg-ardb-icon-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "disabled:cursor-not-allowed disabled:text-ardb-muted disabled:opacity-50 disabled:hover:bg-ardb-surface",
        direction === "previous" ? "-left-4" : "-right-4"
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  )
}
