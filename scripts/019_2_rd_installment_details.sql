CREATE TABLE rd_installment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    branch_id BIGINT NOT NULL,
    
    accountnumber NUMERIC(16,0) NOT NULL
        REFERENCES recurring_deposit_details(accountnumber)
        ON DELETE CASCADE,
    
    installment_number INTEGER NOT NULL,
    installment_amount NUMERIC(14,2) NOT NULL,
    installment_due_date DATE,
    installment_paid_date DATE,
    installment_voucher_no NUMERIC,
    penalty_collected NUMERIC(14,2) DEFAULT 0.00,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);