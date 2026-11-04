import { NextResponse, type NextRequest } from "next/server"
import { unsealData } from "iron-session"
import {
  SESSION_COOKIE_NAME,
  ABSOLUTE_TIMEOUT_MS,
  IDLE_TIMEOUT_MS,
  getSessionPassword,
} from "@/lib/auth/session-config"
import { getDayEndLockState, dayEndLockResponse } from "@/lib/dayend-check"

// Pages that must stay reachable without a session, so the redirect below
// never fires on them — that's what keeps this from becoming a redirect loop.
const PUBLIC_PATHS = new Set(["/", "/login", "/2fa"])

// ── Day-End transaction lock ────────────────────────────────────────────────
// Every write request (POST/PUT/PATCH/DELETE) to /api is blocked while the
// session branch's business date is under day-end, except the paths below.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

// Prefixes that are never locked: login/2FA, the day-end process itself, and
// user administration (not a transaction, and may be needed to unblock users).
const DAYEND_EXEMPT_PREFIXES = ["/api/auth/", "/api/fas/dayend/", "/api/admin/users"]

// POST endpoints that only read data (searches, lookups, calculators).
const DAYEND_EXEMPT_READONLY_POSTS = new Set([
  "/api/customers/lookup",
  "/api/deposits/account-search",
  "/api/loans/calculate-emi",
  "/api/lockers/check-availability",
  "/api/memberships/view_member",
  "/api/savings/account-search",
  "/api/savings/member-lookup",
  "/api/savings/member-search",
])

function isDayEndLockedRequest(method: string, pathname: string): boolean {
  if (!WRITE_METHODS.has(method)) return false
  const path = pathname.replace(/\/+$/, "")
  if (DAYEND_EXEMPT_READONLY_POSTS.has(path)) return false
  return !DAYEND_EXEMPT_PREFIXES.some((p) => path === p.replace(/\/$/, "") || path.startsWith(p))
}

interface SessionRecord {
  userId?: string
  branch?: string
  businessDate?: string
  issuedAt?: number
  lastActivity?: number
}

// Fast, read-only validity check: same absolute/idle rules as getSession()
// in lib/auth/session.ts, but without sliding the idle window forward. The
// authoritative, mutating check still happens server-side in getSession()
// when the page's own API calls run; this just keeps expired/missing
// sessions from ever reaching protected page code in the first place.
async function readValidSession(request: NextRequest): Promise<SessionRecord | null> {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!cookie) return null

  try {
    const data = await unsealData<SessionRecord>(cookie, { password: getSessionPassword() })
    if (!data.userId || !data.issuedAt || !data.lastActivity) return null

    const now = Date.now()
    if (now - data.issuedAt > ABSOLUTE_TIMEOUT_MS) return null
    if (now - data.lastActivity > IDLE_TIMEOUT_MS) return null

    return data
  } catch {
    return null
  }
}

async function handleApi(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  if (!isDayEndLockedRequest(request.method, pathname)) {
    return NextResponse.next({ request })
  }

  // No valid session: let the route return its own 401 JSON.
  const session = await readValidSession(request)
  if (!session) return NextResponse.next({ request })

  // A session without a branch/business date can't be checked against
  // day-end, so it can't be allowed to write.
  if (!session.branch || !session.businessDate) {
    return NextResponse.json(
      { error: "Business date is not available for this session. Please log in again." },
      { status: 423 }
    )
  }

  try {
    const state = await getDayEndLockState(session.branch, session.businessDate)
    if (state !== "OPEN") return dayEndLockResponse(state)
  } catch (e) {
    // Fail closed: if we can't confirm day-end status, don't allow the write.
    console.error("Day-end lock check failed:", e)
    return NextResponse.json(
      { error: "Unable to verify Day-End status. Please try again." },
      { status: 503 }
    )
  }

  return NextResponse.next({ request })
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // API routes enforce their own auth and return JSON 401s (redirecting would
  // break fetch() callers), so here they only go through the day-end lock.
  if (pathname.startsWith("/api/") || pathname === "/api") {
    return handleApi(request)
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next({ request })
  }

  if (await readValidSession(request)) {
    return NextResponse.next({ request })
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("from", pathname + search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Run on every page navigation and API request, except Next internals and
  // static files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
