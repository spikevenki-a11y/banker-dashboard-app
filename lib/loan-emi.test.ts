import { describe, expect, it } from "vitest"
import { buildEmiSchedule } from "./loan-emi"
import { toPaise } from "./money"

// Reference values computed independently with Python fractions (exact) + half-even rounding
describe("buildEmiSchedule — ₹1,00,000 at 10% for 12 months", () => {
  const result = buildEmiSchedule({
    principal: toPaise("100000"),
    annualRatePercent: 10,
    tenureMonths: 12,
    startDate: "2026-01-15",
  })

  it("has the standard EMI", () => {
    expect(result.emi_amount).toBe(8791.59)
    expect(result.total_amount).toBe(105499.08)
  })

  it("gets the first instalment right to the paisa", () => {
    // interest = 1,00,000 × 10/1200 = 833.333… → 833.33
    expect(result.schedule[0]).toMatchObject({
      interest_amount: 833.33,
      principal_amount: 7958.26,
      balance_principal: 92041.74,
    })
  })

  it("gets the last instalment right to the paisa", () => {
    expect(result.schedule[11]).toMatchObject({
      interest_amount: 72.66,
      principal_amount: 8718.93,
      balance_principal: 0,
    })
  })

  it("splits every instalment exactly into principal + interest", () => {
    for (const row of result.schedule) {
      expect(toPaise(row.principal_amount) + toPaise(row.interest_amount)).toBe(toPaise(row.emi_amount))
    }
  })

  it("totals the interest exactly", () => {
    expect(result.total_interest).toBe(5499.05)
  })

  // Known existing issue, kept as-is pending a decision: the final instalment is a full
  // EMI and the overshoot is clamped to a zero balance, so 3 paise more principal is
  // collected than was lent. Expected to fail until the last instalment is adjusted.
  it.fails("collects exactly the principal that was lent", () => {
    expect(result.total_principal).toBe(100000)
  })
})

describe("buildEmiSchedule — 0% interest", () => {
  it("divides the principal and charges no interest", () => {
    const r = buildEmiSchedule({ principal: toPaise("1200"), annualRatePercent: 0, tenureMonths: 12 })
    expect(r.emi_amount).toBe(100)
    expect(r.total_interest).toBe(0)
    expect(r.schedule.at(-1)?.balance_principal).toBe(0)
  })
})
