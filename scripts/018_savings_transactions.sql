CREATE TABLE IF NOT EXISTS savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(20) NOT NULL REFERENCES savings_accounts(account_number),
  transaction_date DATE NOT NULL,
  branch_id BIGINT NOT NULL REFERENCES branchparameters(branch_id),
  value_date DATE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (
    transaction_type IN (
      'DEPOSIT', 
      'WITHDRAWAL', 
      'INTEREST', 
      'OPENING', 
      'CLOSURE', 
      'TRANSFER_IN', 
      'TRANSFER_OUT'
    )
  ),
  narration TEXT,
  voucher_type VARCHAR(20),
  voucher_no INTEGER,
  gl_batch_id BIGINT,
  credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  running_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  debit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  instrument_type VARCHAR(20),
  instrument_no VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Index for fast lookups by account and date
CREATE INDEX IF NOT EXISTS idx_savings_txn_account ON savings_transactions(account_number);
CREATE INDEX IF NOT EXISTS idx_savings_txn_date ON savings_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_savings_txn_branch ON savings_transactions(branch_id);
