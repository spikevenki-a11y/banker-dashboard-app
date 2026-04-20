import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { PoolClient } from "pg"

// ── Core logic extracted so it can run per-batch ─────────────────────────
async function processBatch(
  client: PoolClient,
  batchId: number,
  action: "APPROVE" | "REJECT",
  branchId: number,
  userId: string
): Promise<{ batchId: number; voucherId: number; success: true; newStatus: string }> {

  await client.query("BEGIN")

  // Lock and fetch the batch
  const { rows } = await client.query(
    `SELECT id, batch_id, voucher_id, maker_id, status, business_date, branch_id
     FROM gl_batches
     WHERE batch_id = $1 AND branch_id = $2
     FOR UPDATE`,
    [batchId, branchId]
  )
  const batch = rows[0]

  if (!batch) throw new Error(`Batch #${batchId} not found`)
  if (batch.status !== "PENDING") throw new Error(`Batch #${batchId} is not PENDING (current: ${batch.status})`)
  if (String(batch.maker_id) === String(userId)) throw new Error(`Batch #${batchId}: checker cannot be the same as maker`)

  const newStatus = action === "APPROVE" ? "COMPLETED" : "REJECTED"

  await client.query(
    `UPDATE gl_batches SET status = $1, checker_id = $2, approved_at = NOW()
     WHERE batch_id = $3 AND branch_id = $4`,
    [newStatus, userId, batchId, branchId]
  )

  // ══════════════════════════════════════════════════════════════════
  // APPROVE
  // ══════════════════════════════════════════════════════════════════
  if (action === "APPROVE") {

    // 1. Update COA balances from GL lines
    const { rows: lines } = await client.query(
      `SELECT accountcode, debit_amount, credit_amount
       FROM gl_batch_lines WHERE batch_id = $1 AND branch_id = $2`,
      [batchId, branchId]
    )
    for (const line of lines) {
      const net = parseFloat(line.debit_amount || "0") - parseFloat(line.credit_amount || "0")
      await client.query(
        `UPDATE chart_of_accounts
         SET accountbalance = COALESCE(accountbalance, 0) + $1, modifieddate = NOW()
         WHERE accountcode = $2 AND branch_id = $3`,
        [net, line.accountcode, branchId]
      )
    }

    // 2. Savings transactions → COMPLETED + update account balances
    await client.query(
      `UPDATE savings_transactions SET status = 'COMPLETED', updated_at = NOW()
       WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
      [batchId, branchId]
    )
    const { rows: savTxns } = await client.query(
      `SELECT account_number, running_balance FROM savings_transactions
       WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
      [batchId, branchId]
    )
    for (const txn of savTxns) {
      await client.query(
        `UPDATE savings_accounts
         SET available_balance = $1, clear_balance = $1, updated_at = NOW()
         WHERE account_number = $2 AND branch_id = $3`,
        [txn.running_balance, txn.account_number, branchId]
      )
    }

    // 3. Share transactions → COMPLETED + update share balances
    await client.query(
      `UPDATE member_share_transactions SET status = 'COMPLETED'
       WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
      [batchId, branchId]
    )
    const { rows: shareTxns } = await client.query(
      `SELECT membership_no, credit_amount, debit_amount FROM member_share_transactions
       WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
      [batchId, branchId]
    )
    for (const st of shareTxns) {
      const net = parseFloat(st.credit_amount || "0") - parseFloat(st.debit_amount || "0")
      await client.query(
        `UPDATE member_shares
         SET share_balance = COALESCE(share_balance, 0) + $1, updated_at = NOW()
         WHERE membership_no = $2 AND branch_id = $3 AND status = 'ACTIVE'`,
        [net, st.membership_no, branchId]
      )
    }

  // ══════════════════════════════════════════════════════════════════
  // REJECT
  // ══════════════════════════════════════════════════════════════════
  } else {

    // 1. Savings → REJECTED
    await client.query(
      `UPDATE savings_transactions SET status = 'REJECTED', updated_at = NOW()
       WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
      [batchId, branchId]
    )

    // 2. Shares → REJECTED
    await client.query(
      `UPDATE member_share_transactions SET status = 'REJECTED'
       WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
      [batchId, branchId]
    )

    // 3. Borrowings — reverse balance
    await client.query(
      `UPDATE borrowing_master bm
       SET ledger_balance = bm.ledger_balance
         - bt.drawal_amount + bt.repayment_amount
         + bt.charge_amount + bt.iod_amount
         + bt.penal_interest_amount + bt.interest_amount
       FROM borrowing_transactions bt
       WHERE bt.voucher_no = $1::text
         AND bt.branch_id  = $2
         AND bt.status     = 'COMPLETED'
         AND bm.account_number = bt.account_number`,
      [batch.voucher_id, branchId]
    )
    await client.query(
      `UPDATE borrowing_transactions SET status = 'REJECTED'
       WHERE voucher_no = $1::text AND branch_id = $2 AND status = 'COMPLETED'`,
      [batch.voucher_id, branchId]
    )

    // 4. Investments — reverse
    const { rows: invTxns } = await client.query(
      `SELECT id, transaction_type, account_number, debit_amount, credit_amount
       FROM investment_transactions
       WHERE batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
      [batchId, branchId]
    )
    for (const txn of invTxns) {
      if (txn.transaction_type === "CLOSURE") {
        await client.query(
          `UPDATE investment_master SET ledger_balance = $1, status = 'ACTIVE'
           WHERE account_number = $2 AND branch_id = $3`,
          [parseFloat(txn.credit_amount), txn.account_number, branchId]
        )
      } else if (txn.transaction_type === "INVESTMENT") {
        await client.query(
          `UPDATE investment_master SET ledger_balance = ledger_balance - $1
           WHERE account_number = $2 AND branch_id = $3`,
          [parseFloat(txn.debit_amount), txn.account_number, branchId]
        )
      } else {
        await client.query(
          `UPDATE investment_master SET ledger_balance = ledger_balance - $1
           WHERE account_number = $2 AND branch_id = $3`,
          [parseFloat(txn.credit_amount), txn.account_number, branchId]
        )
      }
      await client.query(`UPDATE investment_transactions SET status = 'REJECTED' WHERE id = $1`, [txn.id])
    }

    // 5. Other bank accounts — reverse
    const { rows: bankTxns } = await client.query(
      `SELECT id, transaction_type, account_number, debit_amount, credit_amount
       FROM bank_accounts_transactions
       WHERE batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
      [batchId, branchId]
    )
    for (const txn of bankTxns) {
      const debit  = parseFloat(txn.debit_amount  || "0")
      const credit = parseFloat(txn.credit_amount || "0")
      const reversal = txn.transaction_type === "OPENING" ? -debit : (debit - credit)
      await client.query(
        `UPDATE bank_accounts
         SET account_balance = account_balance + $1,
             account_clear_balance = account_clear_balance + $1
         WHERE account_number = $2 AND branch_id = $3`,
        [reversal, txn.account_number, branchId]
      )
      if (debit > 0 && txn.transaction_type !== "OPENING") {
        await client.query(
          `UPDATE bank_accounts SET status = 'ACTIVE'
           WHERE account_number = $1 AND branch_id = $2 AND status = 'CLOSED'`,
          [txn.account_number, branchId]
        )
      }
      await client.query(`UPDATE bank_accounts_transactions SET status = 'REJECTED' WHERE id = $1`, [txn.id])
    }

    // 6. Reference-no modules
    const refModules = [
      { txnTable: "other_liabilities_transactions",    masterTable: "other_liabilities_master",    balanceCol: "ledger_balance"  },
      { txnTable: "other_assets_transactions",         masterTable: "other_assets_master",         balanceCol: "ledger_balance"  },
      { txnTable: "grands_and_subsidies_transactions", masterTable: "grands_and_subsidies_master", balanceCol: "ledger_balance"  },
      { txnTable: "reserve_and_fund_transactions",     masterTable: "reserve_and_fund_master",     balanceCol: "ledger_balance"  },
      { txnTable: "provisions_transactions",           masterTable: "provisions_master",           balanceCol: "ledger_balance"  },
      { txnTable: "sundry_creditors_transactions",     masterTable: "sundry_creditors",            balanceCol: "ledger_balance"  },
      { txnTable: "sundry_debitors_transactions",      masterTable: "sundry_debitors",             balanceCol: "ledger_balance"  },
      { txnTable: "income_transactions",               masterTable: "income_accounts",             balanceCol: "current_balance" },
      { txnTable: "expense_transactions",              masterTable: "expense_accounts",            balanceCol: "current_balance" },
    ]
    for (const mod of refModules) {
      await client.query(
        `UPDATE ${mod.masterTable} m
         SET ${mod.balanceCol} = m.${mod.balanceCol} - t.credit_amount + t.debit_amount
         FROM ${mod.txnTable} t
         WHERE t.reference_no = $1::text
           AND t.branch_id    = $2
           AND m.account_number = t.account_number
           AND m.branch_id      = t.branch_id`,
        [batchId, branchId]
      )
    }
  }

  await client.query("COMMIT")
  return { batchId, voucherId: Number(batch.voucher_id), success: true, newStatus }
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const branchId: number = u.branch
  const userId: string   = u.userId

  let body: { batchIds: number[]; action: "APPROVE" | "REJECT" }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { batchIds, action } = body

  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return NextResponse.json({ error: "batchIds must be a non-empty array" }, { status: 400 })
  }
  if (!["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 })
  }
  if (batchIds.length > 50) {
    return NextResponse.json({ error: "Cannot process more than 50 vouchers at once" }, { status: 400 })
  }

  const results: Array<
    | { batchId: number; voucherId: number; success: true; newStatus: string }
    | { batchId: number; success: false; error: string }
  > = []

  // Process each batch individually — one failure does NOT block the others
  for (const batchId of batchIds) {
    const client = await pool.connect()
    try {
      const result = await processBatch(client, batchId, action, branchId, userId)
      results.push(result)
    } catch (e: any) {
      try { await client.query("ROLLBACK") } catch { /* ignore */ }
      results.push({ batchId, success: false, error: e?.message || "Unknown error" })
    } finally {
      client.release()
    }
  }

  const succeeded = results.filter((r) => r.success).length
  const failed    = results.filter((r) => !r.success).length

  return NextResponse.json({
    success: true,
    processed: batchIds.length,
    succeeded,
    failed,
    results,
    message:
      failed === 0
        ? `All ${succeeded} voucher${succeeded !== 1 ? "s" : ""} ${action === "APPROVE" ? "approved" : "rejected"} successfully.`
        : `${succeeded} voucher${succeeded !== 1 ? "s" : ""} processed, ${failed} failed.`,
  })
}
