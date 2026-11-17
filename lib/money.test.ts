import { describe, expect, it } from "vitest"
import {
  add,
  addSimpleInterest,
  applyRate,
  compound,
  divideBy,
  emi,
  formatMoney,
  interestForDays,
  interestForMonths,
  MoneyError,
  multiplyBy,
  parseAmountInput,
  roundToRupee,
  sub,
  sum,
  toPaise,
  toRupees,
  toSql,
  type Paise,
} from "./money"

const p = (n: number) => n as Paise
const rupees = (s: string) => toPaise(s)

describe("toPaise", () => {
  it("parses pg NUMERIC strings exactly", () => {
    expect(toPaise("1234.56")).toBe(123456)
    expect(toPaise("0.10")).toBe(10)
    expect(toPaise("-0.05")).toBe(-5)
    expect(toPaise("1,00,000.50")).toBe(10000050)
  })

  it("treats null / undefined / empty as 0, like the old `|| 0`", () => {
    expect(toPaise(null)).toBe(0)
    expect(toPaise(undefined)).toBe(0)
    expect(toPaise("")).toBe(0)
  })

  it("takes the intended decimal of a float, not its binary error", () => {
    expect(toPaise(0.1 + 0.2)).toBe(30) // 0.30000000000000004
    // float 1.005 is really 1.00499999…; we use the typed value 1.005 = 100.5 paise → even 100
    expect(toPaise(1.005)).toBe(100)
  })

  it("rounds values with more than 2 decimals half to even", () => {
    expect(toPaise("12.345")).toBe(1234) // 1234.5 → 1234 (even)
    expect(toPaise("12.355")).toBe(1236) // 1235.5 → 1236 (even)
    expect(toPaise("12.3451")).toBe(1235) // above the tie
    expect(toPaise("-12.345")).toBe(-1234)
    expect(toPaise("10.1250")).toBe(1012) // 4-decimal accrual column
  })

  it("throws on non-numbers", () => {
    expect(() => toPaise("abc")).toThrow(MoneyError)
    expect(() => toPaise(NaN)).toThrow(MoneyError)
  })
})

describe("parseAmountInput", () => {
  it("accepts up to 2 decimals", () => {
    expect(parseAmountInput("100")).toBe(10000)
    expect(parseAmountInput(99.99)).toBe(9999)
    expect(parseAmountInput("10.500")).toBe(1050) // trailing zeros are fine
  })

  it("rejects more than 2 decimals instead of rounding what the user typed", () => {
    expect(parseAmountInput("10.005")).toBeNull()
  })

  it("rejects missing and non-numeric input", () => {
    expect(parseAmountInput(undefined)).toBeNull()
    expect(parseAmountInput(null)).toBeNull()
    expect(parseAmountInput("")).toBeNull()
    expect(parseAmountInput("12abc")).toBeNull()
    expect(parseAmountInput({})).toBeNull()
  })
})

describe("arithmetic is exact", () => {
  it("adds and subtracts without float drift", () => {
    expect(sub(rupees("0.30"), rupees("0.10"))).toBe(20) // float: 0.19999999999999998
    expect(sum(Array.from({ length: 1000 }, () => rupees("0.10")))).toBe(10000) // float: 99.9999999999986
    expect(add(p(1), p(2), p(3))).toBe(6)
    expect(multiplyBy(rupees("8791.59"), 12)).toBe(10549908)
  })

  it("splits with banker's rounding", () => {
    expect(divideBy(p(5), 2)).toBe(2) // 2.5 → 2
    expect(divideBy(p(7), 2)).toBe(4) // 3.5 → 4
    expect(divideBy(p(-5), 2)).toBe(-2)
    expect(divideBy(rupees("10000"), 3)).toBe(333333) // ₹3,333.33
  })

  it("refuses amounts beyond the safe integer range", () => {
    expect(() => add(p(Number.MAX_SAFE_INTEGER), p(1))).toThrow(MoneyError)
  })
})

