import { NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"
import { loadBranchEnrollmentRules } from "@/lib/membership-enrollment-rules"

// GET: Membership types the logged-in branch may enroll (Member Management → Enroll Member)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rules = await loadBranchEnrollmentRules(pool, session.branch)
    return NextResponse.json({ success: true, ...rules })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load enrollment rules: " + error.message }, { status: 500 })
  }
}
