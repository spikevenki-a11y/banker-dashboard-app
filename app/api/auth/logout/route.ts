import { deleteSession, destroySession } from "@/lib/auth/session"
import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ success: true })
  destroySession(res)
  return res
}
