import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = JSON.parse(c.value)
  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get("batchId")

  if (!batchId) {
    return NextResponse.json({ error: "Batch ID is required" }, { status: 400 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        gbl.id,
        gbl.accountcode,
        gbl.ref_account_id,
        gbl.debit_amount,
        gbl.credit_amount,
        gbl.narration,
        coa.accountname
      FROM gl_batch_lines gbl
      LEFT JOIN chart_of_accounts coa
        ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
      WHERE gbl.batch_id = $1
        AND gbl.branch_id = $2
      ORDER BY gbl.created_at ASC`,
      [parseInt(batchId), u.branch]
    )

    return NextResponse.json({
      success: true,
      lines: rows.map((l: any) => ({
        id: l.id,
        accountCode: l.accountcode,
        accountName: l.accountname || "Unknown Account",
        refAccountId: l.ref_account_id,
        debitAmount: parseFloat(l.debit_amount || "0"),
        creditAmount: parseFloat(l.credit_amount || "0"),
        narration: l.narration,
      })),
    })
  } catch (e) {
    console.error("Voucher detail fetch error:", e)
    return NextResponse.json(
      { error: "Failed to load voucher details" },
      { status: 500 }
    )
  }
}
