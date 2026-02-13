import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json(null)
  const u = JSON.parse(c.value)
  return NextResponse.json({
    name: u.fullName,
    role: u.role,
    branch: u.branch,
    initials: u.fullName.split(" ").map((n: any[]) => n[0]).join("").toUpperCase()
  })
}
