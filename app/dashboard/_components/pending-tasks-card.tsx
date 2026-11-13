import { CountBadge, IconSlot, Panel, PanelTitle } from "./panel"

export type PendingTask = { label: string; count: number }

export function PendingTasksCard({ tasks }: { tasks: PendingTask[] }) {
  return (
    <Panel className="gap-2">
      <div className="flex items-center gap-3">
        <IconSlot name="tasks" />
        <PanelTitle className="flex-1">Pending tasks</PanelTitle>
      </div>

      <ul className="flex flex-col">
        {tasks.map((task) => (
          <li key={task.label} className="flex h-12 items-center gap-3 border-b border-ardb-border">
            <span className="min-w-0 flex-1 text-sm leading-5 text-ardb-ink">{task.label}</span>
            <CountBadge count={task.count} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}
