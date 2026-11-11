// Gold Guidelines Value per Gram (Settings > Management > Gold Guidelines Value)
// and the Maximum Sanction Amount it gives a gold loan:
//   Maximum Sanction Amount = Guidelines Value per Gram x Net Weight

type Queryable = { query: (text: string, values?: any[]) => Promise<{ rows: any[] }> }

export type GoldGuideline = {
  id: number
  value_per_gram: number
  effective_from: string
  remarks: string | null
  created_by: string | null
  created_at: string
}

const COLUMNS = `id, value_per_gram::float8 AS value_per_gram,
  TO_CHAR(effective_from, 'YYYY-MM-DD') AS effective_from, remarks, created_by, created_at`

/** The guideline value in force for a branch (the latest one set), or null if none. */
export async function getCurrentGoldGuideline(db: Queryable, branchId: string | number): Promise<GoldGuideline | null> {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM gold_guideline_values WHERE branch_id = $1 ORDER BY id DESC LIMIT 1`,
    [Number(branchId)]
  )
  return rows[0] ?? null
}

/** Every value set for a branch, newest first. */
export async function getGoldGuidelineHistory(db: Queryable, branchId: string | number, limit = 50): Promise<GoldGuideline[]> {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM gold_guideline_values WHERE branch_id = $1 ORDER BY id DESC LIMIT $2`,
    [Number(branchId), limit]
  )
  return rows
}

/** Guidelines value x net weight, rounded to paise. 0 when either is missing. */
export function calculateMaxSanctionAmount(valuePerGram: number | string | null | undefined, netWeightGrams: number | string | null | undefined): number {
  const rate = Number(valuePerGram)
  const weight = Number(netWeightGrams)
  if (!Number.isFinite(rate) || !Number.isFinite(weight) || rate <= 0 || weight <= 0) return 0
  return Math.round(rate * weight * 100) / 100
}
