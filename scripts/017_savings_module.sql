create table savings_interest_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id bigint not null references branchparameters(branch_id),
  interest_code varchar(20) unique not null,
  interest_description text,
  effective_from date not null,
  interest_rate numeric(5, 2) not null default 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table savings_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id bigint not null references branchparameters(branch_id),
  scheme_id integer unique not null,
  scheme_name varchar(100) not null unique,
  scheme_description text,
  min_balance numeric(12, 2) not null default 0.00,
  interest_code varchar(20) not null references savings_interest_codes(interest_code),
  interest_rate numeric(5, 2) not null default 0.00,
  minimum_deposit numeric(12, 2) not null default 0.00,
  maximum_deposit numeric(12, 2) not null default 0.00,
  interest_frequency varchar(20) not null default 'QUARTERLY',
  interest_calculation_method varchar(20) not null default 'DAILY_BALANCE',
  interest_rounding varchar(20) not null default 'NEAREST',
  minimum_balance_for_interest numeric(12, 2) not null default 0.00,
  minimum_interest_payable numeric(12, 2) not null default 0.00,
  savings_gl_account varchar(20) not null,
  interest_payable_gl_account varchar(20) not null,
  interest_paid_gl_account varchar(20) not null,
  last_interest_calculated_date date,
  minimum_age integer not null default 0,
  maximum_age integer not null default 0,
  is_staff_only boolean not null default false,
  scheme_status varchar(20) not null default 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO savings_schemes (branch_id,scheme_id,scheme_name,scheme_description,interest_code,savings_gl_account)
VALUES('2310801','10001','Savings Deposit Individual','Savings Deposit Individual','1001','12101000');

create table savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id bigint not null references branchparameters(branch_id),
  scheme_id integer not null references savings_schemes(scheme_id),
  opening_date date not null,
  membership_no integer not null references memberships(membership_no),
  account_number varchar(20) unique not null,
  available_balance numeric(12, 2) not null default 0.00,
  clear_balance numeric(12, 2) not null default 0.00,
  unclear_balance numeric(12, 2) not null default 0.00,
  interest_rate numeric(5, 2) not null default 0.00,
  last_interest_calculated_date date,
  account_status varchar(20) not null default 'ACTIVE',
  account_closed_date date,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT into savings_interest_codes (branch_id, interest_code, interest_description, effective_from, interest_rate)
VALUES
(2310801, '1001', 'Individual Savings Interest Rate', '2024-04-01', 3.50),
(2310801, '1002', 'Premium Savings Interest Rate', '2024-04-01', 4.00);


INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12100000', 'Savings and Current Accounts', '1', '1', '12000000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12101000', 'Savings Deposit Individual', '1', '1', '12100000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12102000', 'SHG Saving Deposits', '1', '1', '12100000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '12103000', 'JLG Saving Deposits', '1', '1', '12100000', '0.00', '1');



INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41100000', 'Interest paid on savings accounts', '1', '1', '41000000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41101000', 'Interest paid on Savings Deposit Individual', '1', '1', '41010000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41102000', 'Interest paid on SHG Saving Deposits', '1', '1', '41010000', '0.00', '1');
INSERT INTO "public"."chart_of_accounts" ("branch_id", "accountcode", "accountname", "accounttypecode", "isledger", "parentaccountcode", "accountbalance", "isactive") VALUES ('2310801', '41103000', 'Interest paid on JLG Saving Deposits', '1', '1', '41010000', '0.00', '1');