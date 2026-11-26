import type { PoolClient } from "pg"
import { sub, toPaise, toRupees, toSql } from "./money"

export class InsufficientSharesError extends Error {
  readonly status = 400
  constructor(message: string) {
    super(message)
    this.name = "InsufficientSharesError"
  }
}

// share_balance on member_shares is the approved balance; it only moves when a
// voucher is approved. Withdrawals waiting for approval are member_share_transactions
// rows with status PENDING and a debit_amount.

// Locks the member's share row and returns approved balance, pending withdrawals,
// and what is still available to withdraw. Call inside an open transaction.
export async function lockShareBalance(
  client: PoolClient,
  membershipNo: string,
  branchId: string | number
): Promise<{ approved: number; pendingWithdrawals: number; available: number } | null> {
  const { rows: [share] } = await client.query(
    `SELECT COALESCE(share_balance, 0) AS share_balance
       FROM member_shares
      WHERE membership_no = $1 AND branch_id = $2 AND status = 'ACTIVE'
      FOR UPDATE`,
    [membershipNo, branchId]
  )
  if (!share) return null

  const { rows: [pending] } = await client.query(
    `SELECT COALESCE(SUM(debit_amount), 0) AS pending_withdrawals
       FROM member_share_transactions
      WHERE membership_no = $1 AND branch_id = $2 AND status = 'PENDING'`,
    [membershipNo, branchId]
  )

  const approved = toPaise(share.share_balance)
  const pendingWithdrawals = toPaise(pending.pending_withdrawals)
  return {
    approved: toRupees(approved),
    pendingWithdrawals: toRupees(pendingWithdrawals),
    available: toRupees(sub(approved, pendingWithdrawals)),
  }
}

// Applies the share transactions of a batch being approved to member_shares,
// one net amount per member, and refuses to take any balance below zero.
// Call after the batch's share transactions have been marked COMPLETED.
export async function applyApprovedShareTransactions(
  client: PoolClient,
  batchId: number | string,
  branchId: string | number
): Promise<void> {
  const { rows } = await client.query(
    `SELECT membership_no, SUM(credit_amount - debit_amount) AS net
       FROM member_share_transactions
      WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'
      GROUP BY membership_no
      ORDER BY membership_no`,
    [batchId, branchId]
  )

  for (const r of rows) {
    const net = toPaise(r.net)
    const { rows: [updated] } = await client.query(
      `UPDATE member_shares
          SET share_balance = COALESCE(share_balance, 0) + $1, updated_at = NOW()
        WHERE membership_no = $2 AND branch_id = $3 AND status = 'ACTIVE'
        RETURNING share_balance`,
      [toSql(net), r.membership_no, branchId]
    )

    if (net < 0 && !updated) {
      throw new InsufficientSharesError(
        `Share account for member ${r.membership_no} is not active; cannot approve withdrawal`
      )
    }
    if (updated && toPaise(updated.share_balance) < 0) {
      throw new InsufficientSharesError(
        `Approving this voucher would leave member ${r.membership_no} with a negative share balance`
      )
    }
  }
}
