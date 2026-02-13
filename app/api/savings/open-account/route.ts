import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch_id
    const { membership_no, scheme_id, opening_date, initial_deposit, nominee_name, nominee_relation } = await req.json()

    if (!membership_no || !scheme_id || !opening_date) {
      return NextResponse.json({ error: "Membership number, scheme, and opening date are required" }, { status: 400 })
    }

    await client.query("BEGIN")

    // Get scheme details
    const schemeResult = await client.query(
      `SELECT scheme_id, interest_rate, savings_gl_account, min_balance, minimum_deposit
       FROM savings_schemes WHERE scheme_id = $1 AND branch_id = $2 AND scheme_status = 'Active'`,
      [scheme_id, branchId]
    )

    if (schemeResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Invalid scheme" }, { status: 400 })
    }

    const scheme = schemeResult.rows[0]

    // Generate account number (branch_id + scheme_id + sequence)
    const seqResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(account_number FROM 8) AS INTEGER)), 0) + 1 as next_seq
       FROM savings_accounts WHERE branch_id = $1`,
      [branchId]
    )
    const nextSeq = seqResult.rows[0].next_seq
    const accountNumber = `SB${String(branchId).padStart(3, '0')}${String(scheme_id).padStart(2, '0')}${String(nextSeq).padStart(5, '0')}`

    // Insert savings account
    const insertResult = await client.query(
      `INSERT INTO savings_accounts (
        account_number, branch_id, membership_no, scheme_id, 
        opening_date, interest_rate, available_balance, clear_balance, unclear_balance,
        account_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 0, 'Active', NOW(), NOW())
      RETURNING id, account_number`,
      [accountNumber, branchId, membership_no, scheme_id, opening_date, scheme.interest_rate, initial_deposit || 0]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      account_number: insertResult.rows[0].account_number,
      account_id: insertResult.rows[0].id,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error opening savings account:", error)
    return NextResponse.json({ error: "Failed to open account: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
