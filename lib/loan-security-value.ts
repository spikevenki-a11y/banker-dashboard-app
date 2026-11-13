import { formatCurrency } from "@/lib/number-format"

// Value of the security offered with a loan application, used to check that the loan
// amount applied is less than the security amount. Shared by the Loan Application page
// and POST /api/loans/applications so both apply the same rule.
//
// Takes the security payload sent to the API (numbers or numeric strings).

type SecurityValueSource = {
  security_type_id?: number | string | null
  market_value?: number | string | null              // gold: gold rate × net weight
  guideline_value?: number | string | null           // land / building
  current_market_value?: number | string | null      // vehicle
  deposit_amount?: number | string | null            // deposits
  lien_amount?: number | string | null               // deposits: amount under lien (when given)
  surrender_value?: number | string | null           // insurance policy
  surety_eligible_security_amount?: number | string | null // surety
}

type SecurityValue = { amount: number; label: string }

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Returns the security amount and the name of the field it comes from, or null for
// security types that do not capture a value (no check is applied for those).
export function getSecurityValue(security: SecurityValueSource | null | undefined): SecurityValue | null {
  if (!security) return null
  switch (Number(security.security_type_id)) {
    case 6:
      return { amount: num(security.market_value), label: "gold market value" }
    case 1:
    case 2:
      return { amount: num(security.guideline_value), label: "guideline value" }
    case 7:
      return { amount: num(security.current_market_value), label: "vehicle current market value" }
    case 8:
    case 12:
      return num(security.lien_amount) > 0
        ? { amount: num(security.lien_amount), label: "lien amount" }
        : { amount: num(security.deposit_amount), label: "deposit amount" }
    case 10:
      return { amount: num(security.surrender_value), label: "policy surrender value" }
    case 13:
      return { amount: num(security.surety_eligible_security_amount), label: "surety's eligible security amount" }
    default:
      return null
  }
}

// Error message when the loan amount is not less than the security amount, otherwise "".
export function getLoanSecurityError(loanAmount: unknown, security: SecurityValueSource | null | undefined): string {
  const value = getSecurityValue(security)
  const loan = Number(loanAmount)
  if (!value || !(loan > 0)) return ""
  if (value.amount <= 0) {
    return `Enter the ${value.label} of the security. The loan amount applied must be less than the security amount.`
  }
  if (loan >= value.amount) {
    return `Loan amount applied (${formatCurrency(loan)}) must be less than the security amount (${value.label}: ${formatCurrency(value.amount)}).`
  }
  return ""
}
