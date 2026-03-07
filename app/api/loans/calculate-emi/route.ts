import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// POST: Calculate EMI and generate schedule
export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { principal, interest_rate, tenure_months, start_date } = body

    if (!principal || !interest_rate || !tenure_months) {
      return NextResponse.json(
        { error: "Principal, interest rate, and tenure are required" },
        { status: 400 }
      )
    }

    const P = parseFloat(principal)
    const R = parseFloat(interest_rate) / 12 / 100 // Monthly interest rate
    const N = parseInt(tenure_months)

    if (P <= 0 || R < 0 || N <= 0) {
      return NextResponse.json({ error: "Invalid input values" }, { status: 400 })
    }

    // Calculate EMI using reducing balance method
    let emi = 0
    if (R > 0) {
      emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1)
    } else {
      emi = P / N
    }
    emi = Math.round(emi * 100) / 100

    // Generate amortization schedule
    const schedule = []
    let balance = P
    const startDateObj = start_date ? new Date(start_date) : new Date()

    let totalInterest = 0
    let totalPrincipal = 0

    for (let i = 1; i <= N; i++) {
      const interestAmt = Math.round(balance * R * 100) / 100
      const principalAmt = Math.round((emi - interestAmt) * 100) / 100
      balance = Math.round((balance - principalAmt) * 100) / 100
      if (balance < 0) balance = 0

      totalInterest += interestAmt
      totalPrincipal += principalAmt

      const dueDate = new Date(startDateObj)
      dueDate.setMonth(dueDate.getMonth() + i)

      schedule.push({
        installment_no: i,
        due_date: dueDate.toISOString().split('T')[0],
        emi_amount: emi,
        principal_amount: principalAmt,
        interest_amount: interestAmt,
        balance_principal: balance
      })
    }

    return NextResponse.json({
      emi_amount: emi,
      total_amount: Math.round(emi * N * 100) / 100,
      total_interest: Math.round(totalInterest * 100) / 100,
      total_principal: Math.round(totalPrincipal * 100) / 100,
      tenure_months: N,
      schedule
    })
  } catch (error: any) {
    console.error("Failed to calculate EMI:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
