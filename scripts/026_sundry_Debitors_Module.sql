INSERT INTO chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger,parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES(23108001, 25010000, 'Debitors for Members', 1, B'1',25000000, 0, B'1', now(), now());

INSERT INTO chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger,parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES(23108001, 25020000, 'Debitors for Other Institutions', 1, B'1',25000000, 0, B'1', now(), now());


CREATE TABLE sundry_debitors (
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
    account_status VARCHAR(20),
    account_closed_date DATE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Create sundry_transactions table
CREATE TABLE IF NOT EXISTS sundry_debitors_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id BIGINT NOT NULL,
  account_number VARCHAR(50) NOT NULL,
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
