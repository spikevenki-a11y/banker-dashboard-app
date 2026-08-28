import { getSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { checkDayEndRestriction } from "@/lib/dayend-check"

const OPERATION_TYPES = ["SINGLE", "EITHER_SURVIVOR", "JOINT_MINOR", "FORMER_SURVIVOR", "LATTER_SURVIVOR"]

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const businessDate: string = session.businessDate
    const { membership_no, scheme_id, opening_date, initial_deposit, nominees, ledger_folio_no, is_cheque_required, operation_type } = await req.json()
    const nomineeList: { name: string; relation: string }[] = Array.isArray(nominees)
      ? nominees.slice(0, 4)
      : []

    if (!membership_no || !scheme_id || !opening_date) {
      return NextResponse.json({ error: "Membership number, scheme, and opening date are required" }, { status: 400 })
    }

    if (operation_type && !OPERATION_TYPES.includes(operation_type)) {
      return NextResponse.json({ error: "Invalid operation type" }, { status: 400 })
    }

    const dayendErr = await checkDayEndRestriction(branchId, businessDate)
    if (dayendErr) return dayendErr

    await client.query("BEGIN")

    // Get scheme details
    const schemeResult = await client.query(
      `SELECT scheme_id, interest_rate, savings_gl_account, min_balance, minimum_deposit
       FROM savings_schemes WHERE scheme_id = $1 AND branch_id = $2 AND scheme_status = 'ACTIVE'`,
      [scheme_id, branchId]
    )

    if (schemeResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Invalid scheme" }, { status: 400 })
    }

    const scheme = schemeResult.rows[0]

    // Generate account number (branch_id + scheme_id + sequence)
    const seqResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(account_number FROM 11) AS INTEGER)), 0) + 1 as next_seq
       FROM savings_accounts WHERE branch_id = $1`,
      [branchId]
    )
    const nextSeq = seqResult.rows[0].next_seq
    console.log(nextSeq)
    const accountNumber = `${String(branchId).padStart(3, '0')}${String(1).padStart(2, '0')}${String(nextSeq).padStart(6, '0')}`
    console.log(accountNumber)
    // Insert savings account
    const insertResult = await client.query(
      `INSERT INTO savings_accounts (
        account_number, branch_id, membership_no, scheme_id,
        opening_date, interest_rate, available_balance, clear_balance, unclear_balance,
        account_status, ref_no, is_cheque_required, operation_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 0, 'ACTIVE', $8, $9, $10, NOW(), NOW())
      RETURNING id, account_number`,
      [accountNumber, branchId, membership_no, scheme_id, opening_date, scheme.interest_rate, initial_deposit || 0, ledger_folio_no?.trim() || null, !!is_cheque_required, operation_type || "SINGLE"]
    )

    // Insert nominees
    for (let i = 0; i < nomineeList.length; i++) {
      const { name, relation } = nomineeList[i]
      if (name?.trim()) {
        await client.query(
          `INSERT INTO savings_account_nominees
             (account_number, nominee_name, relation, nominee_order)
           VALUES ($1, $2, $3, $4)`,
          [accountNumber, name.trim(), relation, i + 1]
        )
      }
    }

    await client.query("COMMIT")
    console.log(insertResult.rows[0].account_number)

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
