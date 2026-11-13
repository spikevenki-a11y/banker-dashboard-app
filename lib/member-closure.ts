import "server-only"
import type { Pool, PoolClient } from "pg"
import type { ClosureBlocker } from "@/lib/member-closure-shared"

// Member Management → Member Closure.
//
// A member can be closed only when nothing linked to the membership is still open,
// active or pending in any module. Each check below reads the module's own status
// column and treats only that module's terminal statuses as finished — anything else
// (Pending, Active, Dormant, Frozen, Matured-not-paid, Overdue, Sanctioned, …) blocks.
// Accounts are matched on membership_no in every branch, since the number is unique.
//
// Nothing here changes any account: closure never closes or edits linked accounts.

type Db = Pool | PoolClient

export type { ClosureBlocker }

// Same deposit type codes as GET /api/members/accounts
const DEPOSIT_TYPES: Record<string, string> = {
  TERM: "Term Deposit", T: "Term Deposit",
  RECURING: "Recurring Deposit", RECURRING: "Recurring Deposit", R: "Recurring Deposit",
  PIGMY: "Pigmy Deposit", P: "Pigmy Deposit",
}

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v))
const up = (v: unknown) => String(v ?? "").trim().toUpperCase()

/** Every open / active / pending account or obligation that prevents closing the member. */
export async function findMemberClosureBlockers(db: Db, membershipNo: string): Promise<ClosureBlocker[]> {
  const no = String(membershipNo).trim()
  const blockers: ClosureBlocker[] = []

  const [savings, joint, deposits, loans, shares, shareTxns, lockerDeposits, lockerAssignments, lockerReservations, sureties] =
    await Promise.all([
      // Savings — finished: Closed / Rejected (stored in mixed case)
      db.query(
        `SELECT sa.account_number, sa.account_status, sa.available_balance, sa.branch_id, ss.scheme_name
         FROM savings_accounts sa
         LEFT JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
         WHERE CAST(sa.membership_no AS TEXT) = $1
           AND UPPER(COALESCE(sa.account_status, '')) NOT IN ('CLOSED', 'REJECTED')`,
        [no]
      ),
      // Savings where the member is the secondary (joint) holder
      db.query(
        `SELECT sa.account_number, sa.account_status, sa.available_balance, sa.branch_id, ss.scheme_name
         FROM savings_accounts sa
         LEFT JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
         WHERE CAST(sa.secondary_membership_no AS TEXT) = $1
           AND UPPER(COALESCE(sa.account_status, '')) NOT IN ('CLOSED', 'REJECTED')`,
        [no]
      ),
      // Term / Recurring / Pigmy deposits — finished: Closed / Premature Closure / Rejected
      // (ref_account_status); Pending, Active, Freeze, Dormant, Maturity, Lien … block
      db.query(
        `SELECT da.accountnumber, da.deposittype, da.clearbalance, da.branch_id,
                ras.account_status_name, ds.scheme_name
         FROM deposit_account da
         LEFT JOIN ref_account_status ras ON ras.account_status_id = da.accountstatus
         LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
         WHERE CAST(da.membership_no AS TEXT) = $1
           AND UPPER(COALESCE(ras.account_status_name, '')) NOT IN
               ('CLOSED', 'PREMATURE CLOSURE', 'PREMATURE CLOSED', 'REJECTED')`,
        [no]
      ),
      // Loans, from application to repayment — finished: Closed / Rejected / Cancelled
      db.query(
        `SELECT la.loan_application_id, la.reference_no, la.application_status, la.loan_outstanding,
                la.branch_id, lsch.scheme_name
         FROM loan_applications la
         LEFT JOIN LATERAL (
           SELECT scheme_name FROM loan_schemes s WHERE s.scheme_id = la.scheme_id
           ORDER BY (s.branch_id = la.branch_id) DESC LIMIT 1
         ) lsch ON true
         WHERE CAST(la.membership_no AS TEXT) = $1
           AND UPPER(COALESCE(la.application_status, '')) NOT IN ('CLOSED', 'REJECTED', 'CANCELLED', 'WITHDRAWN')`,
        [no]
      ),
      // Share capital still held (share rows are never marked closed, so the balance decides)
      db.query(
        `SELECT ms.membership_no, ms.status, ms.share_balance, ms.branch_id
         FROM member_shares ms
         WHERE CAST(ms.membership_no AS TEXT) = $1
           AND UPPER(COALESCE(ms.status, '')) <> 'CLOSED'
           AND COALESCE(ms.share_balance, 0) > 0`,
        [no]
      ),
      // Share deposits / withdrawals awaiting approval
      db.query(
        `SELECT t.voucher_type, t.status, t.debit_amount, t.credit_amount, m.branch_id
         FROM member_share_transactions t
         JOIN memberships m ON m.membership_no = t.membership_no
         WHERE CAST(m.membership_no AS TEXT) = $1 AND UPPER(t.status) = 'PENDING'`,
        [no]
      ),
      // Locker security deposits — ACTIVE | CLOSED
      db.query(
        `SELECT account_number, status, deposit_amount, branch_id
         FROM locker_deposits
         WHERE CAST(membership_no AS TEXT) = $1 AND UPPER(COALESCE(status, '')) <> 'CLOSED'`,
        [no]
      ),
      // Locker allotments — finished: Closed / Cancelled (Expired = rent lapsed, locker still held)
      db.query(
        `SELECT la.status, la.branch_id, l.locker_no
         FROM locker_assignments la
         LEFT JOIN lockers l ON l.id = la.locker_id
         WHERE CAST(la.membership_no AS TEXT) = $1
           AND UPPER(COALESCE(la.status, '')) NOT IN ('CLOSED', 'CANCELLED')`,
        [no]
      ),
      // Locker reservations still waiting
      db.query(
        `SELECT lr.status, lr.branch_id, l.locker_no
         FROM locker_reservations lr
         LEFT JOIN lockers l ON l.id = lr.locker_id
         WHERE CAST(lr.membership_no AS TEXT) = $1 AND UPPER(COALESCE(lr.status, '')) = 'ACTIVE'`,
        [no]
      ),
      // Personal surety (guarantor) for another member's loan that is still open
      db.query(
        `SELECT la.loan_application_id, la.reference_no, la.application_status, la.loan_outstanding,
                la.branch_id, la.membership_no AS borrower_no
         FROM personal_surety_details ps
         JOIN loan_applications la ON la.loan_application_id = ps.loan_application_id
         WHERE CAST(ps.membership_no AS TEXT) = $1
           AND UPPER(COALESCE(la.application_status, '')) NOT IN ('CLOSED', 'REJECTED', 'CANCELLED', 'WITHDRAWN')`,
        [no]
      ),
    ])

  for (const r of savings.rows) {
    blockers.push({
      module: "Savings", account_number: String(r.account_number),
      account_type: r.scheme_name || "Savings Account", status: up(r.account_status) || "UNKNOWN",
      outstanding: num(r.available_balance), branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of joint.rows) {
    blockers.push({
      module: "Savings (Joint Holder)", account_number: String(r.account_number),
      account_type: r.scheme_name || "Savings Account", status: up(r.account_status) || "UNKNOWN",
      outstanding: num(r.available_balance), branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of deposits.rows) {
    const type = DEPOSIT_TYPES[up(r.deposittype)] || r.deposittype || "Deposit"
    blockers.push({
      module: "Deposits", account_number: String(r.accountnumber),
      account_type: r.scheme_name ? `${type} — ${r.scheme_name}` : type,
      status: up(r.account_status_name) || "UNKNOWN",
      outstanding: num(r.clearbalance), branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of loans.rows) {
    blockers.push({
      module: "Loans", account_number: String(r.reference_no || r.loan_application_id),
      account_type: r.scheme_name || "Loan", status: up(r.application_status) || "UNKNOWN",
      outstanding: num(r.loan_outstanding), branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of shares.rows) {
    blockers.push({
      module: "Share Capital", account_number: `SH-${r.membership_no}`,
      account_type: "Member Shares", status: up(r.status) || "ACTIVE",
      outstanding: num(r.share_balance), branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of shareTxns.rows) {
    blockers.push({
      module: "Share Transactions", account_number: `SH-${no}`,
      account_type: Number(r.debit_amount) > 0 ? "Share Withdrawal (awaiting approval)" : "Share Deposit (awaiting approval)",
      status: "PENDING", outstanding: num(Number(r.debit_amount) > 0 ? r.debit_amount : r.credit_amount),
      branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of lockerDeposits.rows) {
    blockers.push({
      module: "Lockers", account_number: String(r.account_number),
      account_type: "Locker Deposit", status: up(r.status) || "ACTIVE",
      outstanding: num(r.deposit_amount), branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of lockerAssignments.rows) {
    blockers.push({
      module: "Lockers", account_number: r.locker_no ? `Locker ${r.locker_no}` : "Locker",
      account_type: "Locker Allotment", status: up(r.status) || "ACTIVE",
      outstanding: null, branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of lockerReservations.rows) {
    blockers.push({
      module: "Lockers", account_number: r.locker_no ? `Locker ${r.locker_no}` : "Locker",
      account_type: "Locker Reservation", status: up(r.status) || "ACTIVE",
      outstanding: null, branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }
  for (const r of sureties.rows) {
    blockers.push({
      module: "Loan Surety", account_number: String(r.reference_no || r.loan_application_id),
      account_type: `Guarantor for member ${r.borrower_no}`, status: up(r.application_status) || "UNKNOWN",
      outstanding: num(r.loan_outstanding), branch_id: r.branch_id != null ? String(r.branch_id) : null,
    })
  }

  return blockers
}

/**
 * Error message when a membership can't be used for a new account or transaction
 * (missing, or not ACTIVE — e.g. CLOSED), otherwise "". Pass `lock` inside a
 * transaction: it takes a share lock on the member row, so a closure running at the
 * same moment waits for (or blocks) the new account instead of racing it.
 */
export async function getMemberNotActiveError(
  db: Db,
  membershipNo: unknown,
  opts: { lock?: boolean; label?: string } = {}
): Promise<string> {
  const no = String(membershipNo ?? "").trim()
  const label = opts.label || "Member"
  if (!no) return `${label} membership number is required`
  const { rows } = await db.query(
    `SELECT status FROM memberships WHERE CAST(membership_no AS TEXT) = $1 LIMIT 1${opts.lock ? " FOR SHARE" : ""}`,
    [no]
  )
  if (rows.length === 0) return `${label} ${no} was not found`
  const status = up(rows[0].status)
  if (status === "CLOSED") return `${label} ${no} is closed and cannot be used for new accounts or transactions`
  if (status !== "ACTIVE") return `${label} ${no} is not active (status: ${status || "unknown"})`
  return ""
}
