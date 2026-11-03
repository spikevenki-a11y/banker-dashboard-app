-- =========================================================
-- FIXED DEPOSITS - REJECT APPLICATION
-- A deposit account that was opened but never funded (balance 0) can be
-- rejected from Fixed Deposits → Application Status → Deposit View.
-- Adds the 'Rejected' account status and records who/when/why.
-- Safe to re-run.
-- =========================================================

INSERT INTO ref_account_status (account_status_name)
SELECT 'Rejected'
WHERE NOT EXISTS (SELECT 1 FROM ref_account_status WHERE account_status_name = 'Rejected');

ALTER TABLE deposit_account
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS rejected_by      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS rejected_date    DATE;
