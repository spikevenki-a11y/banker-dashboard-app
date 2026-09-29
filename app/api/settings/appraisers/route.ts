import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { recordAppraiserHistory } from "@/lib/appraiser-history"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ?status=ACTIVE limits the list to active appraisers (used by loan application)
  const status = new URL(req.url).searchParams.get("status")

  try {
    const { rows } = await pool.query(
      `SELECT appraiser_id, appraiser_code, appraiser_name, license_no,
              TO_CHAR(license_valid_till, 'YYYY-MM-DD') AS license_valid_till,
              mobile_no, email, address, status
       FROM appraiser_master
       WHERE branch_id = $1
         AND ($2::text IS NULL OR status = $2)
       ORDER BY appraiser_code`,
      [session.branch, status === "ACTIVE" || status === "INACTIVE" ? status : null]
    )

    return NextResponse.json({ success: true, appraisers: rows })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch appraisers: " + error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const { appraiser_code, appraiser_name, license_no, license_valid_till, mobile_no, email, address, status } =
      await req.json()

    if (!appraiser_code?.trim() || !appraiser_name?.trim()) {
      return NextResponse.json({ error: "Appraiser code and name are required" }, { status: 400 })
    }

    await client.query("BEGIN")

    const { rows } = await client.query(
      `INSERT INTO appraiser_master
         (branch_id, appraiser_code, appraiser_name, license_no, license_valid_till,
          mobile_no, email, address, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING appraiser_id`,
      [
        session.branch,
        appraiser_code.trim().toUpperCase(),
        appraiser_name.trim(),
        license_no?.trim() || null,
        license_valid_till || null,
        mobile_no?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        session.userId,
      ]
    )

    await recordAppraiserHistory(client, rows[0].appraiser_id, "CREATED", null, session.userId)

    await client.query("COMMIT")
    return NextResponse.json({ success: true, appraiser_id: rows[0].appraiser_id })
  } catch (error: any) {
    await client.query("ROLLBACK")
    if (error.code === "23505") {
      return NextResponse.json({ error: "Appraiser code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create appraiser: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
