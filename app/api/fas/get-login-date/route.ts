import { getSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function GET() {
  const u = await getSession()
  if (!u) return NextResponse.json(null)
  return NextResponse.json({
    businessDate: u.businessDate
  })
}
