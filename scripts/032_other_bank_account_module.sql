CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT,

    account_number VARCHAR(50) NOT NULL,
    account_head VARCHAR(100),

    description TEXT,
    account_balance DECIMAL(15,2),
    account_clear_balance DECIMAL(15,2),
    account_unclear_balance DECIMAL(15,2),

    date_of_account_opening DATE,

    rate_of_interest DECIMAL(5,2),
    interest_receivable DECIMAL(15,2),

    reference_number VARCHAR(100),
    status VARCHAR(50),

    created_by VARCHAR(100),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    authorised_by VARCHAR(100),
    authorised_date TIMESTAMP 
);



CREATE TABLE bank_accounts_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    branch_id INT NOT NULL,
    transaction_date DATE NOT NULL,
    voucher_no VARCHAR(50),
    batch_id INT,

    transaction_type VARCHAR(50) NOT NULL, 

    account_number VARCHAR(50) NOT NULL,

    -- Main amounts
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,

    interest_amount DECIMAL(15,2) DEFAULT 0,
    ledger_balance_amount DECIMAL(15,2),

    status VARCHAR(50),

    created_by VARCHAR(100),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    authorised_by VARCHAR(100),
    authorised_date TIMESTAMP
);



INSERT INTO chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger,parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES(23108001, 23200000, 'Bank Balances', 1, B'1',23000000, 0, B'1', now(), now()),
(23108001, 23201000, 'Current Account with DCCB/SCB', 1, B'1',23200000, 0, B'1', now(), now()),
(23108001, 23202000, 'Savings Account with DCCB/SCB', 1, B'1',23200000, 0, B'1', now(), now()),
(23108001, 23203000, 'Current Account with other banks', 1, B'1',23200000, 0, B'1', now(), now()),
(23108001, 23204000, 'Savings Account with other banks', 1, B'1',23200000, 0, B'1', now(), now());