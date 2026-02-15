import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const c = req.headers.get("cookie")
  console.log("RAW COOKIE:", c)

  const session = c?.match(/banker_session=([^;]+)/)?.[1]
  if (!session) return NextResponse.json(null)

  return NextResponse.json(JSON.parse(decodeURIComponent(session)))
}