"use client"

import { Cell, Pie, PieChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { LegendItem, Panel, PanelSubtitle, PanelTitle } from "./panel"

export type DepositSegment = {
  key: string
  color: "blue" | "green" | "amber" | "violet" // matches swatch-<color>.svg
  label: string
  amount: number
}

const COLORS: Record<DepositSegment["color"], string> = {
  blue: "var(--ardb-chart-deposits)",
  green: "var(--ardb-chart-loans)",
  amber: "var(--ardb-chart-recurring)",
  violet: "var(--ardb-chart-mfd)",
}

// Donut geometry: a 160px ring, 16px thick, leaving a 128px hole for the total
const CHART_SIZE = 160
const OUTER_RADIUS = CHART_SIZE / 2
const INNER_RADIUS = OUTER_RADIUS - 16

/** Short Indian-style figure for the donut centre (₹18.76 Cr, ₹4.82 L); the legend keeps the exact amount. */
function formatShort(amount: number, formatAmount: (amount: number) => string) {
  const abs = Math.abs(amount)
  if (abs >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`
  return formatAmount(amount)
}

type DepositMixCardProps = {
  segments: DepositSegment[]
  formatAmount: (amount: number) => string
  loading?: boolean
}

export function DepositMixCard({ segments, formatAmount, loading }: DepositMixCardProps) {
  const total = segments.reduce((sum, s) => sum + s.amount, 0)
  const config: ChartConfig = Object.fromEntries(segments.map((s) => [s.label, { label: s.label, color: COLORS[s.color] }]))
  // Recharts draws nothing for an all-zero series, so show an empty ring instead
  const pieData = total > 0 ? segments.map((s) => ({ ...s, fill: COLORS[s.color] })) : [{ key: "empty", label: "No deposits", amount: 1, fill: "var(--ardb-border)" }]

  return (
    <Panel>
      <div className="flex flex-col gap-1">
        <PanelTitle>Deposit mix</PanelTitle>
        <PanelSubtitle>Share of total deposits by scheme</PanelSubtitle>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="relative mx-auto shrink-0 sm:mx-0" style={{ width: CHART_SIZE, height: CHART_SIZE }}>
          {loading ? (
            <Skeleton className="size-full rounded-full" />
          ) : (
            <ChartContainer config={config} className="aspect-square size-full">
              <PieChart>
                {total > 0 && (
                  <ChartTooltip
                    // Keep the hover tooltip above the centre total
                    wrapperStyle={{ zIndex: 10 }}
                    content={<ChartTooltipContent hideLabel nameKey="label" formatter={(v, name) => `${name}: ${formatAmount(Number(v))}`} />}
                  />
                )}
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={INNER_RADIUS}
                  outerRadius={OUTER_RADIUS}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {pieData.map((s) => (
                    <Cell key={s.key} fill={s.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
          {!loading && (
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-6 text-center"
            >
              <span className="max-w-full truncate text-base font-semibold leading-6 text-ardb-ink tabular-nums">
                {formatShort(total, formatAmount)}
              </span>
              <span className="text-xs leading-4 text-ardb-muted">Total deposits</span>
            </div>
          )}
        </div>

        <ul className="flex min-w-[140px] flex-1 flex-col gap-3">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <LegendItem swatch={s.color} label={s.label} className="flex-1" />
              {loading ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                <span className="whitespace-nowrap text-xs font-semibold leading-4 text-ardb-ink">{formatAmount(s.amount)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}
