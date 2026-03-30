import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const accountNumber = request.nextUrl.searchParams.get("account_number")

    if (!accountNumber) {
      return NextResponse.json({ error: "account_number is required" }, { status: 400 })
    }

    const { rows: transactions } = await pool.query(
      `SELECT
         gst.*,
         gb.status AS batch_status,
         gb.voucher_type AS batch_voucher_type
       FROM grands_and_subsidies_transactions gst
       LEFT JOIN gl_batches gb ON gb.branch_id = gst.branch_id AND gb.batch_id = gst.reference_no::BIGINT
       WHERE gst.account_number = $1 AND gst.branch_id = $2
       ORDER BY gst.transaction_date DESC, gst.created_at DESC`,
      [accountNumber, branchId]
    )

    return NextResponse.json(transactions)
  } catch (error: any) {
    console.error("Grants & Subsidies GET Transactions error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const body = await request.json()
    const businessDate = session.businessDate || new Date().toISOString().split("T")[0]

    const {
      entries,
      transaction_date,
      transaction_type,
      voucher_type,
      selected_batch,
    } = body

    if (!voucher_type || !["CASH", "TRANSFER"].includes(voucher_type)) {
      return NextResponse.json(
        { error: "Valid voucher type (CASH/TRANSFER) is required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "At least one account entry is required" }, { status: 400 })
    }

    const processedEntries = entries.map((e: any) => ({
      account_number: e.account_number,
      amount: parseFloat(e.amount),
      description: e.description || `Grants & Subsidies ${transaction_type}`,
    }))

    for (const entry of processedEntries) {
      if (!entry.amount || entry.amount <= 0) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: `Invalid amount for account ${entry.account_number}` },
          { status: 400 }
        )
      }
    }

    /* --- BATCH ID --- */
    let batchId = 0
    if (selected_batch && selected_batch !== 0) {
      batchId = selected_batch
    } else {
      const { rows: [batch] } = await client.query(
        `UPDATE gl_batch_sequences
         SET last_batch_id = last_batch_id + 1
         WHERE branch_id = $1
         RETURNING last_batch_id`,
        [session.branch]
      )
      if (!batch) {
        await client.query(
          `INSERT INTO gl_batch_sequences (branch_id, last_batch_id)
           VALUES ($1, 1)
           ON CONFLICT (branch_id) DO UPDATE SET last_batch_id = gl_batch_sequences.last_batch_id + 1`,
          [session.branch]
        )
        const { rows: [nb] } = await client.query(
          `SELECT last_batch_id FROM gl_batch_sequences WHERE branch_id = $1`,
          [session.branch]
        )
        batchId = nb?.last_batch_id || 1
      } else {
        batchId = batch.last_batch_id
      }
    }

    /* --- VOUCHER NO --- */
    let voucherNo = 0
    if (!selected_batch || selected_batch === 0) {
      const { rows: [voucher] } = await client.query(
        `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
         VALUES ($1, $2, 1)
         ON CONFLICT (branch_id, business_date)
         DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
         RETURNING last_voucher_no`,
        [session.branch, businessDate]
      )
      voucherNo = voucher.last_voucher_no
    } else {
      const { rows: [lvo] } = await client.query(
        `SELECT voucher_id FROM gl_batches WHERE branch_id = $1 AND batch_id = $2`,
        [session.branch, batchId]
      )
      voucherNo = lvo?.voucher_id || 0
    }

    /* --- GL BATCH HEADER --- */
    if (!selected_batch || selected_batch === 0) {
      await client.query(
        `INSERT INTO gl_batches (
           business_date, branch_id, batch_id, voucher_id,
           voucher_type, maker_id, status
         ) VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
        [businessDate, session.branch, batchId, voucherNo, voucher_type, session.userId]
      )
    }

    const totalAmount = processedEntries.reduce((sum: number, e: any) => sum + e.amount, 0)

    /* --- CASH GL LINE --- */
    // Grants & Subsidies are liability-like: CREDIT increases (DR Cash, CR GL), DEBIT decreases (CR Cash, DR GL)
    const cashGl = voucher_type === "TRANSFER" ? "11100000" : "23100000"
    if (transaction_type === "CREDIT") {
      // Grant/subsidy received — DR Cash
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1,$2,$3,$4,'0',$5,0,$6,$7,$8)`,
        [session.branch, batchId, businessDate, cashGl, totalAmount, voucherNo,
          "Grants & Subsidies - Receipt", session.userId]
      )
    } else {
      // Disbursement / repayment — CR Cash
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1,$2,$3,$4,'0',0,$5,$6,$7,$8)`,
        [session.branch, batchId, businessDate, cashGl, totalAmount, voucherNo,
          "Grants & Subsidies - Payment", session.userId]
      )
    }

    /* --- PROCESS EACH ENTRY --- */
    for (const entry of processedEntries) {
      const { rows: accounts } = await client.query(
        `SELECT gsm.*, coa.accountcode AS gl_accountcode
         FROM grands_and_subsidies_master gsm
         LEFT JOIN chart_of_accounts coa ON coa.accountcode = gsm.parent_account_number::BIGINT
         WHERE gsm.account_number = $1 AND gsm.branch_id = $2
         FOR UPDATE OF gsm`,
        [entry.account_number, session.branch]
      )

      if (accounts.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: `Account not found: ${entry.account_number}` },
          { status: 404 }
        )
      }

      const account = accounts[0]
      const currentBalance = parseFloat(account.ledger_balance) || 0
      const glAccountCode = account.parent_account_number

      let newBalance: number
      let debitAmt = 0
      let creditAmt = 0

      if (transaction_type === "CREDIT") {
        // Credit increases the fund balance
        newBalance = currentBalance + entry.amount
        creditAmt = entry.amount
        // CR: Grants/Subsidies GL
        await client.query(
          `INSERT INTO gl_batch_lines (
             branch_id, batch_id, business_date,
             accountcode, ref_account_id,
             debit_amount, credit_amount,
             voucher_id, narration, created_by
           ) VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)`,
          [session.branch, batchId, businessDate, glAccountCode, entry.account_number,
            entry.amount, voucherNo, entry.description, session.userId]
        )
      } else {
        // Debit decreases the fund balance
        newBalance = currentBalance - entry.amount
        debitAmt = entry.amount
        // DR: Grants/Subsidies GL
        await client.query(
          `INSERT INTO gl_batch_lines (
             branch_id, batch_id, business_date,
             accountcode, ref_account_id,
             debit_amount, credit_amount,
             voucher_id, narration, created_by
           ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
          [session.branch, batchId, businessDate, glAccountCode, entry.account_number,
            entry.amount, voucherNo, entry.description, session.userId]
        )
      }

      /* --- INSERT TRANSACTION RECORD --- */
      await client.query(
        `INSERT INTO grands_and_subsidies_transactions (
           branch_id, account_number, transaction_date, voucher_no,
           voucher_type, description, debit_amount, credit_amount,
           running_balance, reference_no, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          session.branch, entry.account_number,
          transaction_date || businessDate, voucherNo,
          voucher_type, entry.description, debitAmt, creditAmt,
          newBalance, String(batchId),
          session.userId,
        ]
      )

      await client.query(
        `UPDATE grands_and_subsidies_master
         SET ledger_balance = $1
         WHERE account_number = $2 AND branch_id = $3`,
        [newBalance, entry.account_number, session.branch]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      batch_id: batchId,
      entries_count: processedEntries.length,
      total_amount: totalAmount,
      message: `${processedEntries.length} grants & subsidies transaction(s) recorded. Batch: ${batchId}, Voucher: ${voucherNo}. Total: ₹${totalAmount.toLocaleString("en-IN")}`,
    }, { status: 201 })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Grants & Subsidies POST Transaction error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
