import "server-only"
import type { PoolClient } from "pg"
import { MEMBER_EDIT_SECTIONS, type MemberEditSection } from "@/lib/member-profile-validation"

// Edit Member history (table member_edit_history, scripts/076_member_edit_history.sql).
// The PUT handler snapshots a tab's stored values before and after its UPDATE, inside
// the same transaction, and records one append-only row per field that changed.

// Edit-form field → database column, where they differ
const COLUMN_FOR_FIELD: Record<string, string> = {
  dccb_account_number: "dccbaccountnumber",
}

const SECTION_SOURCE: Record<MemberEditSection, { sql: string; byMembership: boolean }> = {
  personal: { sql: `SELECT to_jsonb(t) AS j FROM customers t WHERE t.customer_code = $1 LIMIT 1`, byMembership: false },
  address: { sql: `SELECT to_jsonb(t) AS j FROM customer_address t WHERE t.customer_code = $1 LIMIT 1`, byMembership: false },
  kyc: { sql: `SELECT to_jsonb(t) AS j FROM customer_kycdetails t WHERE t.customer_code = $1 LIMIT 1`, byMembership: false },
  membership: {
    sql: `SELECT to_jsonb(t) AS j FROM memberships t
          WHERE CAST(t.membership_no AS VARCHAR) = $1 AND CAST(t.branch_id AS VARCHAR) = $2 LIMIT 1`,
    byMembership: true,
  },
}

const norm = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim())

/** Current stored values of one tab's fields ("" when empty or no row exists). */
export async function readSectionSnapshot(
  client: PoolClient,
  section: MemberEditSection,
  ids: { customerCode: string; membershipNo: string; branchId: string }
): Promise<Record<string, string>> {
  const src = SECTION_SOURCE[section]
  const params = src.byMembership ? [ids.membershipNo, ids.branchId] : [ids.customerCode]
  const { rows } = await client.query(src.sql, params)
  const row: Record<string, unknown> = rows[0]?.j || {}
  const out: Record<string, string> = {}
  for (const f of MEMBER_EDIT_SECTIONS[section].fields) {
    out[f] = norm(row[COLUMN_FOR_FIELD[f] || f])
  }
  return out
}

/** Writes one history row per changed field. Returns how many fields changed. */
export async function recordSectionChanges(
  client: PoolClient,
  opts: {
    section: MemberEditSection
    before: Record<string, string>
    after: Record<string, string>
    branchId: string
    membershipNo: string
    customerCode: string
    userId: string | null
    userName: string | null
  }
): Promise<number> {
  const changed = MEMBER_EDIT_SECTIONS[opts.section].fields.filter((f) => opts.before[f] !== opts.after[f])
  if (changed.length === 0) return 0

  const { rows: [{ id: changeId }] } = await client.query(`SELECT gen_random_uuid() AS id`)
  for (const f of changed) {
    await client.query(
      `INSERT INTO member_edit_history
         (change_id, branch_id, membership_no, customer_code, section, field_name,
          old_value, new_value, changed_by, changed_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        changeId, opts.branchId, opts.membershipNo, opts.customerCode.trim(), opts.section, f,
        opts.before[f] || null, opts.after[f] || null, opts.userId, opts.userName,
      ]
    )
  }
  return changed.length
}