describe("interest — rounded once, to the paisa, half to even", () => {
  it("fixes the case the float code got wrong", () => {
    // ₹1,000 × 16.15% × 3/12 = 40.375 exactly → 4037.5 paise → 4038 (7 is odd → up)
    // The old Math.round(x * 100) / 100 returned 40.37
    expect(interestForMonths(rupees("1000"), "16.15", 3)).toBe(4038)
  })

  it("rounds an exact half-paisa tie to the even paisa (down)", () => {
    // ₹1,000 × 16.05% × 3/12 = 40.125 → 4012.5 → 4012 (half-up would give 4013)
    expect(interestForMonths(rupees("1000"), "16.05", 3)).toBe(4012)
  })

  it("rounds an exact half-paisa tie to the even paisa (up)", () => {
    // ₹1,000.50 × 15% × 12/12 = 150.075 → 15007.5 → 15008
    expect(interestForMonths(rupees("1000.50"), "15", 12)).toBe(15008)
  })

  it("computes daily interest on a 365-day year", () => {
    // ₹1,00,000 × 7.3% / 365 = ₹20.00 exactly
    expect(interestForDays(rupees("100000"), "7.3", 1)).toBe(2000)
    // ₹12,345.67 × 6.5% × 30/365 = 65.9563… → ₹65.96
    expect(interestForDays(rupees("12345.67"), "6.5", 30)).toBe(6596)
  })

  it("accepts the rate as a number or a NUMERIC string", () => {
    expect(applyRate(rupees("1000"), 16.15, 3, 12)).toBe(applyRate(rupees("1000"), "16.15", 3, 12))
  })
})

describe("maturity rounding", () => {
  it("rounds the exact maturity once, not interest-then-rupee", () => {
    // ₹1,000 + ₹1,000 × 18.2646% × 1/365 = 1000.5004 exactly → nearest rupee 1001.
    // Rounding to the paisa first (1000.50) and then to the rupee (tie → even) would give 1000.
    expect(addSimpleInterest(rupees("1000"), "18.2646", 1, 365, "RUPEE")).toBe(100100)
  })

  it("rounds a rupee tie to the even rupee", () => {
    expect(roundToRupee(rupees("100.50"))).toBe(10000)
    expect(roundToRupee(rupees("101.50"))).toBe(10200)
    expect(roundToRupee(rupees("-100.50"))).toBe(-10000)
  })

  it("rounds down to the rupee when asked", () => {
    expect(roundToRupee(rupees("101.99"), "RUPEE_DOWN")).toBe(10100)
    expect(roundToRupee(rupees("-101.01"), "RUPEE_DOWN")).toBe(-10200)
  })

  it("compounds and rounds once", () => {
    // ₹10,000 at 8% compounded quarterly for 1 year: 10000 × 1.02^4 = 10824.3216
    expect(compound(rupees("10000"), 8, 4, 4)).toBe(1082432)
    expect(compound(rupees("10000"), 8, 4, 4, "RUPEE")).toBe(1082400)
  })
})

describe("emi", () => {
  // Expected values computed independently with Python fractions (exact) + half-even
  it.each([
    ["100000", "10", 12, 879159],
    ["500000", "8.5", 240, 433912],
    ["250000", "11.25", 36, 821431],
    ["1000000", "9.15", 360, 815439],
  ])("₹%s at %s%% for %i months", (principal, rate, months, expected) => {
    expect(emi(rupees(principal), rate, months)).toBe(expected)
  })

  it("is principal / n at 0%, half to even", () => {
    expect(emi(rupees("1000"), "0", 3)).toBe(33333)
    expect(emi(rupees("0.05"), 0, 2)).toBe(2) // 2.5 paise → 2
  })

  it("rejects a non-positive tenure", () => {
    expect(() => emi(rupees("1000"), "10", 0)).toThrow(MoneyError)
  })
})

describe("output", () => {
  it("formats SQL params exactly", () => {
    expect(toSql(p(5))).toBe("0.05")
    expect(toSql(p(0))).toBe("0.00")
    expect(toSql(p(-123405))).toBe("-1234.05")
    expect(toSql(p(10000050))).toBe("100000.50")
  })

  it("converts to rupee numbers for JSON", () => {
    expect(toRupees(p(4038))).toBe(40.38)
    expect(JSON.stringify({ v: toRupees(p(879159)) })).toBe('{"v":8791.59}')
  })

  it("formats Indian currency without floats", () => {
    expect(formatMoney(p(1250000050))).toBe("₹1,25,00,000.50")
    expect(formatMoney(p(-99))).toBe("-₹0.99")
  })
})
