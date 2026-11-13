"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LegendItem, Panel, PanelSubtitle, PanelTitle } from "./panel"

export type TrendPoint = { month: string; year: number; deposits: number; loans: number }

const chartConfig = {
  deposits: { label: "Deposits", color: "var(--ardb-chart-deposits)" },
  loans: { label: "Loans", color: "var(--ardb-chart-loans)" },
} satisfies ChartConfig

const PERIODS = [
  { value: "12", label: "Last 12 months" },
  { value: "6", label: "Last 6 months" },
]

export function TrendChartCard({ data }: { data: TrendPoint[] }) {
  const [period, setPeriod] = useState("12")

  const visible = useMemo(() => data.slice(-Number(period)), [data, period])

  // Y axis: design shows 0–200 in steps of 50; grow in steps of 50 if the data goes higher
  const ticks = useMemo(() => {
    const max = Math.max(0, ...visible.flatMap((d) => [d.deposits, d.loans]))
    const top = Math.max(200, Math.ceil(max / 50) * 50)
    return [0, 1, 2, 3, 4].map((i) => (top / 4) * i)
  }, [visible])

  const first = visible[0]
  const last = visible[visible.length - 1]

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
          <PanelTitle>Deposit &amp; loan trend</PanelTitle>
          {first && last && (
            <PanelSubtitle>
              Amount in ₹ lakhs · {first.month} {first.year} – {last.month} {last.year}
            </PanelSubtitle>
          )}
        </div>
        <LegendItem swatch="blue" label="Deposits" />
        <LegendItem swatch="green" label="Loans" />
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger
            size="sm"
            aria-label="Chart period"
            className="h-8 gap-2 rounded-lg border-ardb-border bg-transparent px-3 text-xs font-semibold text-ardb-ink shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[232px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-ardb-muted"
      >
        <BarChart data={visible} barGap={4} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--ardb-border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis
            width={32}
            ticks={ticks}
            domain={[0, ticks[4]]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
          />
          <ChartTooltip cursor={{ fill: "var(--ardb-subtle)" }} content={<ChartTooltipContent />} />
          <Bar dataKey="deposits" fill="var(--color-deposits)" radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="loans" fill="var(--color-loans)" radius={[4, 4, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ChartContainer>
    </Panel>
  )
}
