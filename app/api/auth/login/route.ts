import { createClient } from "@/lib/supabase/server"
import { createSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    console.log("[v0] Login API route hit")

    const body = await request.json()
    console.log("[v0] Request body parsed:", { username: body.username })

    const { username, password } = body

    if (!username || !password) {
      console.log("[v0] Missing credentials")
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    console.log("[v0] Creating Supabase client")
    const supabase = await createClient()

    console.log("[v0] Querying user:", username)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, password, full_name, role, is_active")
      .eq("username", username)
      .maybeSingle()

    console.log("[v0] Query result:", {
      found: !!user,
      error: userError?.message,
      username: user?.username,
      role: user?.role,
    })

    if (userError) {
      console.error("[v0] Database error:", userError)
      return NextResponse.json({ error: "Database error: " + userError.message }, { status: 500 })
    }

    if (!user) {
      console.log("[v0] User not found")
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    if (!user.is_active) {
      console.log("[v0] User inactive")
      return NextResponse.json({ error: "Account is not active" }, { status: 401 })
    }

    console.log("[v0] Verifying password with bcrypt")
    let isPasswordValid = false
    try {
      isPasswordValid = await bcrypt.compare(password, user.password)
      console.log("[v0] Password valid:", isPasswordValid)
    } catch (bcryptError) {
      console.error("[v0] Bcrypt error:", bcryptError)
      return NextResponse.json({ error: "Authentication error" }, { status: 500 })
    }

    if (!isPasswordValid) {
      console.log("[v0] Invalid password")
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    console.log("[v0] Creating session")
    try {
      await createSession({
        userId: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      })
      console.log("[v0] Session created successfully")
    } catch (sessionError) {
      console.error("[v0] Session error:", sessionError)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    console.log("[v0] Login successful, returning response")
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
      redirectUrl: "/dashboard",
    })
  } catch (error) {
    console.error("[v0] Unexpected error in login route:", error)
    return NextResponse.json(
      {
        error: "Login failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
