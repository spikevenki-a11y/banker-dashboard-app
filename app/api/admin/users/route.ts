import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: users, error } = await supabase
      .from("users")
      .select("id, empid, full_name, role, is_active, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(users)
  } catch (error) {
    console.error("[v0] Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { empid, full_name, role, password } = await request.json()
    const supabase = await createClient()

    const hashedPassword = await bcrypt.hash(password, 10)

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        empid,
        full_name,
        role,
        password: hashedPassword,
        is_active: true,
      })
      .select()

    if (error) throw error

    return NextResponse.json(user[0])
  } catch (error) {
    console.error("[v0] Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, is_active } = await request.json()
    const supabase = await createClient()

    const { data: user, error } = await supabase.from("users").update({ is_active }).eq("id", id).select()

    if (error) throw error

    return NextResponse.json(user[0])
  } catch (error) {
    console.error("[v0] Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
