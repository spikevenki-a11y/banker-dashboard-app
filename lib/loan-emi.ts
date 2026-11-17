// Reducing-balance EMI schedule used by POST /api/loans/calculate-emi.
// Amounts are worked in integer paise (lib/money) and returned as rupees.
import { add, emi as emiPaise, interestForMonths, multiplyBy, sub, toRupees, type Paise, ZERO_PAISE } from "./money"

export type EmiScheduleRow = {
  installment_no: number
  due_date: string
  emi_amount: number
  principal_amount: number
  interest_amount: number
  balance_principal: number
}

export type EmiResult = {
  emi_amount: number
  total_amount: number
  total_interest: number
  total_principal: number
  tenure_months: number
  schedule: EmiScheduleRow[]
}

export function buildEmiSchedule(params: {
  principal: Paise
  annualRatePercent: string | number
  tenureMonths: number
  startDate?: string | null
}): EmiResult {
  const { principal: P, annualRatePercent: rate, tenureMonths: N } = params
  const emi = emiPaise(P, rate, N)

  const schedule: EmiScheduleRow[] = []
  let balance = P
  const startDateObj = params.startDate ? new Date(params.startDate) : new Date()

  let totalInterest = ZERO_PAISE
  let totalPrincipal = ZERO_PAISE

  for (let i = 1; i <= N; i++) {
    const interestAmt = interestForMonths(balance, rate, 1)
    const principalAmt = sub(emi, interestAmt)
    balance = sub(balance, principalAmt)
    if (balance < 0) balance = ZERO_PAISE

    totalInterest = add(totalInterest, interestAmt)
    totalPrincipal = add(totalPrincipal, principalAmt)

    const dueDate = new Date(startDateObj)
    dueDate.setMonth(dueDate.getMonth() + i)

    schedule.push({
      installment_no: i,
      due_date: dueDate.toISOString().split("T")[0],
      emi_amount: toRupees(emi),
      principal_amount: toRupees(principalAmt),
      interest_amount: toRupees(interestAmt),
      balance_principal: toRupees(balance),
    })
  }

  return {
    emi_amount: toRupees(emi),
    total_amount: toRupees(multiplyBy(emi, N)),
    total_interest: toRupees(totalInterest),
    total_principal: toRupees(totalPrincipal),
    tenure_months: N,
    schedule,
  }
}
