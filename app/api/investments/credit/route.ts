import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GL account codes
const INTEREST_RECEIVED_GL = "31000000" // Interest Received

export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const userId = session.userId
    const businessDate = session.businessDate

    const body = await request.json()
    const {
      ledger_account,   // investment GL code (e.g. 22020000)
      account_number,
      transaction_type, // "INTEREST" | "CREDIT"
      credit_amount,
      interest_amount,
      transaction_date,
      voucher_no: inputVoucherNo,
      voucher_type,
    } = body

    if (!ledger_account || !account_number || !credit_amount || !transaction_date || !transaction_type) {
      return NextResponse.json(
        { error: "Missing required fields: ledger_account, account_number, credit_amount, transaction_date, transaction_type" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    const { rows: accounts } = await client.query(
      `SELECT * FROM investment_master WHERE account_number = $1`,
      [account_number]
    )
    if (accounts.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
    if (accounts[0].status !== "ACTIVE") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account is not active" }, { status: 400 })
    }

    const account = accounts[0]
    // For top-up credit, ledger balance increases. For interest, balance stays same.
    const newBalance =
      transaction_type === "CREDIT"
        ? parseFloat(account.ledger_balance) + parseFloat(credit_amount)
        : parseFloat(account.ledger_balance)

    // GL sequences
    const { rows: [batchRow] } = await client.query(
      `UPDATE gl_batch_sequences SET last_batch_id = last_batch_id + 1
       WHERE branch_id = $1 RETURNING last_batch_id`,
      [branchId]
    )
    const batchId = batchRow.last_batch_id

    const { rows: [voucherRow] } = await client.query(
      `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
       VALUES ($1, $2, 1)
       ON CONFLICT (branch_id, business_date)
       DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
       RETURNING last_voucher_no`,
      [branchId, businessDate]
    )
    const voucherNo = voucherRow.last_voucher_no

    await client.query(
      `INSERT INTO gl_batches (business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
      [transaction_date, branchId, batchId, voucherNo, voucher_type || "CASH", userId]
    )

    const cashGl = voucher_type === "TRANSFER" ? "11100000" : "23100000"
    const narration =
      transaction_type === "INTEREST"
        ? `Investment Interest Received - ${account_number}`
        : `Investment Credit - ${account_number}`

    if (transaction_type === "INTEREST") {
      // DR: Cash/Bank — cash received
      await client.query(
        `INSERT INTO gl_batch_lines
           (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
        [branchId, batchId, transaction_date, cashGl, "0", credit_amount, voucherNo, narration, userId]
      )
      // CR: Interest Received GL
      await client.query(
        `INSERT INTO gl_batch_lines
           (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)`,
        [branchId, batchId, transaction_date, INTEREST_RECEIVED_GL, account_number, credit_amount, voucherNo, narration, userId]
      )
    } else {
      // CREDIT (top-up): DR Investment GL, CR Cash/Bank
      await client.query(
        `INSERT INTO gl_batch_lines
           (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
        [branchId, batchId, transaction_date, ledger_account, account_number, credit_amount, voucherNo, narration, userId]
      )
      await client.query(
        `INSERT INTO gl_batch_lines
           (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,'0',0,$5,$6,$7,$8)`,
        [branchId, batchId, transaction_date, cashGl, credit_amount, voucherNo, narration, userId]
      )
    }

    // Insert transaction record
    const { rows: [txn] } = await client.query(
      `INSERT INTO investment_transactions
         (branch_id, transaction_date, voucher_no, batch_id, transaction_type, account_number,
          debit_amount, credit_amount, interest_amount, ledger_balance_amount, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,'COMPLETED',$10)
       RETURNING *`,
      [
        branchId, transaction_date, inputVoucherNo || String(voucherNo), batchId,
        transaction_type, account_number,
        credit_amount, interest_amount || 0, newBalance, userId,
      ]
    )

    // Update ledger balance for top-up
    if (transaction_type === "CREDIT") {
      await client.query(
        `UPDATE investment_master SET ledger_balance = $1 WHERE account_number = $2`,
        [newBalance, account_number]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message:
        transaction_type === "INTEREST"
          ? "Interest receipt recorded successfully"
          : "Investment top-up recorded successfully",
      transaction: txn,
      new_balance: newBalance,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Investment Credit POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
