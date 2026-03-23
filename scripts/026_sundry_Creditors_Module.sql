INSERT INTO chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger,parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES(23108001, 14010000, 'Creditors for Members', 1, B'1',14000000, 0, B'0', now(), now());

INSERT INTO chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger,parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES(23108001, 14020000, 'Creditors for Other Institutions', 1, B'1',14000000, 0, B'1', now(), now());


CREATE TABLE sundry_creditors (
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