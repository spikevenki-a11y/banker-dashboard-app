import { describe, expect, it } from "vitest"
import { buildRepaymentSchedule } from "./loan-repayment-schedule"
import { toPaise } from "./money"

const base = { startDate: "2026-01-15", frequency: "MONTHLY" as const }

describe("On Maturity", () => {
  it("charges simple interest for the tenure, to the paisa", () => {
    // ₹1,000 × 16.15% × 3/12 = 40.375 → 40.38 (the old float rounding gave 40.37)
    const [row] = buildRepaymentSchedule({ ...base, principal: 1000, annualRate: 16.15, tenureMonths: 3, method: "ON_MATURITY" })
    expect(row).toMatchObject({ principal: 1000, interest: 40.38, total: 1040.38, balance: 0, due_date: "2026-04-15" })
  })

  it("rounds an exact half-paisa tie to the even paisa", () => {
    // ₹1,000 × 16.05% × 3/12 = 40.125 → 40.12
    const [row] = buildRepaymentSchedule({ ...base, principal: 1000, annualRate: 16.05, tenureMonths: 3, method: "ON_MATURITY" })
    expect(row.interest).toBe(40.12)
    expect(row.total).toBe(1040.12)
  })
})

describe("Fixed Principal", () => {
  const rows = buildRepaymentSchedule({ ...base, principal: 10000, annualRate: 12, tenureMonths: 3, method: "FIXED_PRINCIPAL" })

  it("splits principal and charges interest on the reducing balance", () => {
    expect(rows.map((r) => [r.principal, r.interest, r.total, r.balance])).toEqual([
      [3333.33, 100.0, 3433.33, 6666.67], // 10,000 × 1%
      [3333.33, 66.67, 3400.0, 3333.34], // 6,666.67 × 1% = 66.6667
      [3333.34, 33.33, 3366.67, 0], // last instalment clears the rounding
    ])
  })

  it("repays exactly the principal", () => {
    expect(rows.reduce((s, r) => s + toPaise(r.principal), 0)).toBe(toPaise("10000"))
  })

  it("adds moratorium interest-only instalments when payable", () => {
    const withMoratorium = buildRepaymentSchedule({
      ...base,
      principal: 10000,
      annualRate: 12,
      tenureMonths: 4,
      moratoriumMonths: 1,
      moratoriumInterestPayable: true,
      method: "FIXED_PRINCIPAL",
    })
    expect(withMoratorium[0]).toMatchObject({
      installment_type: "MORATORIUM_INTEREST",
      principal: 0,
      interest: 100,
      balance: 10000,
    })
    expect(withMoratorium.filter((r) => r.installment_type === "REGULAR")).toHaveLength(3)
  })
})

describe("invalid input", () => {
  it("returns no schedule", () => {
    expect(buildRepaymentSchedule({ ...base, principal: 0, annualRate: 10, tenureMonths: 12, method: "FIXED_PRINCIPAL" })).toEqual([])
    expect(buildRepaymentSchedule({ ...base, principal: NaN, annualRate: 10, tenureMonths: 12, method: "FIXED_PRINCIPAL" })).toEqual([])
  })
})
