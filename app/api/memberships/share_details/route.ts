import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"

export async function GET(req: Request) {
  try {
    /* -------------------- AUTH -------------------- */
    const c = (await cookies()).get("banker_session")
    if (!c) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const u = JSON.parse(c.value)
    const { searchParams } = new URL(req.url)
    const membershipNo = searchParams.get("membership_no")
    if (!membershipNo) {
      return NextResponse.json(
        { error: "membership_no is required" },
        { status: 400 }
      )
    }

    console.log("----------------------------" + process.env.POSTGRES_HOST)
    /* -------------------- FETCH MEMBERSHIP + SHARE -------------------- */
    const { rows } = await pool.query(
      `
      SELECT
        m.id               AS membership_id,
        m.membership_no,
        m.membership_class,
        m.status           AS membership_status,

        c.full_name,

        s.id               AS share_id,
        s.share_balance,
        s.status           AS share_status

      FROM memberships m
      JOIN customers c
        ON c.customer_code = m.customer_code
      JOIN member_shares s
        ON s.membership_id = m.id

      WHERE m.membership_no = $1
        AND m.branch_id = $2
      `,
      [membershipNo, u.branch]
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Membership not found in this branch" },
        { status: 404 }
      )
    }

    const row = rows[0]

    /* -------------------- VALIDATIONS -------------------- */
    if (row.membership_status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Membership is not active" },
        { status: 400 }
      )
    }

    if (row.share_status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Share account is not active" },
        { status: 400 }
      )
    }

    /* -------------------- RESPONSE -------------------- */
    return NextResponse.json({
      membership_id: row.membership_id,
      membership_no: row.membership_no,
      full_name: row.full_name,
      membership_class: row.membership_class,
      share_balance: Number(row.share_balance),
    })

  } catch (error) {
    console.error("share-details error:", error)
    return NextResponse.json(
      { error: "Failed to fetch share details" },
      { status: 500 }
    )
  }
}
