import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cleanNominees, saveSavingsNominees } from "@/lib/savings-nominees"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const { searchParams } = new URL(req.url)
    const accountNumber = searchParams.get("account_number")

    if (!accountNumber) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }

    const { rows } = await pool.query(
      `SELECT nd.nominee_name,
              nd.nominee_relation AS relation,
              nd.is_member,
              nd.member_id AS membership_id,
              TO_CHAR(nd.nominee_dob, 'YYYY-MM-DD') AS nominee_dob,
              nd.nominee_gender,
              nd.nominee_age,
              nd.nominee_address,
              nd.nominee_phone,
              nd.nominee_percentage::float AS nominee_percentage,
              ROW_NUMBER() OVER (ORDER BY nd.created_at ASC, nd.id ASC)::int AS nominee_order
       FROM nominee_details nd
       JOIN savings_accounts sa ON sa.account_number = nd.account_number
                               AND CAST(sa.branch_id AS VARCHAR) = nd.branch_id
       WHERE nd.account_number = $1 AND sa.branch_id = $2
       ORDER BY nominee_order ASC`,
      [accountNumber, branchId]
    )

    return NextResponse.json({ success: true, nominees: rows })
  } catch (error: any) {
    console.error("Error fetching nominees:", error)
    return NextResponse.json({ error: "Failed to fetch nominees" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const body = await req.json()
    const { account_number, nominees } = body

    if (!account_number) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }

    const nomineeList = cleanNominees(nominees)

    await client.query("BEGIN")

    const accountResult = await client.query(
      `SELECT account_number, membership_no FROM savings_accounts WHERE account_number = $1 AND branch_id = $2 FOR UPDATE`,
      [account_number, branchId]
    )

    if (accountResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const nomineeErr = await saveSavingsNominees(client, {
      branchId,
      accountNumber: String(account_number),
      holderMembershipNo: accountResult.rows[0].membership_no,
      businessDate: session.businessDate,
      nominees: nomineeList,
    })
    if (nomineeErr) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: nomineeErr }, { status: 400 })
    }

    await client.query("COMMIT")

    return NextResponse.json({ success: true, message: "Nominee details updated successfully" })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error updating nominees:", error)
    return NextResponse.json({ error: "Failed to update nominees" }, { status: 500 })
  } finally {
    client.release()
  }
}
