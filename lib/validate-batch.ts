import type { PoolClient } from "pg"

// A batch is still open (can take more lines) only while it is PENDING.
// Approval moves it to COMPLETED, rejection to REJECTED.
const OPEN_BATCH_STATUS = "PENDING"

export class BatchValidationError extends Error {
  readonly status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = "BatchValidationError"
    this.status = status
  }
}

export interface ValidatedBatch {
  batch_id: number
  voucher_id: number
  voucher_type: string
}

// The fields of SessionData this check needs (numbers allowed for branch/user ids).
type BatchSession = {
  branch: string | number
  businessDate: string
  userId: string | number
}

// Normalises the client's selected batch: 0 / empty / null means "start a new
// batch"; anything else must be a positive integer.
export function parseSelectedBatch(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "" || raw === 0 || raw === "0") return 0
  const n = Number(raw)
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new BatchValidationError("Invalid batch selected")
  }
  return n
}

// Locks a client-selected batch (SELECT ... FOR UPDATE) and checks that the
// current user may add lines to it. Must be called inside an open transaction
// on `client`. Throws BatchValidationError if any check fails.
export async function validateSelectedBatch(
  client: PoolClient,
  batchId: number,
  session: BatchSession
): Promise<ValidatedBatch> {
  if (!Number.isSafeInteger(batchId) || batchId <= 0) {
    throw new BatchValidationError("Invalid batch selected")
  }

  const { rows } = await client.query(
    `SELECT batch_id, voucher_id, voucher_type, status,
            maker_id::text AS maker_id,
            business_date = $3::date AS same_business_date
       FROM gl_batches
      WHERE batch_id = $1 AND branch_id = $2
      FOR UPDATE`,
    [batchId, session.branch, session.businessDate]
  )
  const batch = rows[0]

  // batch_id is unique per branch, so another branch's batch is simply "not found".
  if (!batch) {
    throw new BatchValidationError(`Batch #${batchId} not found in your branch`, 404)
  }
  if (batch.status !== OPEN_BATCH_STATUS) {
    throw new BatchValidationError(
      `Batch #${batchId} is no longer open (status: ${batch.status})`,
      409
    )
  }
  if (!batch.same_business_date) {
    throw new BatchValidationError(
      `Batch #${batchId} belongs to a different business date`,
      409
    )
  }
  if (batch.maker_id !== String(session.userId)) {
    throw new BatchValidationError(`Batch #${batchId} was created by another user`, 403)
  }

  return {
    batch_id: Number(batch.batch_id),
    voucher_id: Number(batch.voucher_id),
    voucher_type: batch.voucher_type,
  }
}
