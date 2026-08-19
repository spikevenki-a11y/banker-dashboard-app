import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const { userId, branch: branchId } = session

    const { locker_id, reason, breaking_charge, voucher_type, selected_batch, remarks } = await req.json()

    if (!locker_id || !reason?.trim()) {
      return NextResponse.json({ error: "locker_id and reason are required" }, { status: 400 })
    }

    const charge = Number(breaking_charge) || 0
    if (charge > 0 && !["CASH", "TRANSFER"].includes(voucher_type)) {
      return NextResponse.json(
        { error: "A valid voucher_type (CASH or TRANSFER) is required when breaking charge is greater than zero" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")
    console.log(`Starting break-locker operation for locker_id: ${locker_id}, branch_id: ${branchId}, user_id: ${userId}`)

    // ── 1. Lock and verify locker is ALLOCATED ──────────────────────────────
    const { rows: lockerRows } = await client.query(
      `SELECT l.id, l.locker_no, l.status, l.locker_type_id
       FROM lockers l
       WHERE l.id = $1 AND l.branch_id = $2
       FOR UPDATE`,
      [locker_id, branchId]
    )

    if (lockerRows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Locker not found" }, { status: 404 })
    }
    if (lockerRows[0].status !== "ALLOCATED") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Only ALLOCATED lockers can be broken open" }, { status: 400 })
    }
    const locker = lockerRows[0]

    // ── 2. Get active assignment ────────────────────────────────────────────
    const { rows: assignRows } = await client.query(
      `SELECT id, membership_no, annual_rent, deposit_amount
       FROM locker_assignments
       WHERE locker_id = $1 AND status = 'ACTIVE'
       ORDER BY created_at DESC LIMIT 1`,
      [locker_id]
    )
    const assignment = assignRows[0] ?? null

    // ── 3. Get active deposit account (if any) ──────────────────────────────
    console.log(`Fetching active deposit for locker_id: ${locker_id}, branch_id: ${branchId}`)
    const { rows: depositRows } = await client.query(
      `SELECT ld.id, ld.membership_no, ld.deposit_amount, lt.annual_rent
       FROM locker_deposits ld
       LEFT JOIN lockers l
          ON l.id = ld.locker_id
      LEFT JOIN locker_types lt
          ON lt.locker_type_id = l.locker_type_id
       WHERE ld.locker_id = $1 AND ld.branch_id = $2 AND ld.status = 'ACTIVE'
       LIMIT 1`,
      [locker_id, branchId]
    )
    const deposit = depositRows[0] ?? null

    const membershipNo = assignment?.membership_no ?? deposit?.membership_no
    if (!membershipNo) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "No active assignment or deposit found for this locker" }, { status: 400 })
    }

    // ── 4. Get member name (best-effort) ────────────────────────────────────
    let memberName: string | null = null
    try {
      const { rows } = await client.query(
        `SELECT full_name FROM memberships WHERE membership_no = $1 LIMIT 1`,
        [membershipNo]
      )
      memberName = rows[0]?.full_name ?? null
    } catch {}

    // ── 5. Get business date ────────────────────────────────────────────────
    let businessDate = new Date().toISOString().split("T")[0]
    try {
      const { rows } = await client.query(
        `SELECT business_date FROM business_dates WHERE branch_id = $1 AND is_current = true LIMIT 1`,
        [branchId]
      )
      if (rows[0]?.business_date) businessDate = rows[0].business_date
    } catch {}

    // ── 6. Resolve penalty GL account from config (fallback: 41203000) ──────
    let penaltyGl = 41203000
    try {
      const { rows } = await client.query(
        `SELECT cl.locker_penalty_gl_account
         FROM config_locker cl
         JOIN locker_types lt ON lt.id = cl.locker_type_id
         WHERE lt.locker_type_id = $1 AND cl.branch_id = $2 AND cl.is_active = true
         LIMIT 1`,
        [locker.locker_type_id, branchId]
      )
      if (rows[0]?.locker_penalty_gl_account) {
        penaltyGl = Number(rows[0].locker_penalty_gl_account)
      }
    } catch {}

    // ── 7. Set locker → MAINTENANCE ─────────────────────────────────────────
    await client.query(
      `UPDATE lockers SET status = 'MAINTENANCE' WHERE id = $1`,
      [locker_id]
    )

    // ── 8. Create locker_maintenance record ─────────────────────────────────
    await client.query(
      `INSERT INTO locker_maintenance (branch_id, locker_id, start_date, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [branchId, locker_id, businessDate, `BREAK_OPEN: ${reason.trim()}`, userId]
    )

    // ── 9. Close active assignment ──────────────────────────────────────────
    if (assignment) {
      await client.query(
        `UPDATE locker_assignments SET status = 'CLOSED', updated_at = NOW() WHERE id = $1`,
        [assignment.id]
      )

      await client.query(
        `INSERT INTO locker_assignment_history
           (locker_id, membership_no, released_date, annual_rent, deposit_amount, action, performed_by, branch_id)
         VALUES ($1, $2, $3, $4, $5, 'RELEASED', $6, $7)`,
        [
          locker_id, membershipNo, businessDate,
          assignment.annual_rent ?? 0,
          assignment.deposit_amount ?? 0,
          userId, branchId,
        ]
      )
    }

    // ── 10. Close deposit account ───────────────────────────────────────────
    if (deposit) {
      await client.query(
        `UPDATE locker_deposits SET status = 'CLOSED', updated_at = NOW() WHERE id = $1`,
        [deposit.id]
      )
    }

    // ── 11. GL entries for breaking charge ──────────────────────────────────
    let voucherNo: number | null = null
    let batchId: number | null = null

    if (charge > 0) {
      const narration = `Locker Breaking Charge - ${locker.locker_no}`

      if (selected_batch && selected_batch !== 0) {
        batchId = selected_batch
        const { rows: [lvo] } = await client.query(
          `SELECT voucher_id FROM gl_batches WHERE branch_id = $1 AND batch_id = $2`,
          [branchId, batchId]
        )
        voucherNo = lvo?.voucher_id ?? null
      } else {
        const { rows: [batch] } = await client.query(
          `UPDATE gl_batch_sequences SET last_batch_id = last_batch_id + 1
           WHERE branch_id = $1 RETURNING last_batch_id`,
          [branchId]
        )
        batchId = batch.last_batch_id

        const { rows: [voucher] } = await client.query(
          `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
           VALUES ($1, $2, 1)
           ON CONFLICT (branch_id, business_date)
           DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
           RETURNING last_voucher_no`,
          [branchId, businessDate]
        )
        voucherNo = voucher.last_voucher_no

        await client.query(
          `INSERT INTO gl_batches (business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status)
           VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
          [businessDate, branchId, batchId, voucherNo, voucher_type, userId]
        )
      }

      // DR Cash (CASH voucher only)
      if (voucher_type === "CASH") {
        await client.query(
          `INSERT INTO gl_batch_lines
             (branch_id, batch_id, business_date, accountcode, ref_account_id,
              debit_amount, credit_amount, voucher_id, narration, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
          [branchId, batchId, businessDate, 23100000, String(locker_id), charge, voucherNo, narration, userId]
        )
      }

      // CR Penalty income GL
      await client.query(
        `INSERT INTO gl_batch_lines
           (branch_id, batch_id, business_date, accountcode, ref_account_id,
            debit_amount, credit_amount, voucher_id, narration, created_by)
         VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)`,
        [branchId, batchId, businessDate, penaltyGl, String(locker_id), charge, voucherNo, narration, userId]
      )
    }

    // ── 12. Create break event audit record ─────────────────────────────────
    const { rows: breakRows } = await client.query(
      `INSERT INTO locker_break_events
         (branch_id, locker_id, assignment_id, deposit_id, membership_no,
          locker_no, member_name, break_reason, remarks,
          breaking_charge, voucher_type, voucher_no, batch_id, performed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        branchId, locker_id,
        assignment?.id ?? null,
        deposit?.id ?? null,
        membershipNo,
        locker.locker_no,
        memberName,
        reason.trim(),
        remarks?.trim() || null,
        charge,
        charge > 0 ? voucher_type : null,
        voucherNo, batchId,
        userId,
      ]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      break_event_id: breakRows[0].id,
      locker_no: locker.locker_no,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error during break-locker operation:", error)
    return NextResponse.json({ error: "Break locker failed: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
