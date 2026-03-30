import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GET — list accounts or fetch transaction history
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
        `SELECT * FROM bank_accounts_transactions
         WHERE account_number = $1
         ORDER BY transaction_date DESC, created_date DESC`,
        [accountNumber]
      )
      return NextResponse.json({ success: true, transactions: rows })
    }

    let sql = `SELECT * FROM bank_accounts WHERE 1=1`
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
    console.error("Other Bank Accounts GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — open a new bank account (with GL entries)
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
      account_head,
      description,
      opening_balance,
      date_of_account_opening,
      rate_of_interest,
      reference_number,
      voucher_type,
    } = body

    if (!account_head || !date_of_account_opening) {
      return NextResponse.json(
        { error: "Missing required fields: account_head, date_of_account_opening" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Generate account number
    const { rows: [countRow] } = await client.query(
      `SELECT COUNT(*) AS count FROM bank_accounts WHERE branch_id = $1`,
      [branchId]
    )
    const count = parseInt(countRow.count) + 1
    const accountNumber = `${branchId}${"07"}${count.toString().padStart(6, "0")}`

    const initialBalance = parseFloat(opening_balance) || 0

    // GL sequences (only when there's an opening balance)
    let batchId: number | null = null
    let voucherNo: number | null = null

    if (initialBalance > 0) {
      const { rows: [batchRow] } = await client.query(
        `UPDATE gl_batch_sequences SET last_batch_id = last_batch_id + 1
         WHERE branch_id = $1 RETURNING last_batch_id`,
        [branchId]
      )
      batchId = batchRow.last_batch_id

      const { rows: [voucherRow] } = await client.query(
        `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
         VALUES ($1, $2, 1)
         ON CONFLICT (branch_id, business_date)
         DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
         RETURNING last_voucher_no`,
        [branchId, businessDate]
      )
      voucherNo = voucherRow.last_voucher_no

      const narration = `Bank Account Opened - ${accountNumber}`
      const cashGl = voucher_type === "TRANSFER" ? "11100000" : "23100000"

      // GL batch header
      await client.query(
        `INSERT INTO gl_batches (business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
        [date_of_account_opening, branchId, batchId, voucherNo, voucher_type || "CASH", userId]
      )

      // DR: Other Bank Account GL (asset increases)
      await client.query(
        `INSERT INTO gl_batch_lines
           (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
        [branchId, batchId, date_of_account_opening, account_head, accountNumber, initialBalance, voucherNo, narration, userId]
      )

      // CR: Cash / Bank (asset decreases — cash used to fund account)
      await client.query(
        `INSERT INTO gl_batch_lines
           (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,'0',0,$5,$6,$7,$8)`,
        [branchId, batchId, date_of_account_opening, cashGl, initialBalance, voucherNo, narration, userId]
      )

      // Opening transaction record
      await client.query(
        `INSERT INTO bank_accounts_transactions
           (branch_id, transaction_date, voucher_no, batch_id, transaction_type, account_number,
            debit_amount, credit_amount, interest_amount, ledger_balance_amount, status, created_by)
         VALUES ($1,$2,$3,$4,'OPENING',$5,$6,0,0,$6,'COMPLETED',$7)`,
        [branchId, date_of_account_opening, String(voucherNo), batchId, accountNumber, initialBalance, userId]
      )
    }

    // Insert bank_accounts record
    const { rows: [acc] } = await client.query(
      `INSERT INTO bank_accounts
         (account_number, account_head, branch_id, description, account_balance,
          account_clear_balance, account_unclear_balance, date_of_account_opening,
          rate_of_interest, interest_receivable, reference_number, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$5,0,$6,$7,0,$8,'ACTIVE',$9)
       RETURNING *`,
      [accountNumber, account_head, branchId, description || null, initialBalance,
       date_of_account_opening, rate_of_interest || 0, reference_number || null, userId]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Bank account opened successfully",
      account: acc,
      account_number: accountNumber,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Other Bank Accounts POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}

// PATCH — update account details
export async function PATCH(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const body = await request.json()
    const { account_number, description, rate_of_interest, reference_number } = body

    if (!account_number) {
      return NextResponse.json({ error: "account_number is required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `UPDATE bank_accounts
       SET description = $1, rate_of_interest = $2, reference_number = $3
       WHERE account_number = $4 AND branch_id = $5
       RETURNING *`,
      [description || null, rate_of_interest || 0, reference_number || null, account_number, branchId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, account: rows[0] })
  } catch (error: any) {
    console.error("Other Bank Accounts PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
