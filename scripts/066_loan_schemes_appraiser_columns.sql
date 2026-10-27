-- =========================================================
-- LOAN SCHEMES - APPRAISER CHARGE COLUMNS
-- loan_scheme_master (049) carries the appraiser charge settings but the
-- branch-level loan_schemes table was never altered, which breaks
-- Settings > Scheme Maintenance > Loan Schemes and Admin > Add Scheme.
-- =========================================================

ALTER TABLE loan_schemes
    ADD COLUMN IF NOT EXISTS appraiser_charge_allowed               BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS appraiser_charge_code                  VARCHAR(20),
    ADD COLUMN IF NOT EXISTS appraiser_name                         VARCHAR(50),
    ADD COLUMN IF NOT EXISTS appraiser_amount_receive_account_number VARCHAR(20);

-- Carry over the values already defined on the scheme master
UPDATE loan_schemes ls
SET appraiser_charge_allowed                = lsm.appraiser_charge_allowed,
    appraiser_charge_code                   = lsm.appraiser_charge_code,
    appraiser_name                          = lsm.appraiser_name,
    appraiser_amount_receive_account_number = lsm.appraiser_amount_receive_account_number
FROM loan_scheme_master lsm
WHERE lsm.scheme_id = ls.scheme_id;
