import Link from "next/link"
import { DesignIcon, IconSlot, Panel, PanelTitle } from "./panel"

const ACTIONS = [
  { label: "New member", icon: "new-member", href: "/members/enroll" },
  { label: "Open SB account", icon: "bank", href: "/savings/open_account" },
  { label: "Loan application", icon: "loan-application", href: "/loans/apply" },
  { label: "Interest payment", icon: "interest", href: "/fixed-deposits/interest-payment" },
  { label: "Voucher pass", icon: "voucher", href: "/fas/verify-vouchers" },
  { label: "Generate report", icon: "report", href: "/reports" },
]

export function QuickActionsCard() {
  return (
    <Panel className="@container">
      <div className="flex items-center gap-3">
        <PanelTitle className="flex-1">Quick actions</PanelTitle>
        <Link
          href="/settings"
          aria-label="Quick action settings"
          title="Quick action settings"
          className="rounded-md p-0.5 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ardb-brand"
        >
          <DesignIcon name="settings" size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 @[20rem]:gap-4">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex h-[104px] flex-col items-center justify-center gap-2 rounded-lg border border-ardb-border bg-ardb-subtle px-1.5 py-3 text-center transition-colors hover:border-ardb-brand/40 hover:bg-ardb-icon-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ardb-brand @[20rem]:p-3"
          >
            <IconSlot name={action.icon} slot={40} icon={24} />
            <span className="text-xs font-semibold leading-4 text-ardb-ink">{action.label}</span>
          </Link>
        ))}
      </div>
    </Panel>
  )
}
