// Teach screen API (admin only)
//   GET    /api/report-chat/teach        → { phrases, needsAttention, catalog }
//   POST   /api/report-chat/teach        → add a phrase  { phrase, kind, rewrite_to?, dataset?, field?, op?, value?, allBranches? }
//   DELETE /api/report-chat/teach?id=12  → deactivate a phrase
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { catalogOutline, clearTeachCache, validatePhrase, type PhraseRow } from "@/lib/report-bot/teach"

async function admin() {
  const s = await getSession()
  return s && s.role === "admin" ? s : null
}

export async function GET() {
  const s = await admin()
  if (!s) return NextResponse.json({ error: "Admin only" }, { status: 403 })
  const phrases = (await pool.query(
    `SELECT id, branch_id, phrase, kind, rewrite_to, dataset, field, op, value, created_at
       FROM report_bot_phrases WHERE is_active AND (branch_id IS NULL OR branch_id = $1) ORDER BY created_at DESC`, [s.branch])).rows
  // questions from the last 30 days that failed, or ran with words the bot did not use — the teach to-do list
  const needsAttention = (await pool.query(
    `SELECT question, status, ignored_words, COUNT(*) AS times, MAX(created_at) AS last_asked
       FROM report_bot_log
      WHERE branch_id = $1 AND created_at > now() - interval '30 days'
        AND (status <> 'OK' OR cardinality(ignored_words) > 0) AND question IS NOT NULL
      GROUP BY question, status, ignored_words ORDER BY times DESC, last_asked DESC LIMIT 100`, [s.branch])).rows
  return NextResponse.json({ phrases, needsAttention, catalog: catalogOutline() })
}

export async function POST(req: NextRequest) {
  const s = await admin()
  if (!s) return NextResponse.json({ error: "Admin only" }, { status: 403 })
  const b = (await req.json().catch(() => ({}))) as PhraseRow & { allBranches?: boolean }
  const err = validatePhrase(b)
  if (err) return NextResponse.json({ error: err }, { status: 400 })
  const { rows } = await pool.query(
    `INSERT INTO report_bot_phrases (branch_id, phrase, kind, rewrite_to, dataset, field, op, value, created_by)
     VALUES ($1, lower(trim($2)), $3, lower(trim($4)), $5, $6, $7, $8, $9) RETURNING id`,
    [b.allBranches ? null : s.branch, b.phrase, b.kind, b.rewrite_to ?? null, b.dataset ?? null, b.field ?? null, b.op ?? null, b.value ?? null, s.userId])
  clearTeachCache()
  return NextResponse.json({ id: rows[0].id })
}

export async function DELETE(req: NextRequest) {
  const s = await admin()
  if (!s) return NextResponse.json({ error: "Admin only" }, { status: 403 })
  const id = Number(new URL(req.url).searchParams.get("id"))
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await pool.query(`UPDATE report_bot_phrases SET is_active = false WHERE id = $1 AND (branch_id IS NULL OR branch_id = $2)`, [id, s.branch])
  clearTeachCache()
  return NextResponse.json({ ok: true })
}
