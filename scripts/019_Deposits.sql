CREATE TABLE deposit_account (
    id uuid PRIMARY KEY,
    branch_id bigint NOT NULL,
    schemeid numeric(5) NOT NULL,
    deposittype char(1) NOT NULL CHECK (deposittype IN ('T','R','P')),

    accountnumber numeric(14) NOT NULL UNIQUE,
    membership_no numeric(12) NOT NULL,

    valuedate date,
    accountopendate date NOT NULL,

    clearbalance numeric(14,2) DEFAULT 0,
    unclearbalance numeric(14,2) DEFAULT 0,

    rateofinterest numeric(5,2) DEFAULT 0,
    interestpaidamount numeric(14,2) DEFAULT 0,
    interestdueforpayment numeric(14,2) DEFAULT 0,

    tdsapplicable char(1) DEFAULT 'N',
    tdsrate numeric(5,2) DEFAULT 0,
    tdsrecovered numeric(14,2) DEFAULT 0,

    accountstatus integer,
    accountclosedate date,

    createdby numeric(10),
    createddate date,
    authorisedby numeric(10),
    authoriseddate date
);

CREATE TABLE term_deposit_details (
    id uuid PRIMARY KEY,
    accountnumber numeric(14) NOT NULL UNIQUE,

    depositamount numeric(14,2) NOT NULL,
    periodmonths integer DEFAULT 0,
    perioddays integer DEFAULT 0,

    maturitydate date,
    maturityamount numeric(14,2),

    autorenewalflag char(1) DEFAULT 'N',
    periodmonthsforautorenewal integer DEFAULT 0,
    perioddaysforautorenewal integer DEFAULT 0,

    renewalwithinterest char(1) DEFAULT 'N',
    penalrate numeric(5,2) DEFAULT 0,

    CONSTRAINT fk_td_account
        FOREIGN KEY (accountnumber)
        REFERENCES deposit_account(accountnumber)
        ON DELETE CASCADE
);

CREATE TABLE recurring_deposit_details (
    id uuid PRIMARY KEY,
    accountnumber numeric(14) NOT NULL UNIQUE,

    installment_amount numeric(14,2) NOT NULL,
    installment_frequency varchar(10) NOT NULL,  -- MONTHLY, WEEKLY

    numberofinstallments integer NOT NULL,
    numberofinstalmentspaid integer DEFAULT 0,

    nextinstalmentdate date,
    delayedinstallments integer DEFAULT 0,
    penalrate numeric(5,2) DEFAULT 0,

    maturitydate date,
    maturityamount numeric(14,2),

    CONSTRAINT fk_rd_account
        FOREIGN KEY (accountnumber)
        REFERENCES deposit_account(accountnumber)
        ON DELETE CASCADE
);

