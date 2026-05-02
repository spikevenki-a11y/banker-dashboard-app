import pool from "@/lib/connection/db"
import { NextResponse } from "next/server"

/**
 * Returns a 423 error response if day-end has been initiated for the branch on the given
 * business date (status: INITIATED, IN_PROGRESS, or COMPLETED).
 * Returns null if the day is still open for transactions.
 */
export async function checkDayEndRestriction(
  branchId: string,
  businessDate: string
): Promise<NextResponse | null> {
  const { rows } = await pool.query(
    `SELECT status FROM dayend_log
     WHERE branch_id = $1 AND business_date = $2
       AND status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED')
     LIMIT 1`,
    [branchId, businessDate]
  )
  if (rows.length > 0) {
    return NextResponse.json(
      { error: "Day-end has been initiated. No new transactions, account openings, or voucher entries are allowed for this business date." },
      { status: 423 }
    )
  }
  return null
}
