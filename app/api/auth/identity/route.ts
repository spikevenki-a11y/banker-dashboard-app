import { getSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json(null)

  console.log("Session data:", session) // Log the session data for debugging
  console.log("Full Name:-----------------------------", session.businessDate) // Log the full name for debugging
  return NextResponse.json({
    name: session.fullName,
    role: session.role,
    branch: session.branch,
    initials: session.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase(),
    businessDate: session.businessDate,
    branch_name: session.branch_name,
  })
}
