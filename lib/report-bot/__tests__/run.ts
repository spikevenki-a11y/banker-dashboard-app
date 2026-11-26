// Runs every question in questions.ts: parse → check expectations → build SQL → (optionally) execute.
//   npx tsx lib/report-bot/__tests__/run.ts                 (parse + build only)
//   DATABASE_URL=postgres://… npx tsx lib/report-bot/__tests__/run.ts   (also runs each query, READ ONLY)
import { CASES } from "./questions"
import { parseQuestion } from "../parser"
import { buildSQL } from "../builder"
import { describe } from "../describe"

const KNOWN = { scheme: ["JEWEL LOAN", "CROP LOAN", "SB GENERAL"], village: ["Bhavani", "Kodumudi"] }
const TODAY = new Date("2026-11-25")
const TEACH = {
  rewrites: [{ from: "நகை கடன்", to: "gold loan" }, { from: "நிலுவை", to: "outstanding" }],
}

function check(r: any, expect: string): string[] {
  const errs: string[] = []
  const s = r.spec
  for (const e of expect.split(" ").reduce<string[]>((a, t) => (/^(ds=|g:|c:|f:|from:|to:|df:|sum$|sort:|lim:|clean$|fix:)/.test(t) || !a.length ? [...a, t] : [...a.slice(0, -1), a[a.length - 1] + " " + t]), [])) {
    const [k, ...rest] = e.split(/[:=]/); const v = e.slice(k.length + 1)
    if (k === "ds" && s.dataset !== v) errs.push(`dataset ${s.dataset} ≠ ${v}`)
    if (k === "g" && !s.groupBy.includes(v)) errs.push(`no group ${v} (got ${s.groupBy})`)
    if (k === "c" && !s.columns.includes(v)) errs.push(`no column ${v} (got ${s.columns})`)
    if (k === "from" && s.from !== v) errs.push(`from ${s.from} ≠ ${v}`)
    if (k === "to" && s.to !== v) errs.push(`to ${s.to} ≠ ${v}`)
    if (k === "df" && s.dateField !== v) errs.push(`dateField ${s.dateField} ≠ ${v}`)
    if (k === "sum" && !s.summary) errs.push("not a totals report")
    if (k === "lim" && s.limit !== Number(v)) errs.push(`limit ${s.limit} ≠ ${v}`)
    if (k === "sort") { const [f, d] = v.split(":"); if (s.sort?.field !== f || s.sort?.dir !== d) errs.push(`sort ${JSON.stringify(s.sort)} ≠ ${v}`) }
    if (k === "clean" && r.ignored.length) errs.push(`ignored: ${r.ignored.join(", ")}`)
    if (k === "fix" && !r.corrections.some((c: any) => c.from === v)) errs.push(`no correction for ${v}`)
    if (k === "f") {
      const m = v.match(/^([a-z_]+)(:BETWEEN:([\d.]+):([\d.]+)|(!=|>=|<=|=|>|<)(.+))$/)!
      const ok = s.filters.some((f: any) => f.field === m[1] && (m[2].startsWith(":BETWEEN")
        ? f.op === "BETWEEN" && Number(f.value) === Number(m[3]) && Number(f.value2) === Number(m[4])
        : f.op === m[5] && String(f.value).toUpperCase() === m[6].toUpperCase()))
      if (!ok) errs.push(`no filter ${v} (got ${JSON.stringify(s.filters)})`)
    }
    void rest
  }
  return errs
}

;(async () => {
  let pg: any
  if (process.env.DATABASE_URL || process.env.PGHOST) {
    const { Client } = await import("pg")
    pg = new Client(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {})
    await pg.connect()
  }
  let pass = 0
  const fails: string[] = []
  for (const [q, expect] of CASES) {
    const r: any = parseQuestion(q, KNOWN, TODAY, TEACH)
    if (r.ask) { fails.push(`✗ ${q}\n    → asked: ${r.ask.slice(0, 80)}`); continue }
    const errs = check(r, expect)
    try {
      const b = buildSQL(r.spec, [1])
      if (pg) { await pg.query("BEGIN READ ONLY"); await pg.query(b.sql, b.params); await pg.query("ROLLBACK") }
    } catch (e: any) { errs.push("SQL: " + e.message); if (pg) await pg.query("ROLLBACK").catch(() => {}) }
    if (errs.length) fails.push(`✗ ${q}\n    → ${describe(r.spec).text}\n    ${errs.join("\n    ")}`)
    else pass++
  }
  console.log(fails.join("\n"))
  console.log(`\n${pass}/${CASES.length} passed`)
  if (pg) await pg.end()
  process.exit(fails.length ? 1 : 0)
})()
