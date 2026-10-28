import "server-only"

type Queryable = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> }

// Copies one loan_scheme_master row into loan_schemes for a branch.
// The branch scheme keeps the master's scheme_id, which other tables
// (e.g. loan_scheme_security_mapping) join on.
export async function insertLoanSchemeFromMaster(db: Queryable, branchId: string | number, m: any) {
  const { rows } = await db.query(
    `INSERT INTO loan_schemes (
       branch_id, scheme_id, scheme_name, scheme_description, loan_type,
       minimum_loan_amount, maximum_loan_amount,
       minimum_period_months, maximum_period_months,
       repayment_frequency, installment_calculation_method,
       interest_policy_id, interest_rate, interest_calculation_method,
       interest_frequency, compounding_frequency, interest_rounding,
       minimum_interest_payable, penal_interest_rate, penalty_grace_days,
       processing_fee_percent, processing_fee_min, processing_fee_max,
       prepayment_allowed, prepayment_penalty_percent, collateral_required,
       loan_gl_account, interest_income_gl_account, interest_receivable_gl_account,
       penal_interest_gl_account, processing_fee_gl_account,
       minimum_age, maximum_age, is_staff_only, 
        scheme_status
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
       $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,
       $32,$33,$34,$35
     ) RETURNING *`,
    [
      branchId,
      m.scheme_id,
      m.scheme_name,
      m.scheme_description || null,
      m.loan_type          || "GOLD_LOAN",
      Number(m.minimum_loan_amount)    || 0,
      Number(m.maximum_loan_amount)    || 0,
      Number(m.minimum_period_months)  || 0,
      Number(m.maximum_period_months)  || 0,
      m.repayment_frequency            || "MONTHLY",
      m.installment_calculation_method || "EMI",
      m.interest_policy_id             || "",
      Number(m.interest_rate)          || 0,
      m.interest_calculation_method    || "REDUCING_BALANCE",
      m.interest_frequency             || "MONTHLY",
      m.compounding_frequency          || null,
      m.interest_rounding              || "NEAREST",
      Number(m.minimum_interest_payable)   || 0,
      Number(m.penal_interest_rate)        || 0,
      Number(m.penalty_grace_days)         || 0,
      Number(m.processing_fee_percent)     || 0,
      Number(m.processing_fee_min)         || 0,
      Number(m.processing_fee_max)         || 0,
      m.prepayment_allowed  ?? true,
      Number(m.prepayment_penalty_percent) || 0,
      m.collateral_required ?? false,
      m.loan_gl_account                    || "",
      m.interest_income_gl_account         || "",
      m.interest_receivable_gl_account     || "",
      m.penal_interest_gl_account          || null,
      m.processing_fee_gl_account          || null,
      Number(m.minimum_age) || 18,
      Number(m.maximum_age) || 70,
      m.is_staff_only             ?? false,
      // m.appraiser_charge_allowed  ?? false,
      m.scheme_status || "ACTIVE",
    ]
  )
  return rows[0]
}
