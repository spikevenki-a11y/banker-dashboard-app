CREATE TABLE loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id BIGINT ,
    branch_id INT NOT NULL,
    application_date DATE NOT NULL,
    membership_no VARCHAR(20) NOT NULL,
    loan_product_id INT NOT NULL,
    loan_purpose VARCHAR(255),
    applied_loan_amount DECIMAL(15,2) NOT NULL,
    reference_no VARCHAR(50) UNIQUE,
    application_status VARCHAR(30) DEFAULT 'PENDING',

    created_by INT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP NULL
);

CREATE TABLE loan_sanction_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sanction_id BIGINT ,
    loan_application_id BIGINT NOT NULL,
    sanctioned_amount DECIMAL(15,2),
    sanction_date DATE,
    interest_rate DECIMAL(5,2),
    loan_tenure_days INT,
    loan_tenure_months INT,
    payment_amount DECIMAL(15,2),
    moratorium_period INT DEFAULT 0,

    sanction_status VARCHAR(30),
    approved_by INT,
    remarks TEXT,

    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    FOREIGN KEY (loan_application_id) 
    REFERENCES loan_applications(loan_application_id)
);

CREATE TABLE loan_security_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id BIGINT ,
    loan_application_id BIGINT NOT NULL,
    security_type VARCHAR(100),
    security_description TEXT,
    security_value DECIMAL(15,2),
    document_reference VARCHAR(100),

    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    FOREIGN KEY (loan_application_id)
    REFERENCES loan_applications(loan_application_id)
);


CREATE TABLE loan_repayment_schedule_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id BIGINT ,
    loan_account_no VARCHAR(30) NOT NULL,
    installment_no INT,
    due_date DATE,
    principal_amount DECIMAL(15,2),
    interest_amount DECIMAL(15,2),
    total_installment DECIMAL(15,2),
    balance_principal DECIMAL(15,2),
    payment_status VARCHAR(20) DEFAULT 'PENDING',

    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE TABLE loan_transaction_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    branch_id BIGINT NOT NULL REFERENCES branchparameters(branch_id),
    voucher_no INTEGER,
    loan_account_no VARCHAR(30) NOT NULL,
    transaction_type VARCHAR(30), 
    
    credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    debit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_after_transaction DECIMAL(15,2),

    reference_no VARCHAR(50),
    remarks TEXT,

    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
