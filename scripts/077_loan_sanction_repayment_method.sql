-- Loans → Loan Sanction: Repayment Type (On Maturity / Fixed Principal).
-- repayment_type keeps holding the repayment frequency
-- (MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY, CLOSING_TIME), as before.
-- Existing rows are left as they are: NULL repayment_method = sanctioned before
-- this option existed, and disbursement keeps the earlier monthly EMI schedule for them.
ALTER TABLE public.loan_sanction_details
  ADD COLUMN IF NOT EXISTS repayment_method VARCHAR(30);
