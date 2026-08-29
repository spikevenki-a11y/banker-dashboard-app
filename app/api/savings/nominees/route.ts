import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"

const MAX_NOMINEES = 4

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
      `SELECT san.nominee_name, san.relation, san.nominee_order
       FROM savings_account_nominees san
       JOIN savings_accounts sa ON sa.account_number = san.account_number
       WHERE san.account_number = $1 AND sa.branch_id = $2
       ORDER BY san.nominee_order ASC`,
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

    const nomineeList: { name: string; relation: string }[] = Array.isArray(nominees)
      ? nominees
          .filter((n: any) => n?.name?.trim())
          .slice(0, MAX_NOMINEES)
      : []

    await client.query("BEGIN")

    const accountResult = await client.query(
      `SELECT account_number FROM savings_accounts WHERE account_number = $1 AND branch_id = $2`,
      [account_number, branchId]
    )

    if (accountResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    await client.query(`DELETE FROM savings_account_nominees WHERE account_number = $1`, [account_number])

    for (let i = 0; i < nomineeList.length; i++) {
      const { name, relation } = nomineeList[i]
      await client.query(
        `INSERT INTO savings_account_nominees (account_number, nominee_name, relation, nominee_order)
         VALUES ($1, $2, $3, $4)`,
        [account_number, name.trim(), relation, i + 1]
      )
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
