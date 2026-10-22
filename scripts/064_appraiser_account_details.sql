-- =========================================================
-- APPRAISER ACCOUNT DETAILS
-- Account the appraiser's charges are credited to
-- (Settings > Management > Manage Appraiser Details)
-- =========================================================

ALTER TABLE appraiser_master
    ADD COLUMN IF NOT EXISTS account_number NUMERIC,
    ADD COLUMN IF NOT EXISTS account_type   VARCHAR(50);   -- SAVINGS | SUNDRY_CREDITOR | CURRENT | CASH | OTHER

ALTER TABLE appraiser_master_history
    ADD COLUMN IF NOT EXISTS account_number NUMERIC,
    ADD COLUMN IF NOT EXISTS account_type   VARCHAR(50);
