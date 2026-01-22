create table public.generalledgeraccounts (
  branch_id bigint not null,
  accountcode bigint not null,
  accountname varchar(200) not null,
  accounttypecode int not null,
  isledger bit not null default b'0',
  parentaccountcode bigint,
  accountbalance decimal(18,2) not null default 0,
  isactive bit not null default b'1',
  createddate timestamp with time zone,
  modifieddate timestamp with time zone
) tablespace pg_default;

ALTER TABLE gl_batches
 ADD CONSTRAINT uq_gl_batches_branch_id_batch_id
  UNIQUE (branch_id, batch_id);
-- =====================================
-- Erode Branch Chart of Accounts
-- Branch ID: 23080102
-- =====================================

-- -----------------------------
-- 1️⃣ Liabilities (Parent + Children)
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 10000000, 'Liabilities', 1, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 11000000, 'Share Capital',        1, b'1', 10000000, 0, b'1', now(), now()),
(23080102, 12000000, 'Deposits',             1, b'1', 10000000, 0, b'1', now(), now()),
(23080102, 13000000, 'Borrowings',           1, b'1', 10000000, 0, b'1', now(), now()),
(23080102, 14000000, 'Sundry Creditors',     1, b'1', 10000000, 0, b'1', now(), now()),
(23080102, 15000000, 'Reserves and Funds',   1, b'1', 10000000, 0, b'1', now(), now()),
(23080102, 16000000, 'Grants and Subsidies', 1, b'1', 10000000, 0, b'1', now(), now()),
(23080102, 17000000, 'Provisions',           1, b'1', 10000000, 0, b'1', now(), now()),
(23080102, 18000000, 'Other Liabilities',    1, b'1', 10000000, 0, b'1', now(), now());

-- -----------------------------
-- 2️⃣ Assets (Parent + Children)
-- Ordered: Loans & Advances, Investments, Cash & Bank, Fixed Assets, Sundry Debtors, Other Assets
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 20000000, 'Assets', 2, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 21000000, 'Loans and Advances',     2, b'1', 20000000, 0, b'1', now(), now()),
(23080102, 22000000, 'Investments',            2, b'1', 20000000, 0, b'1', now(), now()),
(23080102, 23000000, 'Cash and Bank Balances', 2, b'1', 20000000, 0, b'1', now(), now()),
(23080102, 24000000, 'Fixed Assets',           2, b'1', 20000000, 0, b'1', now(), now()),
(23080102, 25000000, 'Sundry Debtors',         2, b'1', 20000000, 0, b'1', now(), now()),
(23080102, 26000000, 'Other Assets',           2, b'1', 20000000, 0, b'1', now(), now());

-- -----------------------------
-- 3️⃣ Income (Parent + Children)
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 30000000, 'Income', 3, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 31000000, 'Interest Received',  3, b'1', 30000000, 0, b'1', now(), now()),
(23080102, 32000000, 'Other Incomes',      3, b'1', 30000000, 0, b'1', now(), now()),
(23080102, 33000000, 'Provision Released', 3, b'1', 30000000, 0, b'1', now(), now());

-- -----------------------------
-- 4️⃣ Expenses (Parent + Children)
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 40000000, 'Expenses', 4, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 41000000, 'Interest Paid',        4, b'1', 40000000, 0, b'1', now(), now()),
(23080102, 42000000, 'Salary Expenses',      4, b'1', 40000000, 0, b'1', now(), now()),
(23080102, 43000000, 'Other Expenses',       4, b'1', 40000000, 0, b'1', now(), now()),
(23080102, 44000000, 'Provision Created',    4, b'1', 40000000, 0, b'1', now(), now()),
(23080102, 45000000, 'Asset Depreciations',  4, b'1', 40000000, 0, b'1', now(), now());

-- -----------------------------
-- 5️⃣ Profit & Loss (Parent + Child)
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 50000000, 'Profit & Loss Account', 5, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080102, 51000000, 'Net Profit/Loss', 5, b'1', 50000000, 0, b'1', now(), now());


-- =====================================
-- Erode Branch Chart of Accounts
-- Branch ID: 23080101
-- =====================================

-- -----------------------------
-- 1️⃣ Liabilities (Parent + Children)
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 10000000, 'Liabilities', 1, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 11000000, 'Share Capital',        1, b'1', 10000000, 0, b'1', now(), now()),
(23080101, 12000000, 'Deposits',             1, b'1', 10000000, 0, b'1', now(), now()),
(23080101, 13000000, 'Borrowings',           1, b'1', 10000000, 0, b'1', now(), now()),
(23080101, 14000000, 'Sundry Creditors',     1, b'1', 10000000, 0, b'1', now(), now()),
(23080101, 15000000, 'Reserves and Funds',   1, b'1', 10000000, 0, b'1', now(), now()),
(23080101, 16000000, 'Grants and Subsidies', 1, b'1', 10000000, 0, b'1', now(), now()),
(23080101, 17000000, 'Provisions',           1, b'1', 10000000, 0, b'1', now(), now()),
(23080101, 18000000, 'Other Liabilities',    1, b'1', 10000000, 0, b'1', now(), now());

-- -----------------------------
-- 2️⃣ Assets (Parent + Children)
-- Ordered: Loans & Advances, Investments, Cash & Bank, Fixed Assets, Sundry Debtors, Other Assets
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 20000000, 'Assets', 2, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 21000000, 'Loans and Advances',     2, b'1', 20000000, 0, b'1', now(), now()),
(23080101, 22000000, 'Investments',            2, b'1', 20000000, 0, b'1', now(), now()),
(23080101, 23000000, 'Cash and Bank Balances', 2, b'1', 20000000, 0, b'1', now(), now()),
(23080101, 24000000, 'Fixed Assets',           2, b'1', 20000000, 0, b'1', now(), now()),
(23080101, 25000000, 'Sundry Debtors',         2, b'1', 20000000, 0, b'1', now(), now()),
(23080101, 26000000, 'Other Assets',           2, b'1', 20000000, 0, b'1', now(), now());

-- -----------------------------
-- 3️⃣ Income (Parent + Children)
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 30000000, 'Income', 3, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 31000000, 'Interest Received',  3, b'1', 30000000, 0, b'1', now(), now()),
(23080101, 32000000, 'Other Incomes',      3, b'1', 30000000, 0, b'1', now(), now()),
(23080101, 33000000, 'Provision Released', 3, b'1', 30000000, 0, b'1', now(), now());

-- -----------------------------
-- 4️⃣ Expenses (Parent + Children)
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 40000000, 'Expenses', 4, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 41000000, 'Interest Paid',        4, b'1', 40000000, 0, b'1', now(), now()),
(23080101, 42000000, 'Salary Expenses',      4, b'1', 40000000, 0, b'1', now(), now()),
(23080101, 43000000, 'Other Expenses',       4, b'1', 40000000, 0, b'1', now(), now()),
(23080101, 44000000, 'Provision Created',    4, b'1', 40000000, 0, b'1', now(), now()),
(23080101, 45000000, 'Asset Depreciations',  4, b'1', 40000000, 0, b'1', now(), now());

-- -----------------------------
-- 5️⃣ Profit & Loss (Parent + Child)
-- -----------------------------
INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 50000000, 'Profit & Loss Account', 5, b'1', 0, 0, b'1', now(), now());

INSERT INTO public.generalledgeraccounts
(branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
VALUES
(23080101, 51000000, 'Net Profit/Loss', 5, b'1', 50000000, 0, b'1', now(), now());
