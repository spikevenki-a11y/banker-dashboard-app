import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const { batchId, action } = await req.json()

  if (!batchId || !action) {
    return NextResponse.json({ error: "Batch ID and action are required" }, { status: 400 })
  }

  if (!["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Use APPROVE or REJECT" }, { status: 400 })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Lock and fetch the batch
    const { rows: [batch] } = await client.query(
      `SELECT id, batch_id, voucher_id, maker_id, status, business_date, branch_id
       FROM gl_batches
       WHERE batch_id = $1 AND branch_id = $2
       FOR UPDATE`,
      [batchId, u.branch]
    )

    if (!batch) {
      throw new Error("Voucher batch not found")
    }

    if (batch.status !== "PENDING") {
      throw new Error(`Voucher is not pending. Current status: ${batch.status}`)
    }

    // Maker cannot verify their own voucher
    if (batch.maker_id === u.userId) {
      throw new Error("You cannot verify your own voucher. A different user must verify.")
    }

    const newStatus = action === "APPROVE" ? "COMPLETED" : "REJECTED"

    // Update gl_batches status
    await client.query(
      `UPDATE gl_batches
       SET status = $1,
           checker_id = $2,
           approved_at = NOW()
       WHERE batch_id = $3 AND branch_id = $4`,
      [newStatus, u.userId, batchId, u.branch]
    )

    if (action === "APPROVE") {
      // Update chart_of_accounts balances from GL lines
      const { rows: lines } = await client.query(
        `SELECT accountcode, debit_amount, credit_amount
         FROM gl_batch_lines
         WHERE batch_id = $1 AND branch_id = $2`,
        [batchId, u.branch]
      )

      for (const line of lines) {
        const debit = parseFloat(line.debit_amount || "0")
        const credit = parseFloat(line.credit_amount || "0")
        const netAmount = debit - credit

        await client.query(
          `UPDATE chart_of_accounts
           SET accountbalance = COALESCE(accountbalance, 0) + $1,
               modifieddate = NOW()
           WHERE accountcode = $2 AND branch_id = $3`,
          [netAmount, line.accountcode, u.branch]
        )
      }

      // Update related savings_transactions status to COMPLETED
      await client.query(
        `UPDATE savings_transactions
         SET status = 'COMPLETED', updated_at = NOW()
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, u.branch]
      )

      // Update savings account balances for approved savings txns
      const { rows: savTxns } = await client.query(
        `SELECT account_number, running_balance
         FROM savings_transactions
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
        [batchId, u.branch]
      )

      for (const txn of savTxns) {
        await client.query(
          `UPDATE savings_accounts
           SET available_balance = $1, clear_balance = $1, updated_at = NOW()
           WHERE account_number = $2 AND branch_id = $3`,
          [txn.running_balance, txn.account_number, u.branch]
        )
      }

      // Update related member_share_transactions status to COMPLETED
      await client.query(
        `UPDATE member_share_transactions
         SET status = 'COMPLETED'
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, u.branch]
      )

      // Update member_shares balance for approved share txns
      const { rows: shareTxns } = await client.query(
        `SELECT membership_no, credit_amount, debit_amount
         FROM member_share_transactions
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
        [batchId, u.branch]
      )

      for (const st of shareTxns) {
        const shareCredit = parseFloat(st.credit_amount || "0")
        const shareDebit = parseFloat(st.debit_amount || "0")
        const netShare = shareCredit - shareDebit

        await client.query(
          `UPDATE member_shares
           SET share_balance = COALESCE(share_balance, 0) + $1, updated_at = NOW()
           WHERE membership_no = $2 AND branch_id = $3 AND status = 'ACTIVE'`,
          [netShare, st.membership_no, u.branch]
        )
      }
    } else {
      // REJECT - mark sub-transactions as REJECTED too
      await client.query(
        `UPDATE savings_transactions
         SET status = 'REJECTED', updated_at = NOW()
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, u.branch]
      )

      await client.query(
        `UPDATE member_share_transactions
         SET status = 'REJECTED'
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, u.branch]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      batchId,
      newStatus,
      message: action === "APPROVE"
        ? `Voucher ${batch.voucher_id} has been verified and posted successfully.`
        : `Voucher ${batch.voucher_id} has been rejected.`,
    })
  } catch (e: any) {
    await client.query("ROLLBACK")
    console.error("Verify voucher error:", e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  } finally {
    client.release()
  }
}
