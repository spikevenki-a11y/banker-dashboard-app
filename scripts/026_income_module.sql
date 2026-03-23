-- Income Module Tables
-- This module manages income accounts and transactions for the bank-level finance operations

-- Create income_accounts table
CREATE TABLE IF NOT EXISTS income_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  gl_account_code BIGINT NOT NULL,
  opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closing_date DATE,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, INACTIVE
  description TEXT,
  branch_id BIGINT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create income_transactions table
CREATE TABLE IF NOT EXISTS income_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(50) NOT NULL REFERENCES income_accounts(account_number),
  transaction_date DATE NOT NULL,
  voucher_no INTEGER,
  voucher_type VARCHAR(20), -- CREDIT, DEBIT
  description TEXT NOT NULL,
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(100),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  branch_id BIGINT NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_income_accounts_gl_account ON income_accounts(gl_account_code);
CREATE INDEX IF NOT EXISTS idx_income_accounts_status ON income_accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_income_accounts_branch ON income_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_account ON income_transactions(account_number);
CREATE INDEX IF NOT EXISTS idx_income_transactions_date ON income_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_income_transactions_branch ON income_transactions(branch_id);

-- Create audit trigger for income_accounts
CREATE OR REPLACE FUNCTION update_income_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS income_accounts_updated_at_trigger ON income_accounts;

CREATE TRIGGER income_accounts_updated_at_trigger
BEFORE UPDATE ON income_accounts
FOR EACH ROW
EXECUTE FUNCTION update_income_accounts_updated_at();
