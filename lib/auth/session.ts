import { cookies } from "next/headers"

const SESSION_COOKIE_NAME = "pacs_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionData {
  userId: string
  username: string
  fullName: string
  role: string
  branch: string
}

export async function createSession(sessionData: SessionData) {
  const cookieStore = await cookies()
  const sessionString = JSON.stringify(sessionData)
  const encodedSession = Buffer.from(sessionString).toString("base64")

  cookieStore.set(SESSION_COOKIE_NAME, encodedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })
}

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
  cookieStore.delete(SESSION_COOKIE_NAME)
}
