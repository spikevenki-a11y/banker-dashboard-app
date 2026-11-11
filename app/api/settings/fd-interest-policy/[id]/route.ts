import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import {
  findOverlappingPolicy,
  getPolicyHistory,
  insertVersion,
  overlapMessage,
  parsePolicyInput,
  type PolicyTerms,
  type PolicyVersion,
} from "@/lib/fd-interest-policy"

// One interest policy.
// GET: every version (newest first). PUT: edit, saved as a new version.
// PATCH { action: "ACTIVATE" | "DEACTIVATE" }: status change, also saved as a version.
// Deposits already opened keep the version they were opened with.

const policyIdOf = async (params: Promise<{ id: string }>) => {
  const id = Number((await params).id)
  return Number.isInteger(id) && id > 0 ? id : null
}

const termsOf = (v: PolicyVersion & { scheme_id: number }): PolicyTerms => ({
  policy_name: v.policy_name,
  scheme_id: Number(v.scheme_id),
  calculation_method: v.calculation_method,
  senior_citizen_age: v.senior_citizen_age,
  rate_slabs: v.rate_slabs,
  compounding_frequency: v.compounding_frequency,
  effective_from: v.effective_from,
  effective_to: v.effective_to,
  premature_closure_allowed: v.premature_closure_allowed,
  premature_lock_in_days: v.premature_lock_in_days,
  premature_penal_rate: Number(v.premature_penal_rate),
  maturity_rounding: v.maturity_rounding,
  senior_benefit_enabled: !!v.senior_benefit_enabled,
  senior_min_age: v.senior_min_age,
  senior_additional_rate: v.senior_additional_rate != null ? Number(v.senior_additional_rate) : null,
  senior_effective_from: v.senior_effective_from,
  senior_effective_to: v.senior_effective_to,
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const policyId = await policyIdOf(params)
  if (!policyId) return NextResponse.json({ error: "Invalid policy" }, { status: 400 })
  try {
    const history = await getPolicyHistory(pool, session.branch, policyId)
    if (history.length === 0) return NextResponse.json({ error: "Interest policy not found" }, { status: 404 })
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM deposit_account da
         JOIN fd_interest_policy_versions v ON v.version_id = da.interest_policy_version_id
        WHERE v.policy_id = $1 AND da.branch_id = $2`,
      [policyId, session.branch]
    )
    return NextResponse.json({ success: true, current: history[0], history, accounts_opened: rows[0]?.n ?? 0 })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load interest policy: " + error.message }, { status: 500 })
  }
}

async function loadForUpdate(client: any, branchId: string, policyId: number) {
  // Lock the branch's policies so overlap checks and version numbers stay consistent
  await client.query(`SELECT policy_id FROM fd_interest_policies WHERE branch_id = $1 FOR UPDATE`, [branchId])
  const history = await getPolicyHistory(client, branchId, policyId)
  return (history[0] as (PolicyVersion & { scheme_id: number }) | undefined) ?? null
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const policyId = await policyIdOf(params)
  if (!policyId) return NextResponse.json({ error: "Invalid policy" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = parsePolicyInput(body)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const remarks = typeof body?.remarks === "string" ? body.remarks.trim().slice(0, 255) || null : null

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const current = await loadForUpdate(client, session.branch, policyId)
    if (!current) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Interest policy not found" }, { status: 404 })
    }
    // The scheme a policy belongs to does not change; add a new policy for another scheme
    const terms = { ...parsed.terms, scheme_id: Number(current.scheme_id) }

    if (current.status === "ACTIVE") {
      const overlap = await findOverlappingPolicy(client, session.branch, terms, policyId)
      if (overlap) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: overlapMessage(overlap) }, { status: 400 })
      }
    }

    await insertVersion(client, policyId, current.version_no + 1, terms, current.status, "EDITED", remarks, session.userId)
    await client.query("COMMIT")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {})
    return NextResponse.json({ error: "Failed to update interest policy: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const policyId = await policyIdOf(params)
  if (!policyId) return NextResponse.json({ error: "Invalid policy" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const action = body?.action
  if (action !== "ACTIVATE" && action !== "DEACTIVATE") {
    return NextResponse.json({ error: "Action must be ACTIVATE or DEACTIVATE" }, { status: 400 })
  }
  const remarks = typeof body?.remarks === "string" ? body.remarks.trim().slice(0, 255) || null : null
  const nextStatus = action === "ACTIVATE" ? "ACTIVE" : "INACTIVE"

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const current = await loadForUpdate(client, session.branch, policyId)
    if (!current) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Interest policy not found" }, { status: 404 })
    }
    if (current.status === nextStatus) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: `Policy is already ${nextStatus === "ACTIVE" ? "active" : "inactive"}.` }, { status: 400 })
    }
    const terms = termsOf(current)
    if (nextStatus === "ACTIVE") {
      const overlap = await findOverlappingPolicy(client, session.branch, terms, policyId)
      if (overlap) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: overlapMessage(overlap) }, { status: 400 })
      }
    }
    await insertVersion(
      client, policyId, current.version_no + 1, terms, nextStatus,
      action === "ACTIVATE" ? "ACTIVATED" : "DEACTIVATED", remarks, session.userId
    )
    await client.query("COMMIT")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {})
    return NextResponse.json({ error: "Failed to change policy status: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
