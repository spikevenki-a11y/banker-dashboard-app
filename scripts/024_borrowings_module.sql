CREATE TABLE borrowing_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_number VARCHAR(50) NOT NULL,
    borrowing_agency VARCHAR(100),
    branch_id INT,

    type_of_borrowing VARCHAR(50) NOT NULL, --('cash_credit', 'loan')

    description TEXT,
    amount_sanctioned DECIMAL(15,2),
    ledger_balance DECIMAL(15,2),

    date_of_sanction DATE,
    purpose VARCHAR(255),

    rate_of_interest DECIMAL(5,2),
    interest_payable DECIMAL(15,2),

    moratorium_interest BOOLEAN,  -- yes/no

    number_of_installments INT,
    installment_months INT,
    moratorium_months INT,

    installment_amount DECIMAL(15,2),
    installment_start_date DATE,

    repayment_type VARCHAR(50),
    repayment_start_date DATE,

    reference_number VARCHAR(100),
    status VARCHAR(50),

    created_by VARCHAR(100),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    authorised_by VARCHAR(100),
    authorised_date TIMESTAMP 
);



CREATE TABLE borrowing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    branch_id INT NOT NULL,
    transaction_date DATE NOT NULL,
    voucher_no VARCHAR(50),

    transaction_type VARCHAR(50) NOT NULL, --('drawal', 'repayment')

    account_number VARCHAR(50) NOT NULL,

    -- Main amounts
    drawal_amount DECIMAL(15,2) DEFAULT 0,
    repayment_amount DECIMAL(15,2) DEFAULT 0,

    -- Repayment breakup
    charge_amount DECIMAL(15,2) DEFAULT 0,
    iod_amount DECIMAL(15,2) DEFAULT 0,
    penal_interest_amount DECIMAL(15,2) DEFAULT 0,
    interest_amount DECIMAL(15,2) DEFAULT 0,
    ledger_balance_amount DECIMAL(15,2),

    last_interest_paid_date DATE,

    status VARCHAR(50),

    created_by VARCHAR(100),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    authorised_by VARCHAR(100),
    authorised_date TIMESTAMP
);
