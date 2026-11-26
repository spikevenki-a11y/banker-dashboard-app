// POST /api/report-chat
//   { message: "branch wise jewel loan outstanding" }        → parse + run
//   { spec: ReportSpec }                                       → run an edited / saved spec as-is
// Response: { reply, understood, chips, ignored, corrections, alternatives, spec, headers, rows, totals, rowCount } or { ask }
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { parseQuestion, type KnownValues } from "@/lib/report-bot/parser"
import { loadTeach } from "@/lib/report-bot/teach"
import { describe } from "@/lib/report-bot/describe"
import { buildSQL } from "@/lib/report-bot/builder"
import { getDataset } from "@/lib/report-bot/catalog"
import type { ReportSpec } from "@/lib/report-bot/spec"

// ---- distinct values per branch (scheme names, villages…) so "Bhavani" or "Crop Loan" become filters
const knownCache = new Map<string, { at: number; values: KnownValues }>()
async function knownValues(branchId: string): Promise<KnownValues> {
  const hit = knownCache.get(branchId)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.values
  const q = async (sql: string) => (await pool.query(sql, [branchId])).rows.map(r => String(r.v)).filter(Boolean)
  const values: KnownValues = {
    scheme: [
      ...(await q(`SELECT DISTINCT scheme_name AS v FROM loan_schemes WHERE branch_id = $1`)),
      ...(await q(`SELECT DISTINCT scheme_name AS v FROM savings_schemes WHERE branch_id = $1`)),
      ...(await q(`SELECT DISTINCT scheme_name AS v FROM deposit_schemes WHERE branch_id = $1`)),
    ],
    village: await q(`SELECT DISTINCT ca.village AS v FROM memberships m JOIN customer_address ca ON ca.customer_code = m.customer_code WHERE m.branch_id = $1 AND ca.village IS NOT NULL`),
    taluk: await q(`SELECT DISTINCT ca.thaluk AS v FROM memberships m JOIN customer_address ca ON ca.customer_code = m.customer_code WHERE m.branch_id = $1 AND ca.thaluk IS NOT NULL`),
  }
  knownCache.set(branchId, { at: Date.now(), values })
  return values
}

const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 })

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const branchIds = [session.branch] // head-office consolidation: pass child branch ids here

  let spec: ReportSpec
  let ignored: string[] = [], corrections: { from: string; to: string }[] = [], alternatives: string[] = []
  if (body.spec) {
    spec = body.spec as ReportSpec // edited chips / saved report — validated field-by-field inside buildSQL
  } else {
    const message = String(body.message ?? "").slice(0, 500)
    if (!message.trim()) return NextResponse.json({ ask: "Type the report you need, e.g. \"scheme wise loan outstanding\"" })
    const today = session.businessDate ? new Date(session.businessDate) : new Date()
    const parsed = parseQuestion(message, await knownValues(session.branch), today, await loadTeach(pool, session.branch))
    if ("ask" in parsed) {
      await logRun(session, message, null, "UNMATCHED", 0, message.toLowerCase().split(/\s+/))
      return NextResponse.json({ ask: parsed.ask, corrections: parsed.corrections ?? [] })
    }
    spec = parsed.spec; ignored = parsed.ignored; corrections = parsed.corrections; alternatives = parsed.alternatives
  }

  let built
  try {
    built = buildSQL(spec, branchIds)
  } catch (e: any) {
    return NextResponse.json({ ask: e.message, spec, understood: describe(spec).text }, { status: 200 })
  }

  const client = await pool.connect()
  try {
    // read-only, time-boxed: a report can never change data or hang the DB
    await client.query("BEGIN READ ONLY")
    await client.query("SET LOCAL statement_timeout = '15s'")
    const { rows } = await client.query(built.sql, built.params)
    await client.query("COMMIT")

    const totals: Record<string, number> = {}
    for (const h of built.headers) {
      const f = getDataset(spec.dataset).fields.find(x => x.key === h.key)
      if (f?.aggregate === "SUM" || f?.aggregate === "COUNT") totals[h.key] = rows.reduce((s, r) => s + Number(r[h.key] ?? 0), 0)
    }

    const ds = getDataset(spec.dataset)
    const main = built.headers.find(h => h.key === (spec.columns[0] ?? ds.defaultMeasure))
    const { text: understood, chips } = describe(spec)
    const lines = [
      rows.length === 0 ? "No records found for this report."
        : `${rows.length} row${rows.length > 1 ? "s" : ""}` +
          (main && totals[main.key] !== undefined ? `, total ${main.label} ${/count|weight|items/.test(main.key) ? totals[main.key] : inr(totals[main.key])}` : "") + ".",
    ]
    if (corrections.length) lines.push(`Read "${corrections.map(c => c.from).join('", "')}" as "${corrections.map(c => c.to).join('", "')}".`)
    if (ignored.length) lines.push(`Not used: "${ignored.join('", "')}". If these matter, rephrase or teach them in Report Bot → Teach.`)
    if (alternatives.length) lines.push(`Did you mean ${alternatives.join(" or ")}? Change the report chip to switch.`)
    if (rows.length === 5000) lines.push("Showing the first 5,000 rows — add a filter or group it.")

    await logRun(session, body.message ?? null, spec, "OK", rows.length, ignored)
    return NextResponse.json({
      reply: lines.join(" "), understood, chips, ignored, corrections, alternatives,
      spec, headers: built.headers, rows, totals, rowCount: rows.length,
    })
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => {})
    await logRun(session, body.message ?? null, spec, "ERROR: " + e.message)
    return NextResponse.json({ error: "Report failed: " + e.message }, { status: 500 })
  } finally {
    client.release()
  }
}

async function logRun(session: { userId: string; branch: string }, message: string | null, spec: ReportSpec | null, status: string, rowCount = 0, ignored: string[] = []) {
  try {
    await pool.query(
      `INSERT INTO report_bot_log (branch_id, user_id, question, spec, status, row_count, ignored_words) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [session.branch, session.userId, message, spec ? JSON.stringify(spec) : null, status.slice(0, 500), rowCount, ignored]
    )
  } catch { /* logging must never break a report */ }
}
