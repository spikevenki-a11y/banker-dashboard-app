-- =========================================================
-- APPRAISER INCOME ACCOUNT
-- GL income ledger (chart_of_accounts, accounttypecode = 3) that receives
-- the society's 20% share of an appraiser charge. The remaining 80% is
-- credited to the appraiser's own account (account_number / account_type).
-- Required for every appraiser that has a charge account configured.
-- (Settings > Management > Manage Appraiser Details)
-- =========================================================

ALTER TABLE appraiser_master
    ADD COLUMN IF NOT EXISTS income_account_code BIGINT;

ALTER TABLE appraiser_master_history
    ADD COLUMN IF NOT EXISTS income_account_code BIGINT;
