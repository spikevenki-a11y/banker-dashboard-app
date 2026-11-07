import type { PoolClient } from "pg"

// Deposit account status workflow (deposit_account.accountstatus → ref_account_status):
//   Pending (0) — set when the account is opened (Fixed Deposits → Create Deposit).
//   Active  (1) — set automatically when the account's first DEPOSIT credit is verified
//                 (FAS → Verify Voucher), i.e. once the initial deposit is completed.
// A credit that is rejected (or never posted) leaves the account Pending.
export const DEPOSIT_STATUS = {
  PENDING: 0,
  ACTIVE: 1,
} as const

/** Statuses that can receive a deposit credit: Pending (initial deposit) and Active. */
export const DEPOSIT_CREDIT_STATUSES: number[] = [DEPOSIT_STATUS.PENDING, DEPOSIT_STATUS.ACTIVE]

/**
 * Pending → Active after a completed deposit credit. Only a Pending account is
 * changed, so it runs at most once per account and never touches an account that
 * is already Active, Matured, Closed, Rejected, etc. Run inside the caller's transaction.
 */
export async function activatePendingDepositAccount(
  client: PoolClient,
  opts: { accountNumber: string | number; branchId: string | number }
): Promise<boolean> {
  const { rowCount } = await client.query(
    `UPDATE deposit_account
     SET accountstatus = $1
     WHERE CAST(accountnumber AS TEXT) = $2 AND branch_id = $3 AND accountstatus = $4`,
    [DEPOSIT_STATUS.ACTIVE, String(opts.accountNumber), opts.branchId, DEPOSIT_STATUS.PENDING]
  )
  return (rowCount ?? 0) > 0
}
