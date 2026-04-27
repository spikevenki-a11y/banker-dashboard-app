import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const {
      membership_no,
      deposit_amount,
      interest_rate,
      opening_date,
      period_years,
      nominee_name,
      nominee_relation,
      locker_id,
    } = await req.json()

    if (!membership_no || !deposit_amount || !opening_date) {
      return NextResponse.json(
        { error: "membership_no, deposit_amount, and opening_date are required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Generate account number: branch(3) + "06" + seq(6) = 11 chars
    const seqResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(account_number FROM 6) AS INTEGER)), 0) + 1 AS next_seq
       FROM locker_deposits WHERE branch_id = $1`,
      [branchId]
    )
    const nextSeq = seqResult.rows[0].next_seq
    const accountNumber = `${String(branchId).padStart(3, "0")}06${String(nextSeq).padStart(6, "0")}`

    // Calculate expiry date
    const years = Number(period_years) || 1
    const openDate = new Date(opening_date)
    openDate.setFullYear(openDate.getFullYear() + years)
    const expiryDate = openDate.toISOString().split("T")[0]

    // If a locker was selected, verify it is available
    if (locker_id) {
      const lockerCheck = await client.query(
        `SELECT id, status FROM lockers WHERE id = $1 AND branch_id = $2`,
        [locker_id, branchId]
      )
      if (lockerCheck.rows.length === 0 || lockerCheck.rows[0].status !== "AVAILABLE") {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Selected locker is not available" }, { status: 400 })
      }
    }

    // Insert locker deposit
    const depositResult = await client.query(
      `INSERT INTO locker_deposits (
         account_number, branch_id, membership_no, locker_id,
         deposit_amount, interest_rate, opening_date, period_years, expiry_date,
         nominee_name, nominee_relation, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ACTIVE')
       RETURNING id, account_number`,
      [
        accountNumber,
        branchId,
        membership_no,
        locker_id || null,
        Number(deposit_amount),
        Number(interest_rate) || 0,
        opening_date,
        years,
        expiryDate,
        nominee_name?.trim() || null,
        nominee_relation || null,
      ]
    )

    // Mark locker as ALLOCATED
    if (locker_id) {
      await client.query(`UPDATE lockers SET status = 'ALLOCATED' WHERE id = $1`, [locker_id])
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      account_number: depositResult.rows[0].account_number,
      deposit_id: depositResult.rows[0].id,
      expiry_date: expiryDate,
      locker_assigned: !!locker_id,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error creating locker deposit:", error)
    return NextResponse.json({ error: "Failed to create locker deposit: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
