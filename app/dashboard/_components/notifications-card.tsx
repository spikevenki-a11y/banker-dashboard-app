import { DesignIcon, IconSlot, Panel, PanelTitle } from "./panel"

export type NotificationItem = {
  title: string
  detail: string
  status: "info" | "success" | "warning"
}

export function NotificationsCard({ items }: { items: NotificationItem[] }) {
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <IconSlot name="announcement" />
        <PanelTitle className="flex-1">Notifications</PanelTitle>
      </div>

      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <DesignIcon name={`dot-${item.status}`} size={8} height={14} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-sm font-medium leading-5 text-ardb-ink">{item.title}</p>
              <p className="text-xs leading-4 text-ardb-muted">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
