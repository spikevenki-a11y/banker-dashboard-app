import { createClient } from "@/lib/supabase/server"
import { createSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
console.log("Login route loaded")
export async function POST(request: Request) {
  console.log("Received login request")
  try {
    const { username, password } = await request.json()

    console.log("[v0] Login attempt for:", username)

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, password, full_name, role, is_active")
      .eq("username", username)
      .maybeSingle()
    console.log(
      "[v0] User check result:",
      user ? { id: user.id, username: user.username, role: user.role, is_active: user.is_active } : null,
      "Error:",
      userError,
    )

    if (userError || user === null) {
      console.log("[v0] User not found:", username)
      return NextResponse.json({ error: "Invalid User Name or password" }, { status: 401 })
    }
    
    console.log("[v0] Supabase query executed for user:", user.username)

    if (!user.is_active) {
      console.log("[v0] User is not active:", username)
      return NextResponse.json({ error: "Account is not active" }, { status: 401 })
    }

    const isPasswordValid = true //await bcrypt.compare(password, user.password)
    console.log("encrypted password:", bcrypt.hashSync(password, 10))
    if(password === user.password){
      const isPasswordValid = true
    }

    console.log("[v0] Password verification result:", isPasswordValid)

    if (!isPasswordValid) {
      console.log("[v0] Password verification failed for:", username)
      return NextResponse.json({ error: "Invalid User Name or password" }, { status: 401 })
    }

    // Create session
    await createSession({
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    })

    const redirectUrl = "/dashboard"
    console.log("[v0] User logged in:", user.username, "Redirecting to:", redirectUrl)

   const responsePayload = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
      redirectUrl,
    }

    console.log("[v0] Sending login response:", responsePayload)

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.log("[v0] Error during login process:", error)
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
