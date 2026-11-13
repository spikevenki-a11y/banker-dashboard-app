import Image from "next/image"
import type React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Icons exported from the ARDB Homepage Figma file live in /public/assets/dashboard. */
export function DesignIcon({
  name,
  size = 24,
  height,
  className,
}: {
  name: string
  size?: number
  /** Only for non-square assets; defaults to `size`. */
  height?: number
  className?: string
}) {
  return (
    <Image
      src={`/assets/dashboard/${name}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={height ?? size}
      className={cn("shrink-0", className)}
    />
  )
}

/** Pale circular slot that holds a design icon (40px in panels, 48px on summary cards). */
export function IconSlot({ name, slot = 40, icon = 20 }: { name: string; slot?: number; icon?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-ardb-icon-surface"
      style={{ width: slot, height: slot }}
    >
      <DesignIcon name={name} size={icon} />
    </div>
  )
}

/** White bordered card used by every block on the homepage: padding 24, gap 16, radius 12. */
export function Panel({ className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn("gap-4 border-ardb-border bg-ardb-surface p-6 text-ardb-ink shadow-none", className)}
      {...props}
    />
  )
}

export function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold leading-6 text-ardb-ink", className)} {...props} />
}

export function PanelSubtitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs leading-4 text-ardb-muted", className)} {...props} />
}

/** Colour swatch + label, as used in chart legends. */
export function LegendItem({ swatch, label, className }: { swatch: string; label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DesignIcon name={`swatch-${swatch}`} size={8} />
      <span className="whitespace-nowrap text-xs leading-4 text-ardb-muted">{label}</span>
    </div>
  )
}

/** Red rounded count pill. Min 24×24, grows with digits. */
export function CountBadge({ count, className }: { count: number | string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-ardb-danger px-2 text-xs font-semibold leading-4 text-white",
        className,
      )}
    >
      {count}
    </span>
  )
}
