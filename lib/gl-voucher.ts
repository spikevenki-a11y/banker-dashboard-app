import type { PoolClient } from "pg"

// GL batch/voucher helpers following the Loans → Loan Disbursement posting logic.

export type GlVoucherType = "CASH" | "TRANSFER"

// Opens a new PENDING GL batch: next batch id for the branch, next voucher number for
// the business date, and the gl_batches header row.
export async function openGlVoucher(
  client: PoolClient,
  opts: { branchId: number | string; businessDate: string; voucherType: GlVoucherType; userId: number | string }
): Promise<{ batchId: number; voucherNo: number }> {
  const { rows: [batch] } = await client.query(
    `UPDATE gl_batch_sequences
     SET last_batch_id = last_batch_id + 1
     WHERE branch_id = $1
     RETURNING last_batch_id`,
    [opts.branchId]
  )
  if (!batch) throw new Error("GL batch sequence is not configured for this branch")

  const { rows: [voucher] } = await client.query(
    `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
     VALUES ($1, $2, 1)
     ON CONFLICT (branch_id, business_date)
     DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
     RETURNING last_voucher_no`,
    [opts.branchId, opts.businessDate]
  )

  await client.query(
    `INSERT INTO gl_batches (
       business_date, branch_id, batch_id, voucher_id,
       voucher_type, maker_id, status
     ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
    [opts.businessDate, opts.branchId, batch.last_batch_id, voucher.last_voucher_no, opts.voucherType, opts.userId]
  )

  return { batchId: Number(batch.last_batch_id), voucherNo: Number(voucher.last_voucher_no) }
}

// Locks an existing batch for a Transfer posting. It must be an open (PENDING) transfer
// batch of this branch and business date. Returns its voucher number or an error message.
export async function lockOpenTransferBatch(
  client: PoolClient,
  opts: { branchId: number | string; batchId: number; businessDate: string }
): Promise<{ voucherNo?: number; error?: string }> {
  const { rows } = await client.query(
    `SELECT voucher_id, voucher_type, status, business_date::text AS business_date
     FROM gl_batches
     WHERE branch_id = $1 AND batch_id = $2
     FOR UPDATE`,
    [opts.branchId, opts.batchId]
  )
  const b = rows[0]
  if (!b) return { error: `GL batch ${opts.batchId} not found` }
  if (b.status !== "PENDING") return { error: `GL batch ${opts.batchId} is already ${String(b.status).toLowerCase()}` }
  if (b.voucher_type !== "TRANSFER") return { error: `GL batch ${opts.batchId} is not a transfer batch` }
  if (b.business_date !== String(opts.businessDate).slice(0, 10)) {
    return { error: `GL batch ${opts.batchId} belongs to another business date` }
  }
  return { voucherNo: Number(b.voucher_id) }
}

export async function insertGlLine(
  client: PoolClient,
  line: {
    branchId: number | string
    batchId: number
    businessDate: string
    voucherNo: number
    accountCode: string | number
    refAccountId: string
    debit?: number
    credit?: number
    narration: string
    userId: number | string
  }
) {
  await client.query(
    `INSERT INTO gl_batch_lines (
       branch_id, batch_id, business_date,
       accountcode, ref_account_id,
       debit_amount, credit_amount,
       voucher_id, narration, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      line.branchId, line.batchId, line.businessDate,
      line.accountCode, line.refAccountId,
      line.debit ?? 0, line.credit ?? 0,
      line.voucherNo, line.narration, line.userId,
    ]
  )
}
