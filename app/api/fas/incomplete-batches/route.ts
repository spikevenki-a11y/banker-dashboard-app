import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function GET() {
    console.log("Fetching incomplete batches...")
  const c = (await cookies()).get("banker_session")
  if (!c) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const u = JSON.parse(c.value)

  try {
    const { rows } = await pool.query(`
      SELECT
        b.batch_id,
        b.business_date,
        b.voucher_type,
        SUM(l.debit_amount) AS total_debit,
        SUM(l.credit_amount) AS total_credit,
        (SUM(l.debit_amount) - SUM(l.credit_amount)) AS difference
      FROM gl_batches b
      JOIN gl_batch_lines l
        ON l.branch_id = b.branch_id
       AND l.batch_id = b.batch_id
      WHERE b.branch_id = $1
        AND b.status = 'PENDING'
      GROUP BY b.batch_id, b.business_date, b.voucher_type
      HAVING SUM(l.debit_amount) <> SUM(l.credit_amount)
      ORDER BY b.business_date, b.batch_id
    `, [u.branch])
    console.log("Incomplete batches fetched:", rows.length)

    return NextResponse.json({
      success: true,
      data: rows.map(r => ({
        batch_id: r.batch_id,
        business_date: r.business_date,
        voucher_type: r.voucher_type,
        total_debit: Number(r.total_debit),
        total_credit: Number(r.total_credit),
        difference: Number(r.difference)
      }))
    })

  } catch (e) {
    console.error("Incomplete batch fetch error:", e)
    return NextResponse.json(
      { error: "Failed to load incomplete batches" },
      { status: 500 }
    )
  }
}