CREATE TABLE pigmy_deposit_details (
    id uuid PRIMARY KEY,
    accountnumber numeric(14) NOT NULL UNIQUE,

    collection_frequency varchar(10),  -- DAILY

    agent_id bigint,
    minimum_daily_amount numeric(14,2),

    last_collection_date date,

    CONSTRAINT fk_pigmy_account
        FOREIGN KEY (accountnumber)
        REFERENCES deposit_account(accountnumber)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS deposit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL 
      REFERENCES deposit_account(id),

  transaction_date DATE NOT NULL,
  value_date DATE NOT NULL,

  branch_id BIGINT NOT NULL 
      REFERENCES branchparameters(branch_id),

  transaction_type VARCHAR(30) NOT NULL,  
  -- OPENING, INSTALLMENT, DEPOSIT, WITHDRAWAL,
  -- INTEREST_ACCRUAL, INTEREST_PAYMENT,
  -- PENALTY, TDS, MATURITY_PAYMENT, CLOSURE

  narration TEXT,

  voucher_type VARCHAR(20),
  voucher_no INTEGER,
  gl_batch_id BIGINT,

  credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  debit_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,

  running_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,

  status VARCHAR(20) NOT NULL, -- ACTIVE, REVERSED, CANCELLED

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE deposit_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  branch_id BIGINT NOT NULL 
      REFERENCES branchparameters(branch_id),

  scheme_id INTEGER UNIQUE NOT NULL,
  scheme_name VARCHAR(100) NOT NULL UNIQUE,
  scheme_description TEXT,

  deposit_type VARCHAR(20) NOT NULL, 
  -- TERM, RECURRING, PIGMY

  -- Amount Rules
  minimum_deposit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  maximum_deposit NUMERIC(14,2) NOT NULL DEFAULT 0.00,

  -- Period Rules (FD & RD)
  minimum_period_months INTEGER DEFAULT 0,
  maximum_period_months INTEGER DEFAULT 0,
  minimum_period_days INTEGER DEFAULT 0,
  maximum_period_days INTEGER DEFAULT 0,

  -- RD Specific
  installment_frequency VARCHAR(20),  -- MONTHLY, WEEKLY
  minimum_installment_amount NUMERIC(14,2) DEFAULT 0.00,
  maximum_installment_amount NUMERIC(14,2) DEFAULT 0.00,
  penal_rate NUMERIC(5,2) DEFAULT 0.00,

  -- Pigmy Specific
  collection_frequency VARCHAR(20), -- DAILY
  agent_commission_percent NUMERIC(5,2) DEFAULT 0.00,

  -- Interest Configuration
  interest_code VARCHAR(20) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  interest_frequency VARCHAR(20) NOT NULL DEFAULT 'ON_MATURITY',
  -- MONTHLY, QUARTERLY, ON_MATURITY

  interest_calculation_method VARCHAR(20) NOT NULL DEFAULT 'SIMPLE',
  -- SIMPLE, COMPOUND, DAILY_PRODUCT

  compounding_frequency VARCHAR(20),
  interest_rounding VARCHAR(20) DEFAULT 'NEAREST',

  minimum_interest_payable NUMERIC(14,2) DEFAULT 0.00,

  -- Premature Closure
  premature_closure_allowed BOOLEAN NOT NULL DEFAULT true,
  premature_penal_rate NUMERIC(5,2) DEFAULT 0.00,

  -- Auto Renewal (FD)
  auto_renewal_allowed BOOLEAN NOT NULL DEFAULT false,

  -- TDS
  tds_applicable BOOLEAN NOT NULL DEFAULT false,

  -- GL Mapping
  deposit_gl_account VARCHAR(20) NOT NULL,
  interest_payable_gl_account VARCHAR(20) NOT NULL,
  interest_expense_gl_account VARCHAR(20) NOT NULL,
  penal_interest_gl_account VARCHAR(20),

  -- Eligibility
  minimum_age INTEGER DEFAULT 0,
  maximum_age INTEGER DEFAULT 0,
  is_staff_only BOOLEAN NOT NULL DEFAULT false,

  scheme_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12200000', 'Term Deposits', '1', '1', '12000000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12201000', 'Term Deposit Non Cummulative', '1', '1', '12200000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12202000', 'Term Deposit Cummulative', '1', '1', '12200000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12203000', 'Locker Deposit', '1', '1', '12200000', '0.00', '1');


INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12300000', 'Recurring Deposits', '1', '1', '12000000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12301000', 'Recurring Deposit Non Cummulative', '1', '1', '12300000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12302000', 'Recurring Deposit Cummulative', '1', '1', '12300000', '0.00', '1');


INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41200000', 'Interest paid on Term Deposits', '1', '1', '41000000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41201000', 'Interest paid on Term Deposit Non Cummulative', '1', '1', '41200000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41202000', 'Interest paid on Term Deposit Cummulative', '1', '1', '41200000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41203000', 'Interest paid on JLG Locker Deposit', '1', '1', '41200000', '0.00', '1');


INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41300000', 'Interest paid on Recurring Deposits', '1', '1', '41000000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41301000', 'Interest paid on Recurring Deposit Non Cummulative', '1', '1', '41300000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41302000', 'Interest paid on Recurring Deposit Cummulative', '1', '1', '41300000', '0.00', '1');

