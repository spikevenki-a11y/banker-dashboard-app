import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const loanAmount = Number(searchParams.get("loan_amount"))
  const appraisalMasterId = searchParams.get("appraisal_master_id")

  if (!loanAmount || !appraisalMasterId) {
    return NextResponse.json({ error: "loan_amount and appraisal_master_id are required" }, { status: 400 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT charge_type, charge_value, minimum_charge, maximum_charge
       FROM appraisal_slab
       WHERE appraisal_master_id = $1
         AND loan_amount_from <= $2
         AND loan_amount_to >= $2
         AND status = 'ACTIVE'
       LIMIT 1`,
      [Number(appraisalMasterId), loanAmount]
    )

    if (rows.length === 0) {
      return NextResponse.json({ charge_amount: null, message: "No slab found for this amount" })
    }

    const slab = rows[0]
    let charge = 0

    if (slab.charge_type === "FIXED") {
      charge = Number(slab.charge_value)
    } else if (slab.charge_type === "PERCENTAGE") {
      charge = (loanAmount * Number(slab.charge_value)) / 100
    }

    if (slab.minimum_charge !== null && charge < Number(slab.minimum_charge)) {
      charge = Number(slab.minimum_charge)
    }
    if (slab.maximum_charge !== null && charge > Number(slab.maximum_charge)) {
      charge = Number(slab.maximum_charge)
    }

    return NextResponse.json({
      charge_amount: Math.round(charge * 100) / 100,
      charge_type: slab.charge_type,
      charge_value: Number(slab.charge_value),
    })
  } catch (err: any) {
    console.error("Appraiser charge lookup error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
