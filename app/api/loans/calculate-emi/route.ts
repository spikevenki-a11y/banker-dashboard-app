import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { parseAmountInput } from "@/lib/money"
import { buildEmiSchedule } from "@/lib/loan-emi"

// POST: Calculate EMI and generate schedule
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { principal, interest_rate, tenure_months, start_date } = body

    if (!principal || !interest_rate || !tenure_months) {
      return NextResponse.json(
        { error: "Principal, interest rate, and tenure are required" },
        { status: 400 }
      )
    }

    const P = parseAmountInput(principal)
    const rate = Number(interest_rate)
    const N = parseInt(tenure_months)

    if (P === null || P <= 0 || !Number.isFinite(rate) || rate < 0 || !(N > 0)) {
      return NextResponse.json({ error: "Invalid input values" }, { status: 400 })
    }

    // Reducing balance EMI and amortization schedule, in exact paise (lib/loan-emi)
    return NextResponse.json(
      buildEmiSchedule({ principal: P, annualRatePercent: rate, tenureMonths: N, startDate: start_date })
    )
  } catch (error: any) {
    console.error("Failed to calculate EMI:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
