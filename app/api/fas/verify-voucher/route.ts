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

    if (!batch) throw new Error("Voucher batch not found")
    if (batch.status !== "PENDING") throw new Error(`Voucher is not pending. Current status: ${batch.status}`)
    if (batch.maker_id === u.userId) throw new Error("You cannot verify your own voucher. A different user must verify.")

    const newStatus = action === "APPROVE" ? "COMPLETED" : "REJECTED"

    // Update gl_batches status
    await client.query(
      `UPDATE gl_batches
       SET status = $1, checker_id = $2, approved_at = NOW()
       WHERE batch_id = $3 AND branch_id = $4`,
      [newStatus, u.userId, batchId, u.branch]
    )

    // ═══════════════════════════════════════════════════════════════
    // APPROVE
    // ═══════════════════════════════════════════════════════════════
    if (action === "APPROVE") {

      // ── 1. Update chart_of_accounts balances from GL lines ──────
      const { rows: lines } = await client.query(
        `SELECT accountcode, debit_amount, credit_amount
         FROM gl_batch_lines
         WHERE batch_id = $1 AND branch_id = $2`,
        [batchId, u.branch]
      )

      for (const line of lines) {
        const netAmount = parseFloat(line.debit_amount || "0") - parseFloat(line.credit_amount || "0")
        await client.query(
          `UPDATE chart_of_accounts
           SET accountbalance = COALESCE(accountbalance, 0) + $1, modifieddate = NOW()
           WHERE accountcode = $2 AND branch_id = $3`,
          [netAmount, line.accountcode, u.branch]
        )
      }

      // ── 2. Savings transactions: PENDING → COMPLETED + update account balances ──
      await client.query(
        `UPDATE savings_transactions
         SET status = 'COMPLETED', updated_at = NOW()
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, u.branch]
      )

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

      // ── 3. Share transactions: PENDING → COMPLETED + update share balances ──
      await client.query(
        `UPDATE member_share_transactions
         SET status = 'COMPLETED'
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, u.branch]
      )

      const { rows: shareTxns } = await client.query(
        `SELECT membership_no, credit_amount, debit_amount
         FROM member_share_transactions
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
        [batchId, u.branch]
      )
      for (const st of shareTxns) {
        const netShare = parseFloat(st.credit_amount || "0") - parseFloat(st.debit_amount || "0")
        await client.query(
          `UPDATE member_shares
           SET share_balance = COALESCE(share_balance, 0) + $1, updated_at = NOW()
           WHERE membership_no = $2 AND branch_id = $3 AND status = 'ACTIVE'`,
          [netShare, st.membership_no, u.branch]
        )
      }

      // ── 4. Bank-level modules with batch_id (borrowings, investments, bank_accounts) ──
      // These modules set status = 'COMPLETED' and update master balances at transaction
      // creation time. The COA update above is the only step needed on APPROVE.

      // ── 5. Bank-level modules with reference_no (other-liabilities, provisions, etc.) ──
      // Same reasoning — master balances are already current. COA handled above.

    // ═══════════════════════════════════════════════════════════════
    // REJECT
    // ═══════════════════════════════════════════════════════════════
    } else {

      // ── 1. Savings transactions: PENDING → REJECTED ──────────────
      await client.query(
        `UPDATE savings_transactions
         SET status = 'REJECTED', updated_at = NOW()
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, u.branch]
      )

      // ── 2. Share transactions: PENDING → REJECTED ────────────────
      await client.query(
        `UPDATE member_share_transactions
         SET status = 'REJECTED'
         WHERE gl_batch_id = $1 AND branch_id = $2 AND status = 'PENDING'`,
        [batchId, u.branch]
      )

      // ── 3. Borrowings (linked via voucher_no = batch's voucher_id) ──
      // Drawal added to balance; repayment + fees subtracted. Reverse both.
      await client.query(
        `UPDATE borrowing_master bm
         SET ledger_balance = bm.ledger_balance
           - bt.drawal_amount
           + bt.repayment_amount
           + bt.charge_amount
           + bt.iod_amount
           + bt.penal_interest_amount
           + bt.interest_amount
         FROM borrowing_transactions bt
         WHERE bt.voucher_no = $1::text
           AND bt.branch_id  = $2
           AND bt.status     = 'COMPLETED'
           AND bm.account_number = bt.account_number`,
        [batch.voucher_id, u.branch]
      )
      await client.query(
        `UPDATE borrowing_transactions
         SET status = 'REJECTED'
         WHERE voucher_no = $1::text AND branch_id = $2 AND status = 'COMPLETED'`,
        [batch.voucher_id, u.branch]
      )

      // ── 4. Investments (linked via batch_id) ─────────────────────
      const { rows: invTxns } = await client.query(
        `SELECT id, transaction_type, account_number, debit_amount, credit_amount, interest_amount
         FROM investment_transactions
         WHERE batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
        [batchId, u.branch]
      )
      for (const txn of invTxns) {
        if (txn.transaction_type === "CLOSURE") {
          // Closure set ledger_balance = 0 and status = 'CLOSED'.
          // credit_amount holds the principal. Restore it.
          await client.query(
            `UPDATE investment_master
             SET ledger_balance = $1, status = 'ACTIVE'
             WHERE account_number = $2 AND branch_id = $3`,
            [parseFloat(txn.credit_amount), txn.account_number, u.branch]
          )
        } else if (txn.transaction_type === "INVESTMENT") {
          // Opening — debit_amount held the initial investment amount
          await client.query(
            `UPDATE investment_master
             SET ledger_balance = ledger_balance - $1
             WHERE account_number = $2 AND branch_id = $3`,
            [parseFloat(txn.debit_amount), txn.account_number, u.branch]
          )
        } else {
          // CREDIT top-up — credit_amount was added to balance
          await client.query(
            `UPDATE investment_master
             SET ledger_balance = ledger_balance - $1
             WHERE account_number = $2 AND branch_id = $3`,
            [parseFloat(txn.credit_amount), txn.account_number, u.branch]
          )
        }
        await client.query(
          `UPDATE investment_transactions SET status = 'REJECTED' WHERE id = $1`,
          [txn.id]
        )
      }

      // ── 5. Other Bank Accounts (linked via batch_id) ─────────────
      const { rows: bankTxns } = await client.query(
        `SELECT id, transaction_type, account_number, debit_amount, credit_amount
         FROM bank_accounts_transactions
         WHERE batch_id = $1 AND branch_id = $2 AND status = 'COMPLETED'`,
        [batchId, u.branch]
      )
      for (const txn of bankTxns) {
        const debit  = parseFloat(txn.debit_amount  || "0")
        const credit = parseFloat(txn.credit_amount || "0")

        // OPENING stores initial balance in debit_amount (balance was SET, not incremented).
        // DEPOSIT / INTEREST use credit_amount (balance was incremented).
        // WITHDRAWAL / CLOSURE use debit_amount (balance was decremented).
        const reversal = txn.transaction_type === "OPENING" ? -debit : (debit - credit)

        await client.query(
          `UPDATE bank_accounts
           SET account_balance       = account_balance       + $1,
               account_clear_balance = account_clear_balance + $1
           WHERE account_number = $2 AND branch_id = $3`,
          [reversal, txn.account_number, u.branch]
        )

        // Restore CLOSED status for withdrawal/closure transactions
        if (debit > 0 && txn.transaction_type !== "OPENING") {
          await client.query(
            `UPDATE bank_accounts
             SET status = 'ACTIVE'
             WHERE account_number = $1 AND branch_id = $2 AND status = 'CLOSED'`,
            [txn.account_number, u.branch]
          )
        }

        await client.query(
          `UPDATE bank_accounts_transactions SET status = 'REJECTED' WHERE id = $1`,
          [txn.id]
        )
      }

      // ── 6. Reference_no modules ───────────────────────────────────
      // These modules update master balances at transaction creation time.
      // On reject, reverse the net balance change: credit_amount was added, debit_amount subtracted.
      // Formula: master.balance -= (credit_amount - debit_amount)
      //          i.e., balance = balance - credit_amount + debit_amount

      const referenceNoModules = [
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

      for (const mod of referenceNoModules) {
        await client.query(
          `UPDATE ${mod.masterTable} m
           SET ${mod.balanceCol} = m.${mod.balanceCol} - t.credit_amount + t.debit_amount
           FROM ${mod.txnTable} t
           WHERE t.reference_no = $1::text
             AND t.branch_id    = $2
             AND m.account_number = t.account_number
             AND m.branch_id      = t.branch_id`,
          [batchId, u.branch]
        )
      }
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
