CREATE TABLE loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id BIGINT ,
    branch_id INT NOT NULL,
    application_date DATE NOT NULL,
    membership_no VARCHAR(20) NOT NULL,
    scheme_id INT NOT NULL,
    loan_purpose VARCHAR(255),
    applied_loan_amount DECIMAL(15,2) NOT NULL,
    reference_no VARCHAR(50) UNIQUE,
    application_status VARCHAR(30) DEFAULT 'PENDING',

    created_by INT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP NULL
);
ALTER TABLE public.loan_applications
DROP COLUMN created_by;

ALTER TABLE public.loan_applications
ADD COLUMN created_by UUID;
ALTER TABLE public.loan_applications
ADD COLUMN loan_outstanding NUMERIC(15, 2);

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
ALTER TABLE loan_sanction_details
DROP COLUMN approved_by;

ALTER TABLE loan_sanction_details
ADD COLUMN approved_by UUID;
ALTER TABLE public.loan_sanction_details
ADD COLUMN repayment_type VARCHAR(30),
ADD COLUMN number_of_installments INTEGER,
ADD COLUMN installment_start_date DATE;

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


create table loan_schemes (
  id uuid not null default gen_random_uuid(),
  branch_id bigint not null,

  scheme_id integer not null,
  scheme_name varchar(100) not null,
  scheme_description text null,

  loan_type varchar(30) not null,

  minimum_loan_amount numeric(14,2) not null default 0.00,
  maximum_loan_amount numeric(14,2) not null default 0.00,

  minimum_period_months integer not null default 0,
  maximum_period_months integer not null default 0,

  repayment_frequency varchar(20) not null default 'MONTHLY',
  installment_calculation_method varchar(20) not null default 'EMI',

  interest_policy_id varchar(20) not null,
  interest_rate numeric(5,2) not null default 0.00,
  interest_calculation_method varchar(20) not null default 'REDUCING_BALANCE',
  interest_frequency varchar(20) not null default 'MONTHLY',
  compounding_frequency varchar(20) null,

  interest_rounding varchar(20) not null default 'NEAREST',
  minimum_interest_payable numeric(14,2) not null default 0.00,

  penal_interest_rate numeric(5,2) null default 0.00,
  penalty_grace_days integer null default 0,

  processing_fee_percent numeric(5,2) null default 0.00,
  processing_fee_min numeric(14,2) null default 0.00,
  processing_fee_max numeric(14,2) null default 0.00,

  prepayment_allowed boolean not null default true,
  prepayment_penalty_percent numeric(5,2) null default 0.00,

  collateral_required boolean not null default false,

  loan_gl_account varchar(20) not null,
  interest_income_gl_account varchar(20) not null,
  interest_receivable_gl_account varchar(20) not null,
  penal_interest_gl_account varchar(20) null,
  processing_fee_gl_account varchar(20) null,

  minimum_age integer null default 18,
  maximum_age integer null default 70,

  is_staff_only boolean not null default false,

  scheme_status varchar(20) not null default 'ACTIVE',

  created_at timestamp without time zone default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone default CURRENT_TIMESTAMP,

  constraint loan_schemes_pkey primary key (id),
  constraint loan_schemes_scheme_id_key unique (scheme_id),
  constraint loan_schemes_scheme_name_key unique (scheme_name),
  constraint loan_schemes_branch_id_fkey
    foreign key (branch_id) references branchparameters(branch_id)

) ;

INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','21101000','Gold Loan - Simple','2','1','21000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());
INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','31101000','Interest Received on Gold Loan','3','1','31000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());
INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','26101000','Interest Receivable on Gold Loan','2','1','26000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());

INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','31102000','Penal Interest on Gold Loan','3','1','31000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());
INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','32101000','Gold Loan Processing Fee','3','1','32000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());

INSERT INTO public.loan_schemes (
    branch_id,
    scheme_id,
    scheme_name,
    scheme_description,
    loan_type,
    minimum_loan_amount,
    maximum_loan_amount,
    minimum_period_months,
    maximum_period_months,
    repayment_frequency,
    installment_calculation_method,
    interest_policy_id,
    interest_rate,
    interest_calculation_method,
    interest_frequency,
    compounding_frequency,
    interest_rounding,
    minimum_interest_payable,
    penal_interest_rate,
    penalty_grace_days,
    processing_fee_percent,
    processing_fee_min,
    processing_fee_max,
    prepayment_allowed,
    prepayment_penalty_percent,
    collateral_required,
    loan_gl_account,
    interest_income_gl_account,
    interest_receivable_gl_account,
    penal_interest_gl_account,
    processing_fee_gl_account,
    minimum_age,
    maximum_age,
    is_staff_only,
    scheme_status
)
VALUES (
    23108001,
    501,
    'Gold Loan Simple',
    'Gold loan against pledged gold with simple interest calculation',
    'GOLD_LOAN',
    1000.00,
    1000000.00,
    1,
    12,
    'MONTHLY',
    'EMI',
    'GL_SIMPLE',
    12.00,
    'SIMPLE',
    'MONTHLY',
    NULL,
    'NEAREST',
    0.00,
    2.00,
    5,
    1.00,
    100.00,
    5000.00,
    TRUE,
    1.00,
    TRUE,
    '21101000',
    '31101000',
    '26101000',
    '31102000',
    '32101000',
    18,
    70,
    FALSE,
    'ACTIVE'
);

INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','21102000','FD Loan Account','2','1','21000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());

INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','31103000','Interest Received on FD Loan','3','1','31000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());

INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','26102000','Interest Receivable on FD Loan','2','1','26000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());

INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','31104000','Penal Interest on FD Loan','3','1','31000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());

INSERT INTO public.chart_of_accounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate, serial_no)
VALUES
('23108001','32102000','FD Loan Processing Fee','3','1','32000000','0.00','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,gen_random_uuid());

INSERT INTO public.loan_schemes (
    branch_id,
    scheme_id,
    scheme_name,
    scheme_description,
    loan_type,
    minimum_loan_amount,
    maximum_loan_amount,
    minimum_period_months,
    maximum_period_months,
    repayment_frequency,
    installment_calculation_method,
    interest_policy_id,
    interest_rate,
    interest_calculation_method,
    interest_frequency,
    compounding_frequency,
    interest_rounding,
    minimum_interest_payable,
    penal_interest_rate,
    penalty_grace_days,
    processing_fee_percent,
    processing_fee_min,
    processing_fee_max,
    prepayment_allowed,
    prepayment_penalty_percent,
    collateral_required,
    loan_gl_account,
    interest_income_gl_account,
    interest_receivable_gl_account,
    penal_interest_gl_account,
    processing_fee_gl_account,
    minimum_age,
    maximum_age,
    is_staff_only,
    scheme_status
)
VALUES (
    23108001,
    502,
    'FD Loan',
    'Loan against Fixed Deposit with simple interest',
    'FD_LOAN',
    5000.00,
    5000000.00,
    1,
    60,
    'MONTHLY',
    'EMI',
    'FD_SIMPLE',
    10.00,
    'SIMPLE',
    'MONTHLY',
    NULL,
    'NEAREST',
    0.00,
    2.00,
    5,
    0.50,
    50.00,
    2000.00,
    TRUE,
    0.50,
    TRUE,
    '21102000',
    '31103000',
    '26102000',
    '31104000',
    '32102000',
    18,
    70,
    FALSE,
    'ACTIVE'
);