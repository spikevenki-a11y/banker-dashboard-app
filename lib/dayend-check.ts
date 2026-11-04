import pool from "@/lib/connection/db"
import { NextResponse } from "next/server"

export const DAYEND_IN_PROGRESS_MESSAGE =
  "Day-End processing has been initiated. Transactions are temporarily disabled."

export const DAYEND_CLOSED_MESSAGE =
  "Day-End has been completed for this business date. Please log in again to continue on the new business date."

export type DayEndLockState = "OPEN" | "IN_PROGRESS" | "CLOSED"

/**
 * Lock state of a branch's business date, read from dayend_log:
 *  - IN_PROGRESS: day-end has been initiated and has not completed yet
 *    (INITIATED, IN_PROGRESS, or FAILED and awaiting a resume).
 *  - CLOSED: day-end completed for this date; the session's business date is stale.
 *  - OPEN: no day-end run for this date, so transactions are allowed.
 */
export async function getDayEndLockState(
  branchId: string,
  businessDate: string
): Promise<DayEndLockState> {
  const { rows } = await pool.query(
    `SELECT status FROM dayend_log
     WHERE branch_id = $1 AND business_date = $2
     LIMIT 1`,
    [branchId, businessDate]
  )
  if (rows.length === 0) return "OPEN"
  return rows[0].status === "COMPLETED" ? "CLOSED" : "IN_PROGRESS"
}

export function dayEndLockResponse(state: Exclude<DayEndLockState, "OPEN">): NextResponse {
  return NextResponse.json(
    {
      error: state === "CLOSED" ? DAYEND_CLOSED_MESSAGE : DAYEND_IN_PROGRESS_MESSAGE,
      code: state === "CLOSED" ? "DAYEND_CLOSED" : "DAYEND_IN_PROGRESS",
    },
    { status: 423 }
  )
}

/**
 * Returns a 423 response if the branch's business date is locked by day-end,
 * or null if transactions are allowed. The global check in proxy.ts already
 * covers every write API; route-level calls to this remain as a second check.
 */
export async function checkDayEndRestriction(
  branchId: string,
  businessDate: string
): Promise<NextResponse | null> {
  const state = await getDayEndLockState(branchId, businessDate)
  return state === "OPEN" ? null : dayEndLockResponse(state)
}
