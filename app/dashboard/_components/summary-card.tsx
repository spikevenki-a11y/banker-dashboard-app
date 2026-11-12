import { Skeleton } from "@/components/ui/skeleton"
import { IconSlot, Panel } from "./panel"

type SummaryCardProps = {
  icon: string
  label: string
  value: string
  detail: string
  loading?: boolean
}

export function SummaryCard({ icon, label, value, detail, loading }: SummaryCardProps) {
  return (
    <Panel className="flex-row items-start">
      <IconSlot name={icon} slot={48} icon={24} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm leading-5 text-ardb-muted">{label}</p>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <p className="truncate text-2xl font-bold leading-8 text-ardb-ink">{value}</p>
            <p className="text-xs leading-4 text-ardb-muted">{detail}</p>
          </>
        )}
      </div>
    </Panel>
  )
}
