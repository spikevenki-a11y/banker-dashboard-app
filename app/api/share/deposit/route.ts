import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const { membership_no, voucher_type, amount, narration ,selectedBatch } = await req.json()

  const businessDate = u.businessDate;

  if (!membership_no || !voucher_type || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  if (!["CASH", "TRANSFER"].includes(voucher_type)) {
    return NextResponse.json({ error: "Invalid voucher type" }, { status: 400 })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    /* ---------------- MEMBERSHIP + SHARE ---------------- */
    const { rows: [row] } = await client.query(`
      SELECT
        m.id AS membership_id,
        s.id AS share_id,
        m.membership_class
      FROM memberships m
      JOIN member_shares s ON s.membership_id = m.id
      WHERE m.membership_no = $1
        AND m.branch_id = $2
        AND m.status = 'ACTIVE'
        AND s.status = 'ACTIVE'
    `, [membership_no, u.branch])
    console.log("the row is",row)

    if (!row) {
      throw new Error("Invalid membership or share account")
    }

    /* ---------------- SHARE CONFIG ---------------- */
    const { rows: [cfg] } = await client.query(`
      SELECT
        share_face_value,
        a_class_share_gl_account,
        b_class_share_gl_account
      FROM config_share
      WHERE branch_id = $1
    `, [u.branch])

    console.log("the u.branch is  ",u.branch)
    console.log("the cfg is  ",cfg)

    if (!cfg) throw new Error("Share config not found")

    if (amount % cfg.share_face_value !== 0) {
      throw new Error("Amount must be multiple of share face value")
    }

    const shareGlAccount =
      row.membership_class === "A"
        ? cfg.a_class_share_gl_account
        : cfg.b_class_share_gl_account

    /* ---------------- BATCH ID ---------------- */
    let batchId = 0
    if (selectedBatch && selectedBatch !== 0) {
        batchId = selectedBatch
    } else {
    const { rows: [batch] } = await client.query(`
        UPDATE gl_batch_sequences
        SET last_batch_id = last_batch_id + 1
        WHERE branch_id = $1
        RETURNING last_batch_id
      `, [u.branch])

      batchId = batch.last_batch_id
    }
    /* ---------------- VOUCHER NO ---------------- */
    let voucherNo = 0
     if (!selectedBatch || selectedBatch === 0) {
      const { rows: [voucher] } = await client.query(`
        INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
        VALUES ($1, $2, 1)
        ON CONFLICT (branch_id, business_date)
        DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
        RETURNING last_voucher_no
      `, [u.branch, businessDate])
        voucherNo = voucher.last_voucher_no
     } else {
      const { rows: [lvo] } = await client.query(`
          select voucher_id from gl_batches
          where branch_id = $1 and batch_id = $2
      `, [u.branch, batchId])
        voucherNo = lvo.voucher_id
     }

    /* ---------------- GL BATCH ---------------- */
    if (selectedBatch && selectedBatch == 0) {
      await client.query(`
        INSERT INTO gl_batches (
          business_date,
          branch_id,
          batch_id,
          voucher_id,
          voucher_type,
          maker_id,
          status
        ) VALUES (
          $1,$2,$3,$4,$5,$6,'PENDING'
        )
      `, [businessDate,u.branch, batchId, voucherNo, voucher_type, u.userId])
     }

    /* ---------------- GL LINES ---------------- */
    // DR Cash / Bank
    if(voucher_type == "CASH" && voucher_type !== "TRANSFER") {
        await client.query(`
        INSERT INTO gl_batch_lines (
            branch_id, batch_id, business_date,
            accountcode, ref_account_id,
            debit_amount, credit_amount,
            voucher_id, narration, created_by
        ) VALUES (
            $1,$2,$3,
            $4,$5,
            $6,0,
            $7,$8,$9
        )
        `, [
        u.branch, batchId, businessDate,
        voucher_type === "CASH" ? 23100000 : 23100000, // example cash/bank GL
        '0',
        amount,
        voucherNo,
        narration,
        u.userId
        ])
    }

    // CR Share Capital
    console.log('shareGlAccount', shareGlAccount);  
    console.log('row.share_id', row.share_id);
    console.log('amount', amount);
    console.log('voucherNo', voucherNo);
    console.log('narration', narration);
    console.log('shareGlAccount', shareGlAccount);
    console.log('row.share_id', row.share_id);
    console.log('amount', amount);
    console.log('voucherNo', voucherNo);
    console.log('narration', narration);

    await client.query(`
      INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES (
        $1,$2,$3,
        $4,$5,
        0,$6,
        $7,$8,$9
      )
    `, [
      u.branch, batchId, businessDate,
      shareGlAccount,
      membership_no,
      amount,
      voucherNo,
      narration,
      u.userId
    ])

    /* ---------------- SHARE TXN ---------------- */
    await client.query(`
      INSERT INTO member_share_transactions (
        branch_id, membership_no,
        voucher_type,
        debit_amount, credit_amount,
        business_date,
        gl_batch_id, voucher_no,
        status, narration, created_by
      ) VALUES (
        $1,$2,
        $3,
        0,$4,
        $5,
        $6,$7,
        'PENDING',$8,$9
      )
    `, [
      u.branch,
      membership_no,
      voucher_type,
      amount,
      businessDate,
      batchId,
      voucherNo,
      narration,
      u.userId
    ])

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      batch_id: batchId,
      status: "PENDING_APPROVAL"
    })

  } catch (e: any) {
    await client.query("ROLLBACK")
    return NextResponse.json({ error: e.message }, { status: 400 })
  } finally {
    client.release()
  }
}
