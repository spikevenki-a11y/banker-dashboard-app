-- Sundry Creditor Transactions Table
CREATE TABLE IF NOT EXISTS sundry_creditor_transactions (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,
    voucher_type VARCHAR(20) NOT NULL,
    description TEXT,
    debit_amount NUMERIC(18,2) DEFAULT 0,
    credit_amount NUMERIC(18,2) DEFAULT 0,
    running_balance NUMERIC(18,2) DEFAULT 0,
    reference_no VARCHAR(50),
    gl_batch_id INTEGER,
    voucher_no INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sundry_creditor_txn_branch ON sundry_creditor_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_sundry_creditor_txn_account ON sundry_creditor_transactions(account_number);
CREATE INDEX IF NOT EXISTS idx_sundry_creditor_txn_date ON sundry_creditor_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sundry_creditor_txn_batch ON sundry_creditor_transactions(gl_batch_id);

-- Add updated_at column to sundry_creditors if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sundry_creditors' AND column_name = 'updated_at') THEN
        ALTER TABLE sundry_creditors ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
