import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const voucherNo = searchParams.get("voucherNo")
    const date = searchParams.get("date")

    if (!voucherNo || !date) {
      return NextResponse.json(
        { error: "Voucher number and date are required" },
        { status: 400 }
      )
    }

    // Fetch the GL batch (voucher header)
    const { rows: batchRows } = await pool.query(
      `SELECT 
         gb.id,
         gb.batch_id,
         gb.voucher_id,
         gb.voucher_type,
         gb.business_date,
         gb.status,
         gb.maker_id,
         gb.checker_id,
         gb.created_at,
         gb.approved_at,
         su_maker.full_name AS maker_name,
         su_maker.employee_code AS maker_emp_code,
         su_checker.full_name AS checker_name,
         su_checker.employee_code AS checker_emp_code
       FROM gl_batches gb
       LEFT JOIN staff_users su_maker ON su_maker.id = gb.maker_id
       LEFT JOIN staff_users su_checker ON su_checker.id = gb.checker_id
       WHERE gb.voucher_id = $1
         AND gb.business_date = $2
         AND gb.branch_id = $3`,
      [parseInt(voucherNo), date, branchId]
    )

    if (batchRows.length === 0) {
      return NextResponse.json(
        { error: "Voucher not found for the given date and number" },
        { status: 404 }
      )
    }

    const batch = batchRows[0]

    if (batch.status !== "COMPLETED" && batch.status !== "APPROVED") {
      return NextResponse.json(
        {
          error: `Transaction is not completed. Current status: ${batch.status}`,
          status: batch.status,
        },
        { status: 400 }
      )
    }

    // Fetch all GL batch lines for this voucher
    const { rows: lineRows } = await pool.query(
      `SELECT 
         gbl.id,
         gbl.accountcode,
         gbl.ref_account_id,
         gbl.debit_amount,
         gbl.credit_amount,
         gbl.narration,
         gbl.created_by,
         coa.accountname
       FROM gl_batch_lines gbl
       LEFT JOIN chart_of_accounts coa 
         ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
       WHERE gbl.batch_id = $1
         AND gbl.business_date = $2
         AND gbl.branch_id = $3
       ORDER BY gbl.created_at ASC`,
      [batch.batch_id, date, branchId]
    )

    if (lineRows.length === 0) {
      return NextResponse.json(
        { error: "No transaction lines found for this voucher" },
        { status: 404 }
      )
    }

    // Fetch branch details for the header
    const { rows: branchRows } = await pool.query(
      `SELECT branch_name, bank_name, address, city, state, postal_code, phone_number, email
       FROM branchparameters
       WHERE branch_id = $1`,
      [branchId]
    )

    const branch = branchRows[0] || {}

    // Calculate totals
    const totalDebit = lineRows.reduce(
      (sum: number, l: any) => sum + parseFloat(l.debit_amount || "0"),
      0
    )
    const totalCredit = lineRows.reduce(
      (sum: number, l: any) => sum + parseFloat(l.credit_amount || "0"),
      0
    )

    return NextResponse.json({
      voucher: {
        voucherNo: batch.voucher_id,
        batchId: batch.batch_id,
        voucherType: batch.voucher_type,
        businessDate: batch.business_date,
        status: batch.status,
        createdAt: batch.created_at,
        approvedAt: batch.approved_at,
        makerName: batch.maker_name || "N/A",
        makerEmpCode: batch.maker_emp_code || "",
        checkerName: batch.checker_name || "N/A",
        checkerEmpCode: batch.checker_emp_code || "",
      },
      lines: lineRows.map((l: any) => ({
        id: l.id,
        accountCode: l.accountcode,
        accountName: l.accountname || "Unknown Account",
        refAccountId: l.ref_account_id,
        debitAmount: parseFloat(l.debit_amount || "0"),
        creditAmount: parseFloat(l.credit_amount || "0"),
        narration: l.narration,
      })),
      totals: {
        totalDebit,
        totalCredit,
      },
      branch: {
        branchName: branch.branch_name || "Branch",
        bankName: branch.bank_name || "Bank",
        address: branch.address || "",
        city: branch.city || "",
        state: branch.state || "",
        postalCode: branch.postal_code || "",
        phone: branch.phone_number || "",
        email: branch.email || "",
      },
    })
  } catch (error: any) {
    console.error("Failed to fetch voucher:", error)
    return NextResponse.json(
      { error: "Failed to fetch voucher details" },
      { status: 500 }
    )
  }
}
