import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: branches, error } = await supabase
      .from("branchparameters")
      .select("*")
      .order("branch_id", { ascending: true })

    if (error) throw error

    return NextResponse.json(branches)
  } catch (error) {
    console.error("[v0] Error fetching branches:", error)
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { branch_name, branch_code, city, state, phone_number, email, is_head_office } = await request.json()
    const supabase = await createClient()

    const { data: branch, error } = await supabase
      .from("branchparameters")
      .insert({
        branch_name,
        branch_code,
        city,
        state,
        phone_number,
        email,
        is_head_office,
        bank_name: "NextZen Bank",
        bank_type: is_head_office ? "H" : "B",
      })
      .select()

    if (error) throw error

    return NextResponse.json(branch[0])
  } catch (error) {
    console.error("[v0] Error creating branch:", error)
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 })
  }
}
