import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GET — fetch investment accounts (+ optional transaction history)
export async function GET(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const accountNumber = searchParams.get("accountNumber")
    const status = searchParams.get("status")

    if (type === "transactions" && accountNumber) {
      const { rows } = await pool.query(
        `SELECT * FROM investment_transactions
         WHERE account_number = $1
         ORDER BY transaction_date DESC, created_date DESC`,
        [accountNumber]
      )
      return NextResponse.json({ success: true, transactions: rows })
    }

    let sql = `SELECT * FROM investment_master WHERE 1=1`
    const params: any[] = []
    let p = 0

    if (session.role !== "admin" && branchId) {
      sql += ` AND branch_id = $${++p}`
      params.push(branchId)
    }
    if (status && status !== "all") {
      sql += ` AND status = $${++p}`
      params.push(status)
    }
    if (accountNumber) {
      sql += ` AND account_number ILIKE $${++p}`
      params.push(`%${accountNumber}%`)
    }
    sql += ` ORDER BY created_date DESC`

    const { rows } = await pool.query(sql, params)
    return NextResponse.json({ success: true, accounts: rows })
  } catch (error: any) {
    console.error("Investments GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — open a new investment account
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
      investment_head,
      description,
      amount_invested,
      date_of_investment,
      rate_of_interest,
      reference_number,
      voucher_type,
    } = body

    if (!investment_head || !amount_invested || !date_of_investment) {
      return NextResponse.json(
        { error: "Missing required fields: investment_head, amount_invested, date_of_investment" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Generate account number
    const { rows: [countRow] } = await client.query(
      `SELECT COUNT(*) AS count FROM investment_master WHERE branch_id = $1`,
      [branchId]
    )
    const count = parseInt(countRow.count) + 1
    const accountNumber = `${branchId}${"05"}${count.toString().padStart(6, "0")}`

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

    // GL batch header
    await client.query(
      `INSERT INTO gl_batches (business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
      [date_of_investment, branchId, batchId, voucherNo, voucher_type || "CASH", userId]
    )

    const narration = `Investment Opened - ${accountNumber}`
    const cashGl = voucher_type === "TRANSFER" ? "11100000" : "23100000"

    // DR: Investment GL (asset increases)
    await client.query(
      `INSERT INTO gl_batch_lines
         (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
      [branchId, batchId, date_of_investment, investment_head, accountNumber, amount_invested, voucherNo, narration, userId]
    )

    // CR: Cash / Bank (asset decreases)
    await client.query(
      `INSERT INTO gl_batch_lines
         (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
       VALUES ($1,$2,$3,$4,'0',0,$5,$6,$7,$8)`,
      [branchId, batchId, date_of_investment, cashGl, amount_invested, voucherNo, narration, userId]
    )

    // Insert investment master
    const { rows: [inv] } = await client.query(
      `INSERT INTO investment_master
         (account_number, investment_head, branch_id, description, amount_invested, ledger_balance,
          date_of_investment, rate_of_interest, interest_receivable, reference_number, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$5,$6,$7,0,$8,'ACTIVE',$9)
       RETURNING *`,
      [accountNumber, investment_head, branchId, description || null, amount_invested,
       date_of_investment, rate_of_interest || 0, reference_number || null, userId]
    )

    // Insert opening transaction
    await client.query(
      `INSERT INTO investment_transactions
         (branch_id, transaction_date, voucher_no, batch_id, transaction_type, account_number,
          debit_amount, credit_amount, interest_amount, ledger_balance_amount, status, created_by)
       VALUES ($1,$2,$3,$4,'INVESTMENT',$5,$6,0,0,$6,'COMPLETED',$7)`,
      [branchId, date_of_investment, String(voucherNo), batchId, accountNumber, amount_invested, userId]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Investment account opened successfully",
      account: inv,
      account_number: accountNumber,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Investments POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
