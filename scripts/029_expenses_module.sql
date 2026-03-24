-- expense Module Tables
-- This module manages expense accounts and transactions for the bank-level finance operations

-- Create expense_accounts table
CREATE TABLE IF NOT EXISTS expense_accounts (
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

-- Create expense_transactions table
CREATE TABLE IF NOT EXISTS expense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(50) NOT NULL REFERENCES expense_accounts(account_number),
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
CREATE INDEX IF NOT EXISTS idx_expense_accounts_gl_account ON expense_accounts(gl_account_code);
CREATE INDEX IF NOT EXISTS idx_expense_accounts_status ON expense_accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_expense_accounts_branch ON expense_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_account ON expense_transactions(account_number);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_date ON expense_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_branch ON expense_transactions(branch_id);

-- Create audit trigger for expense_accounts
CREATE OR REPLACE FUNCTION update_expense_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expense_accounts_updated_at_trigger ON expense_accounts; 

CREATE TRIGGER expense_accounts_updated_at_trigger
BEFORE UPDATE ON expense_accounts
FOR EACH ROW
EXECUTE FUNCTION update_expense_accounts_updated_at();
