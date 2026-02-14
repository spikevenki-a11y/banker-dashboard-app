
export const runtime = "nodejs"
import { createClient } from "@supabase/supabase-js"
import { createSession } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  try {
    const { username, password } = await request.json()
    if (!username || !password)
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })

    const { data: user } = await supabase
      .from("users")
      .select("id, username, password, full_name, role, is_active, branch")
      .eq("username", username)
      .maybeSingle()

    if (!user || !user.is_active)
      return NextResponse.json({ error: "Invalid username or inactive account" }, { status: 401 })

    // Branch business day check
    const { data: day } = await supabase
      .from("branch_business_day")
      .select("business_date,is_open")
      .eq("branch_id", user.branch)
      .maybeSingle()

    console.log(day?.business_date)
    if (!day?.is_open)
      return NextResponse.json({ error: "Branch day not opened" }, { status: 403 })

    // Failed attempt lock check
    const { data: fail } = await supabase
      .from("staff_login_failures")
      .select("*")
      .eq("staff_id", user.id)
      .maybeSingle()

    if (fail?.locked_until && new Date(fail.locked_until) > new Date())
      return NextResponse.json({ error: "Account locked temporarily" }, { status: 403 })

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      const count = (fail?.failure_count || 0) + 1
      await supabase.from("staff_login_failures").upsert({
        staff_id: user.id,
        failure_count: count,
        locked_until: count >= 3 ? new Date(Date.now() + 30 * 60000) : null,
      })

      await supabase.from("staff_login_audit").insert({
        staff_id: user.id,
        branch_id: user.branch,
        ip_address: request.headers.get("x-forwarded-for"),
        success: false,
        failure_reason: "Invalid password",
      })

      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    // Successful login cleanup + audit
    await supabase.from("staff_login_failures").delete().eq("staff_id", user.id)

    await supabase.from("staff_login_audit").insert({
      staff_id: user.id,
      branch_id: user.branch,
      ip_address: request.headers.get("x-forwarded-for"),
      success: true,
    })

    // Create secured session
    // await createSession({
    //   userId: user.id,
    //   username: user.username,
    //   fullName: user.full_name,
    //   role: user.role,
    //   branch: user.branch,
    //   businessDate: new Date().toISOString().split("T")[0], // Placeholder for business date,
    // })

    // const sessionData = {
    //   userId: user.id,
    //   fullName: user.full_name,
    //   role: user.role,
    //   branch: user.branch,
    //   businessDate: new Date().toISOString().split("T")[0], // Placeholder for business date,
    // }

    // const res = NextResponse.json({
    //   success: true,
    //   redirectUrl: user.role === "admin" ? "/admin" : "/dashboard",
    // })
    // res.cookies.set("banker_session", JSON.stringify(sessionData), {
    //   httpOnly: true,
    //   secure: false,
    //   sameSite: "strict",
    //   path: "/",
    //   domain: "localhost",
    //   maxAge: 60 * 60 * 24, // 12 hours
    // })

    // return res
    const res = NextResponse.json({
      success: true,
      redirectUrl: user.role === "admin" ? "/admin" : "/dashboard",
    })

    createSession(res, {
      userId: user.id,
      fullName: user.full_name,
      role: user.role,
      branch: user.branch,
      branch_name: user.branch,
      businessDate: day!.business_date, 
      // businessDate: new Date().toISOString().split("T")[0], // Placeholder for business date,
    })

    return res
  } catch (err) {
    console.error("LOGIN ERROR:", err)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
