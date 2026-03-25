CREATE TABLE investment_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT,

    account_number VARCHAR(50) NOT NULL,
    investment_head VARCHAR(100),

    description TEXT,
    amount_invested DECIMAL(15,2),
    ledger_balance DECIMAL(15,2),

    date_of_investment DATE,

    rate_of_interest DECIMAL(5,2),
    interest_receivable DECIMAL(15,2),

    reference_number VARCHAR(100),
    status VARCHAR(50),

    created_by VARCHAR(100),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    authorised_by VARCHAR(100),
    authorised_date TIMESTAMP 
);



CREATE TABLE investment_transactions (
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
