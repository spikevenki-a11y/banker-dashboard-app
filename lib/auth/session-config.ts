// Shared session constants. Deliberately free of "server-only" / next/headers
// imports so both the Node-side session helpers (lib/auth/session.ts) and the
// edge-runtime middleware (middleware.ts) can read the same values without
// duplicating them and drifting out of sync.

export const SESSION_COOKIE_NAME = "banker_session"

// Force re-login after this long, regardless of activity.
export const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000 // 8 hours
// Force re-login after this long of inactivity (sliding window, refreshed on every read).
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function getSessionPassword(): string {
  const password = process.env.SESSION_SECRET
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET environment variable must be set to a random string of at least 32 characters."
    )
  }
  return password
}
