import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { checkDayEndRestriction } from "@/lib/dayend-check"
import { findMemberClosureBlockers } from "@/lib/member-closure"
import { isMemberClosureReason, MEMBER_CLOSURE_BLOCKED_MSG } from "@/lib/member-closure-shared"

// Member Management → Member Closure
//   GET  ?membership_no=…  member details + the accounts that prevent closure
//   POST { membership_no, closure_reason, closure_remarks }  closes the member
// The POST re-runs every check inside the transaction (never trusts the screen), so a
// member with any open / active / pending account in any module is never closed.
// Linked accounts and transaction history are not modified.

const MEMBER_SQL = `
  SELECT m.membership_no, m.member_type, m.membership_class, m.status, m.branch_id,
         TO_CHAR(m.join_date, 'YYYY-MM-DD') AS join_date,
         TO_CHAR(m.close_date, 'YYYY-MM-DD') AS close_date,
         m.closure_reason, m.closure_remarks, m.closed_by_name, m.customer_code,
         c.full_name, c.father_name, c.mobile_no
  FROM memberships m
  LEFT JOIN customers c ON c.customer_code = m.customer_code
  WHERE CAST(m.membership_no AS TEXT) = $1 AND CAST(m.branch_id AS TEXT) = $2`

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const membershipNo = (new URL(req.url).searchParams.get("membership_no") || "").trim()
  if (!membershipNo) return NextResponse.json({ error: "Membership number is required" }, { status: 400 })

  try {
    const { rows } = await pool.query(MEMBER_SQL, [membershipNo, String(session.branch)])
    if (rows.length === 0) {
      return NextResponse.json({ error: `Member ${membershipNo} was not found in this branch` }, { status: 404 })
    }
    const member = rows[0]
    const isClosed = String(member.status || "").toUpperCase() === "CLOSED"
    const blockers = isClosed ? [] : await findMemberClosureBlockers(pool, membershipNo)
    return NextResponse.json({ success: true, member, blockers, can_close: !isClosed && blockers.length === 0 })
  } catch (error: any) {
    if (error?.code === "42703" && /closure_|closed_/.test(String(error?.message))) {
      return NextResponse.json(
        { error: "Member closure is not set up yet. Please run scripts/085_member_closure.sql." },
        { status: 503 }
      )
    }
    console.error("Member closure check failed:", error)
    return NextResponse.json({ error: "Failed to check the member's accounts" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const membershipNo = String(body?.membership_no ?? "").trim()
  const reason = String(body?.closure_reason ?? "").trim()
  const remarks = String(body?.closure_remarks ?? "").trim()

  if (!membershipNo) return NextResponse.json({ error: "Membership number is required" }, { status: 400 })
  if (!isMemberClosureReason(reason)) return NextResponse.json({ error: "Please select a closure reason" }, { status: 400 })
  if (reason === "OTHER" && !remarks) {
    return NextResponse.json({ error: "Please enter remarks for the closure reason 'Other'" }, { status: 400 })
  }
  if (remarks.length > 500) return NextResponse.json({ error: "Remarks cannot exceed 500 characters" }, { status: 400 })

  const branchId = String(session.branch)
  const businessDate = session.businessDate
  const dayendErr = await checkDayEndRestriction(session.branch, businessDate)
  if (dayendErr) return dayendErr

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Lock the member row: account opening takes a share lock on it, so nothing can be
    // opened for this member between the checks below and the status change
    const { rows } = await client.query(`${MEMBER_SQL} FOR UPDATE OF m`, [membershipNo, branchId])
    if (rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: `Member ${membershipNo} was not found in this branch` }, { status: 404 })
    }
    const member = rows[0]
    const status = String(member.status || "").toUpperCase()
    if (status === "CLOSED") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: `Member ${membershipNo} is already closed` }, { status: 409 })
    }
    if (status !== "ACTIVE") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: `Only an active member can be closed (current status: ${status || "unknown"})` }, { status: 400 })
    }

    const blockers = await findMemberClosureBlockers(client, membershipNo)
    if (blockers.length > 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: MEMBER_CLOSURE_BLOCKED_MSG, blockers }, { status: 409 })
    }

    await client.query(
      `UPDATE memberships
          SET status = 'CLOSED', close_date = $1, closure_reason = $2, closure_remarks = $3,
              closed_by = $4, closed_by_name = $5, closed_at = now()
        WHERE CAST(membership_no AS TEXT) = $6 AND CAST(branch_id AS TEXT) = $7`,
      [businessDate, reason, remarks || null, session.userId, session.fullName || null, membershipNo, branchId]
    )

    // Also record the change in the member's append-only edit history (View Member →
    // History). Optional: skipped if that table hasn't been set up.
    await client.query("SAVEPOINT closure_history")
    try {
      const { rows: [{ id: changeId }] } = await client.query(`SELECT gen_random_uuid() AS id`)
      const changes: [string, string | null, string | null][] = [
        ["status", member.status, "CLOSED"],
        ["close_date", member.close_date, businessDate],
        ["closure_reason", member.closure_reason, reason],
      ]
      for (const [field, oldValue, newValue] of changes) {
        await client.query(
          `INSERT INTO member_edit_history
             (change_id, branch_id, membership_no, customer_code, section, field_name,
              old_value, new_value, changed_by, changed_by_name)
           VALUES ($1, $2, $3, $4, 'membership', $5, $6, $7, $8, $9)`,
          [changeId, branchId, membershipNo, String(member.customer_code || "").trim(), field,
           oldValue || null, newValue, session.userId, session.fullName || null]
        )
      }
      await client.query("RELEASE SAVEPOINT closure_history")
    } catch (historyErr) {
      console.warn("Member closure: edit history not recorded:", (historyErr as Error)?.message)
      await client.query("ROLLBACK TO SAVEPOINT closure_history")
    }

    await client.query("COMMIT")
    return NextResponse.json({
      success: true,
      message: `Member ${membershipNo} has been closed`,
      membership_no: membershipNo,
      close_date: businessDate,
    })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {})
    if (error?.code === "42703" && /closure_|closed_/.test(String(error?.message))) {
      return NextResponse.json(
        { error: "Member closure is not set up yet. Please run scripts/085_member_closure.sql." },
        { status: 503 }
      )
    }
    console.error("Member closure failed:", error)
    return NextResponse.json({ error: "Failed to close the member" }, { status: 500 })
  } finally {
    client.release()
  }
}
