import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const u = JSON.parse(c.value)
  const { customer_code, member_type } = await req.json()

  /* -------------------- PERMISSION CHECK -------------------- */
  const { rowCount: perm } = await pool.query(
    `
    SELECT 1
    FROM users usr
    JOIN role_permissions rp ON rp.role = usr.role
    JOIN permissions p ON p.permission_code = rp.permission_code
    WHERE usr.id = $1
      AND p.permission_code = 'MEMBER_CREATE'
    `,
    [u.userId]
  )

  if (!perm) {
    return NextResponse.json({ error: "No permission" }, { status: 403 })
  }

  /* -------------------- CUSTOMER CHECK -------------------- */
  const { rows: [cust] } = await pool.query(
    `SELECT customer_code FROM customers WHERE customer_code = $1`,
    [customer_code]
  )

  if (!cust) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  /* -------------------- ACTIVE MEMBERSHIP CHECK -------------------- */
  const { rowCount: dup } = await pool.query(
    `
    SELECT 1
    FROM memberships
    WHERE customer_code = $1
      AND branch_id = $2
      AND status = 'ACTIVE'
    `,
    [customer_code, u.branch]
  )

  if (dup) {
    return NextResponse.json(
      { error: "Active membership already exists in this branch" },
      { status: 409 }
    )
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    /* -------------------- MEMBERSHIP TYPE LOGIC -------------------- */
    let membershipClass: "A" | "B"
    let prefix: string
    let seqColumn: string

    if (member_type === "member") {
      membershipClass = "A"
      prefix = "01"
      seqColumn = "a_last_number"
    } else {
      membershipClass = "B"
      prefix = "02"
      seqColumn = "b_last_number"
    }

    /* -------------------- SEQUENCE INCREMENT -------------------- */
    const { rows: [seq] } = await client.query(
      `
      UPDATE membership_sequences
      SET ${seqColumn} = ${seqColumn} + 1
      WHERE branch_id = $1
      RETURNING ${seqColumn}
      `,
      [u.branch]
    )

    if (!seq) {
      throw new Error("Membership sequence not initialized for branch")
    }

    const runningNo = String(seq[seqColumn]).padStart(5, "0")
    const membershipNo = `${u.branch}${prefix}${runningNo}`

    /* -------------------- INSERT MEMBERSHIP -------------------- */
    const { rows: [membership] } = await client.query(
      `
      INSERT INTO memberships (
        customer_code,
        branch_id,
        membership_class,
        member_type,
        membership_no,
        join_date,
        status
      )
      VALUES ($1,$2,$3,'INDIVIDUAL',$4,now(),'ACTIVE')
      RETURNING id
      `,
      [
        customer_code,
        u.branch,
        membershipClass,
        membershipNo
      ]
    )

    const membershipId = membership.id

    /* -------------------- CREATE SHARE MASTER (NO MONEY) -------------------- */
    await client.query(
      `
      INSERT INTO member_shares (
        branch_id,
        membership_id,
        membership_no,
        share_balance,
        status,
        share_opened_date
      )
      VALUES ($1,$2,$3,0,'ACTIVE',now())
      `,
      [
        u.branch,
        membershipId,
        membershipNo
      ]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      membership_no: membershipNo,
      membership_id: membershipId,
      share_account_created: true
    })

  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Membership create error:", error)

    return NextResponse.json(
      { error: "Failed to create membership" },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
