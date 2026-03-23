-- Fix sundry_debitors table (ensure it exists with correct schema)
CREATE TABLE IF NOT EXISTS sundry_debitors (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT NOT NULL,
    parent_account_number VARCHAR(50),
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_description TEXT,
    account_opened_date DATE,
    ledger_balance DECIMAL(15,2) DEFAULT 0.00,
    clear_balance DECIMAL(15,2) DEFAULT 0.00,
    unclear_balance DECIMAL(15,2) DEFAULT 0.00,
    account_status VARCHAR(20) DEFAULT 'ACTIVE',
    account_closed_date DATE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for sundry_debitors
CREATE INDEX IF NOT EXISTS idx_sundry_debitors_branch ON sundry_debitors(branch_id);
CREATE INDEX IF NOT EXISTS idx_sundry_debitors_account_number ON sundry_debitors(account_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sundry_debitors_unique ON sundry_debitors(branch_id, account_number);

-- Fix sundry_debitors_transactions table (recreate with correct schema)
DROP TABLE IF EXISTS sundry_debitors_transactions;
CREATE TABLE sundry_debitors_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id BIGINT NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  transaction_date DATE NOT NULL,
  voucher_no INTEGER,
  voucher_type VARCHAR(20),
  description TEXT NOT NULL,
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(100),
  gl_batch_id INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for transactions
CREATE INDEX IF NOT EXISTS idx_sundry_debitors_txn_branch ON sundry_debitors_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_sundry_debitors_txn_account ON sundry_debitors_transactions(account_number);
CREATE INDEX IF NOT EXISTS idx_sundry_debitors_txn_date ON sundry_debitors_transactions(transaction_date);

-- Insert sequence for sundry debtors account numbers if not exists
INSERT INTO nextnumber (branch_id, accounttype, nextvalue)
SELECT DISTINCT branch_id, 62, 1
FROM branchparameters
WHERE NOT EXISTS (
  SELECT 1 FROM nextnumber WHERE nextnumber.branch_id = branchparameters.branch_id AND accounttype = 62
);
