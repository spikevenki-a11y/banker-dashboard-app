import type { PoolClient } from "pg"

// Savings account nominees are stored in nominee_details (scripts/070_nominee_details.sql).
// Each row is linked to the savings account by (branch_id, account_number) and to the
// account holder by member_id (the holder's membership number). is_member stays false
// because the savings screens do not capture a member nominee.

export const MAX_SAVINGS_NOMINEES = 4

export type SavingsNomineeInput = { name: string; relation: string }

// Trims, drops empty rows and caps the list at MAX_SAVINGS_NOMINEES
export function cleanNominees(nominees: unknown): SavingsNomineeInput[] {
  if (!Array.isArray(nominees)) return []
  return nominees
    .filter((n: any) => typeof n?.name === "string" && n.name.trim() && typeof n?.relation === "string" && n.relation.trim())
    .slice(0, MAX_SAVINGS_NOMINEES)
    .map((n: any) => ({ name: n.name.trim(), relation: n.relation.trim() }))
}

// Replaces the account's nominees. Must run inside the caller's transaction.
export async function saveSavingsNominees(
  client: PoolClient,
  opts: { branchId: number | string; accountNumber: string; membershipNo: number | string | null; nominees: SavingsNomineeInput[] }
) {
  const branchId = String(opts.branchId)
  const accountNumber = String(opts.accountNumber)

  await client.query(
    `DELETE FROM nominee_details WHERE branch_id = $1 AND account_number = $2`,
    [branchId, accountNumber]
  )

  for (const n of opts.nominees) {
    // clock_timestamp() (not NOW()) so rows inserted in one transaction keep their entry order
    await client.query(
      `INSERT INTO nominee_details (
         branch_id, account_number, is_member, member_id,
         nominee_name, nominee_relation, created_at, updated_at
       ) VALUES ($1, $2, false, $3, $4, $5, clock_timestamp(), clock_timestamp())`,
      [
        branchId,
        accountNumber,
        opts.membershipNo != null && opts.membershipNo !== "" ? String(opts.membershipNo) : null,
        n.name.slice(0, 100),
        n.relation.slice(0, 50),
      ]
    )
  }
}
