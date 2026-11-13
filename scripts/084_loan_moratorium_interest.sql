-- Loans → Loan Sanction: Interest Payable During Moratorium (Yes / No).
-- Yes (Fixed Principal loans with a moratorium only): interest-only instalments are
-- scheduled at the Repayment Frequency during the moratorium; principal repayment
-- starts after it. No: no instalments during the moratorium (the earlier behaviour).
-- Existing sanctions default to No, so their schedules are unchanged.
ALTER TABLE public.loan_sanction_details
  ADD COLUMN IF NOT EXISTS moratorium_interest_payable BOOLEAN NOT NULL DEFAULT FALSE;

-- Marks interest-only moratorium instalments apart from regular instalments.
-- REGULAR | MORATORIUM_INTEREST; existing schedule rows are REGULAR.
ALTER TABLE public.loan_repayment_schedule_details
  ADD COLUMN IF NOT EXISTS installment_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR';
