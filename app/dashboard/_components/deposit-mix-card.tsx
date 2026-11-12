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
        <div className="relative size-32 shrink-0">
          {loading ? (
            <Skeleton className="size-32 rounded-full" />
          ) : (
            <ChartContainer config={config} className="aspect-square size-32">
              <PieChart>
                {total > 0 && (
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel nameKey="label" formatter={(v, name) => `${name}: ${formatAmount(Number(v))}`} />}
                  />
                )}
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={64}
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
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-xs leading-4">
              <span className="font-semibold text-ardb-ink">{formatAmount(total)}</span>
              <span className="text-ardb-muted">Total</span>
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
