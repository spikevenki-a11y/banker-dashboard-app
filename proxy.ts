import { NextResponse, type NextRequest } from "next/server"
import { unsealData } from "iron-session"
import {
  SESSION_COOKIE_NAME,
  ABSOLUTE_TIMEOUT_MS,
  IDLE_TIMEOUT_MS,
  getSessionPassword,
} from "@/lib/auth/session-config"

// Pages that must stay reachable without a session, so the redirect below
// never fires on them — that's what keeps this from becoming a redirect loop.
const PUBLIC_PATHS = new Set(["/", "/login", "/2fa"])

interface SessionRecord {
  userId?: string
  issuedAt?: number
  lastActivity?: number
}

// Fast, read-only validity check: same absolute/idle rules as getSession()
// in lib/auth/session.ts, but without sliding the idle window forward. The
// authoritative, mutating check still happens server-side in getSession()
// when the page's own API calls run; this just keeps expired/missing
// sessions from ever reaching protected page code in the first place.
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!cookie) return false

  try {
    const data = await unsealData<SessionRecord>(cookie, { password: getSessionPassword() })
    if (!data.userId || !data.issuedAt || !data.lastActivity) return false

    const now = Date.now()
    if (now - data.issuedAt > ABSOLUTE_TIMEOUT_MS) return false
    if (now - data.lastActivity > IDLE_TIMEOUT_MS) return false

    return true
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next({ request })
  }

  if (await hasValidSession(request)) {
    return NextResponse.next({ request })
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("from", pathname + search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Run on every page navigation except API routes (they enforce their own
  // auth and return JSON 401s — redirecting them would break fetch() callers
  // expecting JSON), Next internals, and static files.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
