import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const session = JSON.parse(c.value)
    const userId = session.userId 
    const branchid = session.branch 

    const { locker_id, membership_no, period_years = 1, deposit_amount = 0, assigned_date } = await req.json()

    if (!locker_id || !membership_no) {
      return NextResponse.json({ error: "locker_id and membership_no are required" }, { status: 400 })
    }

    await client.query("BEGIN")

    // Lock the row to prevent concurrent duplicate assignments
    const { rows: lockerRows } = await client.query(
      `SELECT l.id, l.locker_no, l.status, lt.annual_rent
       FROM lockers l
       JOIN locker_types lt ON lt.locker_type_id = l.locker_type_id
       WHERE l.id = $1
       FOR UPDATE`,
      [locker_id]
    )

    if (lockerRows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Locker not found" }, { status: 404 })
    }

    const locker = lockerRows[0]

    if (locker.status !== "AVAILABLE") {
      await client.query("ROLLBACK")
      return NextResponse.json({
        error: "Locker already allocated by another user",
        currentStatus: locker.status,
      }, { status: 409 })
    }

    // Verify membership exists in the branch
    const { rows: memberRows } = await client.query(
      `SELECT membership_no FROM memberships
       WHERE membership_no = $1 AND status = 'ACTIVE'
       LIMIT 1`,
      [membership_no]
    )
    if (memberRows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Member not found or not active" }, { status: 404 })
    }

    const startDate = assigned_date ? new Date(assigned_date) : new Date()
    const expiryDate = new Date(startDate)
    expiryDate.setFullYear(expiryDate.getFullYear() + Number(period_years))

    // Create the assignment record
    const { rows: assignRows } = await client.query(
      `INSERT INTO locker_assignments
         (locker_id, membership_no, assigned_date, expiry_date, annual_rent, deposit_amount, created_by,branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        locker_id,
        membership_no,
        startDate.toISOString().split("T")[0],
        expiryDate.toISOString().split("T")[0],
        locker.annual_rent,
        Number(deposit_amount),
        userId,
        branchid,
      ]
    )

    console.log(`Assignment created with ID ${assignRows[0].id}`)

    // Mark locker as allocated
    await client.query(
      `UPDATE lockers SET status = 'ALLOCATED' WHERE id = $1`,
      [locker_id]
    )

    // Write audit history
    await client.query(
      `INSERT INTO locker_assignment_history
         (locker_id, membership_no, assigned_date, annual_rent, deposit_amount, action, performed_by,branch_id)
       VALUES ($1, $2, $3, $4, $5, 'ASSIGNED', $6, $7)`,
      [
        locker_id,
        membership_no,
        startDate.toISOString().split("T")[0],
        locker.annual_rent,
        Number(deposit_amount),
        userId,
        branchid,
      ]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      assignment_id: assignRows[0].id,
      locker_no: locker.locker_no,
      expiry_date: expiryDate.toISOString().split("T")[0],
      annual_rent: locker.annual_rent,
    })
  } catch (error: any) {
    console.error("Error during locker allocation:", error)
    await client.query("ROLLBACK")
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
