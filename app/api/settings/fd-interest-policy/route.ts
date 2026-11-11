import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import {
  findOverlappingPolicy,
  insertVersion,
  listPolicies,
  overlapMessage,
  parsePolicyInput,
} from "@/lib/fd-interest-policy"

// Fixed Deposit interest policies for the user's branch.
// GET: current version of every policy. POST: add a policy (version 1, active).

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const policies = await listPolicies(pool, session.branch)
    return NextResponse.json({ success: true, policies })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load interest policies: " + error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = parsePolicyInput(body)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { terms } = parsed
  const remarks = typeof body?.remarks === "string" ? body.remarks.trim().slice(0, 255) || null : null

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Scheme must be an active term deposit scheme of this branch
    const { rows: schemes } = await client.query(
      `SELECT scheme_id FROM deposit_schemes
        WHERE scheme_id = $1 AND branch_id = $2 AND scheme_status = 'ACTIVE' AND deposit_type IN ('TERM', 'T')`,
      [terms.scheme_id, session.branch]
    )
    if (schemes.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Please select an active fixed deposit scheme." }, { status: 400 })
    }

    // One policy at a time per scheme, period and tenure (lock the branch's policies while checking)
    await client.query(`SELECT policy_id FROM fd_interest_policies WHERE branch_id = $1 FOR UPDATE`, [session.branch])
    const overlap = await findOverlappingPolicy(client, session.branch, terms)
    if (overlap) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: overlapMessage(overlap) }, { status: 400 })
    }

    const { rows } = await client.query(
      `INSERT INTO fd_interest_policies (branch_id, scheme_id, policy_name, status, current_version, created_by, updated_by)
       VALUES ($1, $2, $3, 'ACTIVE', 1, $4, $4) RETURNING policy_id`,
      [session.branch, terms.scheme_id, terms.policy_name, session.userId]
    )
    const policyId = rows[0].policy_id
    await insertVersion(client, policyId, 1, terms, "ACTIVE", "CREATED", remarks, session.userId)

    await client.query("COMMIT")
    return NextResponse.json({ success: true, policy_id: policyId })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {})
    return NextResponse.json({ error: "Failed to save interest policy: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
