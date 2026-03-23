-- Income Module Tables

-- Income Accounts Table
CREATE TABLE IF NOT EXISTS income_accounts (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    ledger_account_id INTEGER NOT NULL REFERENCES generalledgeraccounts(id),
    account_code VARCHAR(50) NOT NULL UNIQUE,
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    branch_code VARCHAR(50)
);

-- Income Transactions Table
CREATE TABLE IF NOT EXISTS income_transactions (
    id SERIAL PRIMARY KEY,
    income_account_id INTEGER NOT NULL REFERENCES income_accounts(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount DECIMAL(15, 2) NOT NULL,
    running_balance DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    reference_no VARCHAR(100),
    cheque_no VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    branch_code VARCHAR(50),
    FOREIGN KEY (branch_code) REFERENCES branch_code_details(branch_code)
);

-- Create indexes for better performance
CREATE INDEX idx_income_accounts_ledger ON income_accounts(ledger_account_id);
CREATE INDEX idx_income_accounts_code ON income_accounts(account_code);
CREATE INDEX idx_income_accounts_branch ON income_accounts(branch_code);
CREATE INDEX idx_income_transactions_account ON income_transactions(income_account_id);
CREATE INDEX idx_income_transactions_date ON income_transactions(transaction_date);
CREATE INDEX idx_income_transactions_branch ON income_transactions(branch_code);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_income_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER income_accounts_timestamp
BEFORE UPDATE ON income_accounts
FOR EACH ROW
EXECUTE FUNCTION update_income_accounts_timestamp();
