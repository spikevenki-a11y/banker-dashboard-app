const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Queryable = { query: (text: string, values?: any[]) => Promise<{ rows: any[] }> }

export const SLAB_COLUMNS = `id, appraisal_slab_id, appraisal_master_id, loan_amount_from, loan_amount_to,
       charge_type, charge_value, minimum_charge, maximum_charge, status, created_by, created_date`

export interface SlabInput {
  loan_amount_from: number
  loan_amount_to: number
  charge_type: "FIXED" | "PERCENTAGE"
  charge_value: number
  minimum_charge: number | null
  maximum_charge: number | null
  status: "ACTIVE" | "INACTIVE"
}

export const isUuid = (value: string) => UUID_RE.test(value)

// Maps the master's row uuid to the appraisal_master_id that slabs reference
export async function resolveMasterId(db: Queryable, id: string): Promise<number | null> {
  if (!isUuid(id)) return null
  const { rows } = await db.query(`SELECT appraisal_master_id FROM appraisal_master WHERE id = $1`, [id])
  return rows[0]?.appraisal_master_id ?? null
}

const toNumber = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value))

export function parseSlabInput(body: any): SlabInput | { error: string } {
  const from = toNumber(body?.loan_amount_from)
  const to = toNumber(body?.loan_amount_to)
  const value = toNumber(body?.charge_value)
  const min = toNumber(body?.minimum_charge)
  const max = toNumber(body?.maximum_charge)
  const chargeType = body?.charge_type

  if (from === null || to === null || Number.isNaN(from) || Number.isNaN(to)) {
    return { error: "Loan amount from and to are required" }
  }
  if (from < 0 || to < from) return { error: "Loan amount to must be greater than or equal to loan amount from" }
  if (chargeType !== "FIXED" && chargeType !== "PERCENTAGE") return { error: "Charge type must be FIXED or PERCENTAGE" }
  if (value === null || Number.isNaN(value) || value < 0) return { error: "Charge value must be zero or more" }
  if (chargeType === "PERCENTAGE" && value > 100) return { error: "Percentage charge cannot exceed 100" }
  if ((min !== null && (Number.isNaN(min) || min < 0)) || (max !== null && (Number.isNaN(max) || max < 0))) {
    return { error: "Minimum and maximum charge must be zero or more" }
  }
  if (min !== null && max !== null && max < min) return { error: "Maximum charge cannot be less than minimum charge" }

  return {
    loan_amount_from: from,
    loan_amount_to: to,
    charge_type: chargeType,
    charge_value: value,
    minimum_charge: min,
    maximum_charge: max,
    status: body?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  }
}

// The charge lookup picks a single ACTIVE slab per amount, so active ranges must not overlap
export async function findOverlappingSlab(
  db: Queryable,
  masterId: number,
  slab: SlabInput,
  excludeId: string | null
): Promise<string | null> {
  const { rows } = await db.query(
    `SELECT loan_amount_from, loan_amount_to FROM appraisal_slab
     WHERE appraisal_master_id = $1
       AND status = 'ACTIVE'
       AND loan_amount_from <= $3
       AND loan_amount_to >= $2
       AND ($4::uuid IS NULL OR id <> $4::uuid)
     ORDER BY loan_amount_from
     LIMIT 1`,
    [masterId, slab.loan_amount_from, slab.loan_amount_to, excludeId]
  )
  if (rows.length === 0) return null
  return `Amount range overlaps an active slab (${rows[0].loan_amount_from} – ${rows[0].loan_amount_to})`
}
