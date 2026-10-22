import type { PoolClient } from "pg"

export const APPRAISER_TRACKED_FIELDS = [
  "appraiser_code",
  "appraiser_name",
  "license_no",
  "license_valid_till",
  "mobile_no",
  "email",
  "address",
  "account_number",
  "account_type",
  "status",
] as const

export const APPRAISER_ACCOUNT_TYPES = [
  { value: "SAVINGS", label: "Savings" },
  { value: "SUNDRY_CREDITOR", label: "Sundry Creditor" },
  // { value: "CURRENT", label: "Current" },
  // { value: "CASH", label: "Cash" },
  // { value: "OTHER", label: "Other" },
] as const

// Returns an error message when the account details are invalid, otherwise null.
export function validateAccount(accountNumber: unknown, accountType: unknown) {
  const number = String(accountNumber ?? "").trim()
  if (number && !/^\d+$/.test(number)) return "Account number must contain digits only"
  if (accountType && !APPRAISER_ACCOUNT_TYPES.some((t) => t.value === accountType)) return "Invalid account type"
  return null
}

export type AppraiserSnapshot = Record<(typeof APPRAISER_TRACKED_FIELDS)[number], string | null>

// Returns { field: { old, new } } for every tracked field whose value differs.
export function diffAppraiser(before: AppraiserSnapshot, after: AppraiserSnapshot) {
  const changes: Record<string, { old: string | null; new: string | null }> = {}
  for (const field of APPRAISER_TRACKED_FIELDS) {
    const oldVal = before[field] ?? null
    const newVal = after[field] ?? null
    if (oldVal !== newVal) changes[field] = { old: oldVal, new: newVal }
  }
  return changes
}

// Status-only changes are labelled ACTIVATED / DEACTIVATED, anything else UPDATED.
export function historyAction(changes: Record<string, { old: string | null; new: string | null }>) {
  const fields = Object.keys(changes)
  if (fields.length === 1 && fields[0] === "status") {
    return changes.status.new === "ACTIVE" ? "ACTIVATED" : "DEACTIVATED"
  }
  return "UPDATED"
}

// Writes a history row from the current appraiser_master row (the post-change snapshot).
export async function recordAppraiserHistory(
  client: PoolClient,
  appraiserId: number,
  action: string,
  changes: Record<string, unknown> | null,
  changedBy: string
) {
  await client.query(
    `INSERT INTO appraiser_master_history
       (appraiser_id, branch_id, action, changes, appraiser_code, appraiser_name, license_no,
        license_valid_till, mobile_no, email, address, account_number, account_type, status, changed_by)
     SELECT appraiser_id, branch_id, $2, $3, appraiser_code, appraiser_name, license_no,
            license_valid_till, mobile_no, email, address, account_number, account_type, status, $4
     FROM appraiser_master WHERE appraiser_id = $1`,
    [appraiserId, action, changes ? JSON.stringify(changes) : null, changedBy]
  )
}
