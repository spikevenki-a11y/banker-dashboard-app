CREATE TABLE provisions_master (
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


CREATE TABLE provisions_transactions (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger,parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES(23108001, 17010000, 'Provision for NPAs – Sub-Standard Assets', 1, B'1',17000000, 0, B'0', now(), now()),
(23108001, 17020000, 'Provision for NPAs – Doubtful Assets', 1, B'1',17000000, 0, B'0', now(), now()),
(23108001, 17030000, 'Provision for NPAs – Loss Assets', 1, B'1',17000000, 0, B'0', now(), now()),
(23108001, 17040000, 'Provision for Overdue Interest Reserve', 1, B'1',17000000, 0, B'1', now(), now()),
(23108001, 17050000, 'Provision for overdue interest on investments', 1, B'1',17000000, 0, B'1', now(), now()),
(23108001, 17060000, 'Provision for outstanding Expenses(Audit Fees)', 1, B'1',17000000, 0, B'1', now(), now()),
(23108001, 17070000, 'Provision for outstanding Expenses(Salaries/PF/Honarorium)', 1, B'1',17000000, 0, B'1', now(), now()),
(23108001, 17080000, 'Provision for Sundry Debtors (Annexure-XVI)', 1, B'1',17000000, 0, B'1', now(), now()),
(23108001, 17100000, 'Provision for Depreciation in the value of Investments(Annexure-VI)', 1, B'1',17000000, 0, B'1', now(), now()),
(23108001, 17110000, 'Provision for Depreciation in the value of Fixed Assets', 1, B'1',17000000, ０, B'１', now(), now()),
(23108001, 17120000, 'Other Provisions(Annexure-VIII)', １, B'１',17000000, ０, B'１', now(), now());
