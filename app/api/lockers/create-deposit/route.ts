import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const branchId = session.branch

    const {
      membership_no,
      deposit_amount,
      interest_rate,
      opening_date,
      period_years,
      nominee_name,
      nominee_relation,
      locker_id,
      voucher_type,
      selected_batch,
      narration,
      already_allocated,
    } = await req.json()

    if (!membership_no || !deposit_amount || !opening_date) {
      return NextResponse.json(
        { error: "membership_no, deposit_amount, and opening_date are required" },
        { status: 400 }
      )
    }

    if (!voucher_type || !["CASH", "TRANSFER"].includes(voucher_type)) {
      return NextResponse.json({ error: "Valid voucher_type (CASH/TRANSFER) is required" }, { status: 400 })
    }

    await client.query("BEGIN")

    // Generate account number: branch(3) + "06" + seq(6) = 11 chars
    const seqResult = await client.query(
      `SELECT MAX(account_number )  + 1 AS next_seq
       FROM locker_deposits WHERE branch_id = $1`,
      [branchId]
    )
    const nextSeq = seqResult.rows[0].next_seq
    // const accountNumber = `${String(branchId).padStart(3, "0")}06${String(nextSeq).padStart(6, "0")}`
    const accountNumber = nextSeq

    // Calculate expiry date
    const years = Number(period_years) || 1
    const openDate = new Date(opening_date)
    openDate.setFullYear(openDate.getFullYear() + years)
    const expiryDate = openDate.toISOString().split("T")[0]

    // If a locker was selected, verify it is available (skip when locker is pre-allocated via allocation wizard)
    if (locker_id && !already_allocated) {
      const lockerCheck = await client.query(
        `SELECT id, status FROM lockers WHERE id = $1 AND branch_id = $2`,
        [locker_id, branchId]
      )
      if (lockerCheck.rows.length === 0 || lockerCheck.rows[0].status !== "AVAILABLE") {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Selected locker is not available" }, { status: 400 })
      }
    }

    // Insert locker deposit
    const depositResult = await client.query(
      `INSERT INTO locker_deposits (
         account_number, branch_id, membership_no, locker_id,
         deposit_amount, interest_rate, opening_date, period_years, expiry_date,
         nominee_name, nominee_relation, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ACTIVE')
       RETURNING id, account_number`,
      [
        accountNumber,
        branchId,
        membership_no,
        locker_id || null,
        Number(deposit_amount),
        Number(interest_rate) || 0,
        opening_date,
        years,
        expiryDate,
        nominee_name?.trim() || null,
        nominee_relation || null,
      ]
    )

    // Mark locker as ALLOCATED (skip when already allocated via allocation wizard)
    if (locker_id && !already_allocated) {
      await client.query(`UPDATE lockers SET status = 'ALLOCATED' WHERE id = $1`, [locker_id])
    }

    /* --- GL Batch ID --- */
    let batchId = 0
    if (selected_batch && selected_batch !== 0) {
      batchId = selected_batch
    } else {
      const { rows: [batch] } = await client.query(
        `UPDATE gl_batch_sequences SET last_batch_id = last_batch_id + 1 WHERE branch_id = $1 RETURNING last_batch_id`,
        [branchId]
      )
      batchId = batch.last_batch_id
    }

    /* --- Voucher No --- */
    let voucherNo = 0
    if (!selected_batch || selected_batch === 0) {
      const { rows: [voucher] } = await client.query(
        `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
         VALUES ($1, $2, 1)
         ON CONFLICT (branch_id, business_date)
         DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
         RETURNING last_voucher_no`,
        [branchId, opening_date]
      )
      voucherNo = voucher.last_voucher_no
    } else {
      const { rows: [lvo] } = await client.query(
        `SELECT voucher_id FROM gl_batches WHERE branch_id = $1 AND batch_id = $2`,
        [branchId, batchId]
      )
      voucherNo = lvo.voucher_id
    }

    /* --- GL Batch record --- */
    if (!selected_batch || selected_batch === 0) {
      await client.query(
        `INSERT INTO gl_batches (business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
        [opening_date, branchId, batchId, voucherNo, voucher_type, session.userId]
      )
    }

    const txnNarration = narration || "Locker Deposit Opening"
    const lockerDepositGl = 12203000

    /* --- GL Lines: DR Cash (CASH only) --- */
    if (voucher_type === "CASH") {
      await client.query(
        `INSERT INTO gl_batch_lines (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
        [branchId, batchId, opening_date, 23100000, "0", Number(deposit_amount), voucherNo, txnNarration, session.userId]
      )
    }

    /* --- GL Lines: CR Locker Deposit GL --- */
    await client.query(
      `INSERT INTO gl_batch_lines (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
       VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)`,
      [branchId, batchId, opening_date, lockerDepositGl, depositResult.rows[0].account_number, Number(deposit_amount), voucherNo, txnNarration, session.userId]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      account_number: depositResult.rows[0].account_number,
      deposit_id: depositResult.rows[0].id,
      expiry_date: expiryDate,
      locker_assigned: !!locker_id,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error creating locker deposit:", error)
    return NextResponse.json({ error: "Failed to create locker deposit: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
