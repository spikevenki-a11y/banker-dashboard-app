CREATE TABLE ref_transaction_type (
    transaction_id serial PRIMARY KEY,
    transaction_name varchar(255) NOT NULL UNIQUE
);

INSERT INTO ref_transaction_type (transaction_name) VALUES
-- Share
('Share Deposit'), ('Share Withdrawal'), ('Share Adjustment'), ('Share Closure'),

-- Savings
('Savings Deposit'), ('Savings Withdrawal'), ('Savings Adjustment'), ('Savings Interest'), ('Savings Closure'),

-- Current
('Current Account Deposit'), ('Current Account Withdrawal'), ('Current Account Adjustment'), ('Current Account Closure'),

-- Thrift
('Thrift Deposit'), ('Thrift Withdrawal'), ('Thrift Interest'), ('Thrift Closure'),

-- Term
('Term Deposit'), ('Term Withdrawal'), ('Term Interest'), ('Term Adjustment'), ('Term Closure'),

-- Loan
('Loan Disbursement'), ('Loan Repayment'), ('Loan Adjustment'), ('Loan Interest'), ('Loan Closure'),

-- Sundry
('Sundry Deposit'), ('Sundry Withdrawal'), ('Sundry Adjustment'), ('Sundry Closure'),

-- Borrowing
('Borrowing Receipt'), ('Borrowing Repayment'), ('Borrowing Adjustment'), ('Borrowing Interest'), ('Borrowing Closure'),

-- Investment
('Investment Purchase'), ('Investment Sale'), ('Investment Adjustment'), ('Investment Interest'), ('Investment Closure'),

-- fas
('FAS Deposit'), ('FAS Withdrawal'), ('FAS Adjustment'), ('FAS Closure'),

-- Funds Transfer
('Funds Transfer In'), ('Funds Transfer Out'), ('Funds Transfer Adjustment'), ('Funds Transfer Reversal'),

-- Provisions
('Provisioning Charge'), ('Provisioning Reversal'), ('Provisioning Adjustment'),

-- Grands
('Grant Disbursement'), ('Grant Repayment'), ('Grant Adjustment'), ('Grant Closure')

-- Reserve
('Reserve Allocation'), ('Reserve Release'),

-- Subsidies
('Subsidy Received'), ('Subsidy Reversal'), ('Subsidy Adjustment'),

-- other liabilities
('Other Liability Deposit'), ('Other Liability Withdrawal'), ('Other Liability Adjustment'),

--cash management
('Cash In'), ('Cash Out'), ('Cash Reversal'),

-- bank and cash transactions
('Bank Deposit'), ('Bank Withdrawal'), ('Bank Transfer'),

-- assets
('Asset Purchase'), ('Asset Sale'), ('Asset Depreciation'), ('Asset Disposal'),

-- other assets
('Other Asset Deposit'), ('Other Asset Withdrawal'), ('Other Asset Adjustment');





create table ref_account_status (
    account_status_id serial primary key,
    account_status_name varchar(255) not null unique
);

INSERT INTO ref_account_status (account_status_name) VALUES
('Active'),
('Freeze'),
('Inactive'),
('Dormant'),
('Maturity'),
('Partial Debit Freeze'),
('Partial Credit Freeze'),
('Lien'),
('Closed'),
('Premature Closure');