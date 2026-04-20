-- =============================================================
-- Day End Migration Script
-- Project : NextZen Banking Dashboard
-- Created : 2026-04-08
-- Tables  : dayend_log, dayend_step_log,
--           savings_interest_accrual, deposit_interest_accrual,
--           loan_interest_accrual
-- Alters  : savings_accounts, deposit_account, loan_applications
-- =============================================================


-- -------------------------------------------------------------
-- 1. dayend_log
--    One row per day-end run. Prevents double-close and gives
--    a top-level audit trail.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dayend_log (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           BIGINT        NOT NULL
                        REFERENCES branchparameters(branch_id),
  business_date       DATE          NOT NULL,
  next_business_date  DATE,
  status              VARCHAR(20)   NOT NULL DEFAULT 'INITIATED'
                        CHECK (status IN ('INITIATED','IN_PROGRESS','COMPLETED','FAILED')),
  initiated_by        UUID          NOT NULL
                        REFERENCES users(id),
  initiated_at        TIMESTAMP     NOT NULL DEFAULT now(),
  completed_at        TIMESTAMP,
  error_message       TEXT,
  created_at          TIMESTAMP     NOT NULL DEFAULT now(),

  -- Prevent closing the same branch date twice
  CONSTRAINT uq_dayend_branch_date UNIQUE (branch_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_dayend_log_branch_date
  ON dayend_log (branch_id, business_date);


-- -------------------------------------------------------------
-- 2. dayend_step_log
--    One row per step per run. Lets you resume from a failed
--    step without re-running completed ones.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dayend_step_log (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  dayend_id           UUID          NOT NULL
                        REFERENCES dayend_log(id) ON DELETE CASCADE,
  step_name           VARCHAR(50)   NOT NULL
                        CHECK (step_name IN (
                          'SAVINGS_ACCRUAL',
                          'TD_ACCRUAL',
                          'RD_PENALTY',
                          'LOAN_ACCRUAL',
                          'BORROWING_ACCRUAL',
                          'MATURITY_CHECK',
                          'TRIAL_BALANCE',
                          'DATE_ADVANCE'
                        )),
  status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','RUNNING','DONE','FAILED')),
  records_processed   INTEGER       NOT NULL DEFAULT 0,
  started_at          TIMESTAMP,
  completed_at        TIMESTAMP,
  error_message       TEXT,

  CONSTRAINT uq_dayend_step UNIQUE (dayend_id, step_name)
);

CREATE INDEX IF NOT EXISTS idx_dayend_step_dayend_id
  ON dayend_step_log (dayend_id);


-- -------------------------------------------------------------
-- 3. savings_interest_accrual
--    Daily accrual ledger for savings accounts.
--    Interest is posted quarterly; this table accumulates it
--    day-by-day with 4 decimal precision to avoid drift.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_interest_accrual (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id             BIGINT          NOT NULL
                          REFERENCES branchparameters(branch_id),
  account_number        VARCHAR(20)     NOT NULL
                          REFERENCES savings_accounts(account_number),
  accrual_date          DATE            NOT NULL,
  opening_balance       NUMERIC(12,2)   NOT NULL DEFAULT 0,
  interest_rate         NUMERIC(5,2)    NOT NULL DEFAULT 0,
  accrued_interest      NUMERIC(12,4)   NOT NULL DEFAULT 0,
  cumulative_accrual    NUMERIC(12,4)   NOT NULL DEFAULT 0,
  is_posted             BOOLEAN         NOT NULL DEFAULT false,
  posted_txn_id         UUID
                          REFERENCES savings_transactions(id),
  dayend_id             UUID            NOT NULL
                          REFERENCES dayend_log(id),
  created_at            TIMESTAMP       NOT NULL DEFAULT now(),

  CONSTRAINT uq_savings_accrual_account_date
    UNIQUE (account_number, accrual_date)
);

CREATE INDEX IF NOT EXISTS idx_sav_accrual_account
  ON savings_interest_accrual (account_number);
CREATE INDEX IF NOT EXISTS idx_sav_accrual_date
  ON savings_interest_accrual (accrual_date);
CREATE INDEX IF NOT EXISTS idx_sav_accrual_unposted
  ON savings_interest_accrual (account_number) WHERE is_posted = false;


-- -------------------------------------------------------------
-- 4. deposit_interest_accrual
--    Daily accrual ledger for term deposits (TD) and
--    recurring deposits (RD).
--    Mirrors savings_interest_accrual for deposit_account.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deposit_interest_accrual (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id             BIGINT          NOT NULL
                          REFERENCES branchparameters(branch_id),
  account_id            UUID            NOT NULL
                          REFERENCES deposit_account(id),
  deposit_type          VARCHAR(10)     NOT NULL
                          CHECK (deposit_type IN ('TERM','RECURRING','PIGMY')),
  accrual_date          DATE            NOT NULL,
  principal_balance     NUMERIC(14,2)   NOT NULL DEFAULT 0,
  interest_rate         NUMERIC(5,2)    NOT NULL DEFAULT 0,
  accrued_interest      NUMERIC(14,4)   NOT NULL DEFAULT 0,
  cumulative_accrual    NUMERIC(14,4)   NOT NULL DEFAULT 0,
  is_posted             BOOLEAN         NOT NULL DEFAULT false,
  posted_txn_id         UUID
                          REFERENCES deposit_transactions(id),
  dayend_id             UUID            NOT NULL
                          REFERENCES dayend_log(id),
  created_at            TIMESTAMP       NOT NULL DEFAULT now(),

  CONSTRAINT uq_deposit_accrual_account_date
    UNIQUE (account_id, accrual_date)
);

CREATE INDEX IF NOT EXISTS idx_dep_accrual_account
  ON deposit_interest_accrual (account_id);
CREATE INDEX IF NOT EXISTS idx_dep_accrual_date
  ON deposit_interest_accrual (accrual_date);
CREATE INDEX IF NOT EXISTS idx_dep_accrual_unposted
  ON deposit_interest_accrual (account_id) WHERE is_posted = false;


-- -------------------------------------------------------------
-- 5. loan_interest_accrual
--    Daily interest accrual on active loans.
--    Tracks overdue days and NPA classification per day.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loan_interest_accrual (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id             BIGINT          NOT NULL
                          REFERENCES branchparameters(branch_id),
  loan_application_id   BIGINT          NOT NULL,
  accrual_date          DATE            NOT NULL,
  outstanding_principal NUMERIC(15,2)   NOT NULL DEFAULT 0,
  interest_rate         NUMERIC(5,2)    NOT NULL DEFAULT 0,
  -- Daily interest = outstanding_principal * interest_rate / 100 / 365
  accrued_interest      NUMERIC(15,4)   NOT NULL DEFAULT 0,
  overdue_days          INTEGER         NOT NULL DEFAULT 0,
  -- Penal interest charged when overdue_days > 0
  penal_interest        NUMERIC(15,4)   NOT NULL DEFAULT 0,
  -- NPA flag set when overdue_days >= 90
  npa_flag              BOOLEAN         NOT NULL DEFAULT false,
  dayend_id             UUID            NOT NULL
                          REFERENCES dayend_log(id),
  created_at            TIMESTAMP       NOT NULL DEFAULT now()

);

CREATE INDEX IF NOT EXISTS idx_loan_accrual_loan
  ON loan_interest_accrual (loan_application_id);
CREATE INDEX IF NOT EXISTS idx_loan_accrual_date
  ON loan_interest_accrual (accrual_date);
CREATE INDEX IF NOT EXISTS idx_loan_accrual_npa
  ON loan_interest_accrual (branch_id) WHERE npa_flag = true;


-- =============================================================
-- ALTER EXISTING TABLES
-- =============================================================


-- -------------------------------------------------------------
-- savings_accounts
--    Running total of accrued-but-not-yet-posted interest.
--    Shown to customer as "accrued interest" in account view.
-- -------------------------------------------------------------
ALTER TABLE savings_accounts
  ADD COLUMN IF NOT EXISTS accrued_interest_balance NUMERIC(12,4) NOT NULL DEFAULT 0;


-- -------------------------------------------------------------
-- deposit_account
--    Track what happened to matured deposits during day end.
--    Banker must manually handle PENDING_CLOSURE accounts.
-- -------------------------------------------------------------
ALTER TABLE deposit_account
  ADD COLUMN IF NOT EXISTS maturity_action VARCHAR(20)
    CHECK (maturity_action IN ('AUTO_RENEWED','PENDING_CLOSURE','CLOSED')),
  ADD COLUMN IF NOT EXISTS maturity_processed_date DATE;


-- -------------------------------------------------------------
-- loan_applications
--    NPA classification and overdue day count updated daily
--    by the loan accrual step. Used for regulatory reporting.
-- -------------------------------------------------------------
ALTER TABLE loan_applications
  ADD COLUMN IF NOT EXISTS npa_flag            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS npa_classified_date DATE,
  ADD COLUMN IF NOT EXISTS overdue_days        INTEGER NOT NULL DEFAULT 0;


-- =============================================================
-- END OF MIGRATION
-- =============================================================