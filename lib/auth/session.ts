import { cookies } from "next/headers"

const SESSION_COOKIE_NAME = "pacs_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionData {
  userId: string
  username: string
  fullName: string
  role: string
  branch: string
  businessDate?: string
}

import { NextResponse } from "next/server"

interface SessionOptions {
  maxAge?: number // in seconds
}

export function createSession(
  res: NextResponse,
  data: unknown,
  options: SessionOptions = {}
): boolean {
  try {
    const maxAge = options.maxAge ?? 60 * 60 * 24 * 7 // 7 days
    const value = JSON.stringify(data)

    res.cookies.set({
      name: "banker_session",
      value,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false, // Set to true in production with HTTPS
      //secure: process.env.NODE_ENV === "production",
      maxAge,
    })

    // ✅ Log cookie data to terminal (server-side)
    console.log("Cookie created:")
    console.log("Name:", "banker_session")
    console.log("Value:", value)
    console.log("MaxAge:", maxAge)

    return true
  } catch (error) {
    console.error("Failed to create session:", error)
    return false
  }
}


// export async function createSession(data: any) {
//   (await cookies()).set("banker_session", JSON.stringify(data), {
//     httpOnly: true,
//     secure: true,
//     sameSite: "lax",
//     path: "/",
//   })
// }

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    return null
  }

  try {
    const sessionString = Buffer.from(sessionCookie.value, "base64").toString("utf-8")
    return JSON.parse(sessionString)
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete("banker_session")
}

export function destroySession(res: NextResponse) {
  res.cookies.delete("banker_session")
}
