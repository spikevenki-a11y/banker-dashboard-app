import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function GET() {
  const c = (await cookies()).get("banker_session")
  if (!c) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const u = JSON.parse(c.value)

  try {
    const { rows } = await pool.query(
      `SELECT
        b.id,
        b.batch_id,
        b.voucher_id,
        b.business_date,
        b.voucher_type,
        b.status,
        b.maker_id,
        b.created_at,
        su.full_name AS maker_name,
        su.employee_code AS maker_emp_code,
        COALESCE(SUM(l.debit_amount), 0) AS total_debit,
        COALESCE(SUM(l.credit_amount), 0) AS total_credit
      FROM gl_batches b
      LEFT JOIN staff_users su ON su.id = b.maker_id
      LEFT JOIN gl_batch_lines l
        ON l.branch_id = b.branch_id
        AND l.batch_id = b.batch_id
      WHERE b.branch_id = $1
        AND b.status = 'PENDING'
      GROUP BY b.id, b.batch_id, b.voucher_id, b.business_date,
               b.voucher_type, b.status, b.maker_id, b.created_at,
               su.full_name, su.employee_code
      ORDER BY b.business_date DESC, b.batch_id DESC`,
      [u.branch]
    )

    return NextResponse.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        batchId: r.batch_id,
        voucherId: r.voucher_id,
        businessDate: r.business_date,
        voucherType: r.voucher_type,
        status: r.status,
        makerId: r.maker_id,
        makerName: r.maker_name || "N/A",
        makerEmpCode: r.maker_emp_code || "",
        createdAt: r.created_at,
        totalDebit: Number(r.total_debit),
        totalCredit: Number(r.total_credit),
      })),
    })
  } catch (e) {
    console.error("Pending vouchers fetch error:", e)
    return NextResponse.json(
      { error: "Failed to load pending vouchers" },
      { status: 500 }
    )
  }
}
