import "server-only"
import { cookies } from "next/headers"
import { getIronSession, type IronSession } from "iron-session"

const SESSION_COOKIE_NAME = "banker_session"

// Force re-login after this long, regardless of activity.
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000 // 8 hours
// Force re-login after this long of inactivity (sliding window, refreshed on every read).
const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

const sessionPassword = process.env.SESSION_SECRET
if (!sessionPassword || sessionPassword.length < 32) {
  throw new Error(
    "SESSION_SECRET environment variable must be set to a random string of at least 32 characters."
  )
}

export interface SessionData {
  userId: string
  fullName: string
  role: string
  branch: string
  branch_name: string
  businessDate: string
}

interface SessionRecord extends SessionData {
  issuedAt: number
  lastActivity: number
}

const sessionOptions = {
  password: sessionPassword,
  cookieName: SESSION_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ABSOLUTE_TIMEOUT_MS / 1000,
  },
}

async function getIronSessionInstance(): Promise<IronSession<SessionRecord>> {
  const cookieStore = await cookies()
  return getIronSession<SessionRecord>(cookieStore, sessionOptions)
}

// Creates a fresh, signed+encrypted session cookie. Always issues a brand new
// session (rather than mutating an existing one) so login/2FA-upgrade/re-auth
// rotate the session identity instead of reusing a pre-auth cookie.
export async function createSession(data: SessionData): Promise<boolean> {
  try {
    const session = await getIronSessionInstance()
    const now = Date.now()

    // Wipe any stale fields from a previous session before assigning the new ones.
    for (const key of Object.keys(session) as (keyof SessionRecord)[]) {
      delete session[key]
    }

    Object.assign(session, data, { issuedAt: now, lastActivity: now })
    await session.save()
    return true
  } catch (error) {
    console.error("Failed to create session:", error)
    return false
  }
}

// Reads and validates the session, enforcing both absolute and idle timeouts
// server-side (the cookie's own maxAge is only a browser-side hint).
// On success, slides the idle window forward.
export async function getSession(): Promise<SessionData | null> {
  try {
    const session = await getIronSessionInstance()
    if (!session.userId) return null

    const now = Date.now()
    if (
      now - session.issuedAt > ABSOLUTE_TIMEOUT_MS ||
      now - session.lastActivity > IDLE_TIMEOUT_MS
    ) {
      session.destroy()
      return null
    }

    session.lastActivity = now
    await session.save()

    const { issuedAt, lastActivity, ...data } = session
    return data
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const session = await getIronSessionInstance()
  session.destroy()
}

// Backwards-compatible alias used by existing call sites.
export const deleteSession = destroySession

// --- Pending 2FA session -----------------------------------------------
// Carries the pre-2FA identity between password verification and TOTP
// verification. Signed the same way as the real session so it can't be
// forged to skip straight to guessing a victim's TOTP code without ever
// knowing their password.

const PENDING_2FA_COOKIE_NAME = "banker_2fa_pending"
const PENDING_2FA_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export interface PendingTwoFactorData {
  userId: string
  fullName: string
  role: string
  branch: string
  branch_name: string
  businessDate: string
}

interface PendingTwoFactorRecord extends PendingTwoFactorData {
  issuedAt: number
}

const pending2faSessionOptions = {
  password: sessionPassword,
  cookieName: PENDING_2FA_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PENDING_2FA_TIMEOUT_MS / 1000,
  },
}

async function getPending2faIronSession(): Promise<IronSession<PendingTwoFactorRecord>> {
  const cookieStore = await cookies()
  return getIronSession<PendingTwoFactorRecord>(cookieStore, pending2faSessionOptions)
}

export async function createPendingTwoFactorSession(data: PendingTwoFactorData): Promise<void> {
  const session = await getPending2faIronSession()
  Object.assign(session, data, { issuedAt: Date.now() })
  await session.save()
}

export async function getPendingTwoFactorSession(): Promise<PendingTwoFactorData | null> {
  try {
    const session = await getPending2faIronSession()
    if (!session.userId) return null

    if (Date.now() - session.issuedAt > PENDING_2FA_TIMEOUT_MS) {
      session.destroy()
      return null
    }

    const { issuedAt, ...data } = session
    return data
  } catch {
    return null
  }
}

export async function clearPendingTwoFactorSession(): Promise<void> {
  const session = await getPending2faIronSession()
  session.destroy()
}
