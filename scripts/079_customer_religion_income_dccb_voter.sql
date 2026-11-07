-- Customer details collected by the Create Customer form that had no column to be saved in.
-- Shown on Member Management → View Member.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS annual_income NUMERIC(15, 2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dccb_branch VARCHAR(100);
ALTER TABLE customer_kycdetails ADD COLUMN IF NOT EXISTS voter_id VARCHAR(20);
