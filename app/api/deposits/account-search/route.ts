import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const branchId = session.branch
    const body = await req.json()
    const { accountNumber, memberNumber, memberName, fatherName, spouseName, ledgerFolioNumber, aadhaarNumber, contactNo } = body

    // Build dynamic query conditions
    const conditions: string[] = ["da.branch_id = $1"]
    const values: (string | number)[] = [branchId]
    let paramIndex = 2

    if (accountNumber?.trim()) {
      conditions.push(`CAST(da.accountnumber AS TEXT) ILIKE $${paramIndex}`)
      values.push(`%${accountNumber.trim()}%`)
      paramIndex++
    }

    if (memberNumber?.trim()) {
      conditions.push(`CAST(m.membership_no AS TEXT) ILIKE $${paramIndex}`)
      values.push(`%${memberNumber.trim()}%`)
      paramIndex++
    }

    if (memberName?.trim()) {
      conditions.push(`c.full_name ILIKE $${paramIndex}`)
      values.push(`%${memberName.trim()}%`)
      paramIndex++
    }

    if (fatherName?.trim()) {
      conditions.push(`c.father_name ILIKE $${paramIndex}`)
      values.push(`%${fatherName.trim()}%`)
      paramIndex++
    }

    if (spouseName?.trim()) {
      conditions.push(`c.spouse_name ILIKE $${paramIndex}`)
      values.push(`%${spouseName.trim()}%`)
      paramIndex++
    }

    if (ledgerFolioNumber?.trim()) {
      conditions.push(`m.ledger_folio_number ILIKE $${paramIndex}`)
      values.push(`%${ledgerFolioNumber.trim()}%`)
      paramIndex++
    }

    if (aadhaarNumber?.trim()) {
      conditions.push(`ck.aadhaar_no ILIKE $${paramIndex}`)
      values.push(`%${aadhaarNumber.trim()}%`)
      paramIndex++
    }

    if (contactNo?.trim()) {
      conditions.push(`c.mobile_no ILIKE $${paramIndex}`)
      values.push(`%${contactNo.trim()}%`)
      paramIndex++
    }

    // At least one search criterion is needed
    if (paramIndex === 2) {
      return NextResponse.json({ success: true, results: [] })
    }

    const query = `
      SELECT
        da.accountnumber AS account_number,
        da.deposittype AS deposit_type,
        da.clearbalance AS balance,
        da.accountstatus AS account_status,
        da.accountopendate AS opening_date,
        ds.scheme_name,
        m.membership_no,
        c.full_name,
        c.father_name,
        c.spouse_name,
        c.mobile_no,
        ck.aadhaar_no
      FROM deposit_account da
      JOIN deposit_schemes ds ON da.schemeid = ds.scheme_id AND da.branch_id = ds.branch_id
      JOIN memberships m ON da.membership_no = m.membership_no AND da.branch_id = m.branch_id
      JOIN customers c ON m.customer_code = c.customer_code
      LEFT JOIN customer_kycdetails ck ON ck.customer_code = m.customer_code
      WHERE ${conditions.join(" AND ")}
      ORDER BY da.accountnumber ASC
      LIMIT 50
    `

    const { rows } = await pool.query(query, values)

    const typeLabel: Record<string, string> = { TERM: "Term Deposit", RECURRING: "Recurring Deposit", PIGMY: "Pigmy Deposit" }
    const statusLabel: Record<number, string> = { 1: "Active", 2: "Matured", 3: "Closed", 4: "Premature" }

    return NextResponse.json({
      success: true,
      results: rows.map((r) => ({
        account_number: String(r.account_number),
        deposit_type: r.deposit_type,
        deposit_type_label: typeLabel[r.deposit_type] || r.deposit_type,
        balance: Number(r.balance),
        account_status: statusLabel[r.account_status] || "Unknown",
        opening_date: r.opening_date,
        scheme_name: r.scheme_name,
        membership_no: r.membership_no,
        full_name: r.full_name,
        father_name: r.father_name,
        spouse_name: r.spouse_name,
        mobile_no: r.mobile_no,
        aadhaar_no: r.aadhaar_no,
      })),
    })
  } catch (error: any) {
    console.error("Error searching deposit accounts:", error)
    return NextResponse.json({ error: "Failed to search deposit accounts" }, { status: 500 })
  }
}
