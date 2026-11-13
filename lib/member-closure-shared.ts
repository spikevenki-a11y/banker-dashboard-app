// Member Closure constants and types used by both the browser (app/members/closure)
// and the server (lib/member-closure.ts, app/api/members/closure).

export type ClosureBlocker = {
  module: string
  account_number: string
  account_type: string
  status: string
  /** Balance held / outstanding, where the module keeps one (null otherwise) */
  outstanding: number | null
  branch_id: string | null
}

export const MEMBER_CLOSURE_BLOCKED_MSG =
  "Member closure cannot be completed. Please close all active and pending accounts before proceeding."

export const MEMBER_CLOSURE_REASONS = [
  { value: "MEMBER_REQUEST", label: "Member Request" },
  { value: "DECEASED", label: "Deceased" },
  { value: "RELOCATION", label: "Relocation" },
  { value: "INACTIVE", label: "Inactive Membership" },
  { value: "OTHER", label: "Other" },
] as const

export const isMemberClosureReason = (v: unknown) => MEMBER_CLOSURE_REASONS.some((r) => r.value === v)

export const memberClosureReasonLabel = (v: string | null | undefined) =>
  MEMBER_CLOSURE_REASONS.find((r) => r.value === v)?.label || String(v || "")
