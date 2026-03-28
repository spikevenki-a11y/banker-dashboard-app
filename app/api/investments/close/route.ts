import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

const INTEREST_RECEIVED_GL = "31000000"

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
      ledger_account,
      account_number,
      closure_amount,
      interest_on_closure,
      transaction_date,
      voucher_no: inputVoucherNo,
      voucher_type,
    } = body

    if (!ledger_account || !account_number || !closure_amount || !transaction_date) {
      return NextResponse.json(
        { error: "Missing required fields: ledger_account, account_number, closure_amount, transaction_date" },
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
      return NextResponse.json({ error: "Account is already closed" }, { status: 400 })
    }

    const interest = parseFloat(interest_on_closure) || 0
    const principal = parseFloat(closure_amount)
    const totalPayout = principal + interest

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
    const narration = `Investment Closure - ${account_number}`

    // DR: Cash/Bank — total payout received
    await client.query(
      `INSERT INTO gl_batch_lines
         (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
       VALUES ($1,$2,$3,$4,'0',$5,0,$6,$7,$8)`,
      [branchId, batchId, transaction_date, cashGl, totalPayout, voucherNo, narration, userId]
    )

    // CR: Investment GL — principal redeemed (asset decreases)
    await client.query(
      `INSERT INTO gl_batch_lines
         (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
       VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)`,
      [branchId, batchId, transaction_date, ledger_account, account_number, principal, voucherNo, `${narration} - Principal`, userId]
    )

    // CR: Interest Received GL — if interest on closure
    if (interest > 0) {
      await client.query(
        `INSERT INTO gl_batch_lines
           (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)`,
        [branchId, batchId, transaction_date, INTEREST_RECEIVED_GL, account_number, interest, voucherNo, `${narration} - Interest`, userId]
      )
    }

    // Insert closure transaction
    const { rows: [txn] } = await client.query(
      `INSERT INTO investment_transactions
         (branch_id, transaction_date, voucher_no, batch_id, transaction_type, account_number,
          debit_amount, credit_amount, interest_amount, ledger_balance_amount, status, created_by)
       VALUES ($1,$2,$3,$4,'CLOSURE',$5,0,$6,$7,0,'COMPLETED',$8)
       RETURNING *`,
      [branchId, transaction_date, inputVoucherNo || String(voucherNo), batchId,
       account_number, principal, interest, userId]
    )

    // Close the account
    await client.query(
      `UPDATE investment_master SET ledger_balance = 0, status = 'CLOSED' WHERE account_number = $1`,
      [account_number]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Investment closed successfully",
      transaction: txn,
      principal_redeemed: principal,
      interest_received: interest,
      total_payout: totalPayout,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Investment Close POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
