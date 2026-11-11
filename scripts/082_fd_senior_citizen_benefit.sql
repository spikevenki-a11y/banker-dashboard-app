-- =========================================================
-- FIXED DEPOSIT INTEREST POLICY — SENIOR CITIZEN BENEFIT
-- Every policy version carries a Senior Citizen Benefit setting:
--   enabled / disabled, minimum eligible age, additional rate (% p.a. added to the
--   regular tenure rate) and the period within the policy when it applies.
-- Each deposit stores the interest category it got (REGULAR / SENIOR_CITIZEN) and
-- the member's age on the opening date, next to the rate it was opened with.
-- =========================================================

ALTER TABLE fd_interest_policy_versions
    ADD COLUMN IF NOT EXISTS senior_benefit_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS senior_min_age          SMALLINT
        CHECK (senior_min_age IS NULL OR senior_min_age BETWEEN 1 AND 120),
    ADD COLUMN IF NOT EXISTS senior_additional_rate  NUMERIC(5,2)
        CHECK (senior_additional_rate IS NULL OR (senior_additional_rate > 0 AND senior_additional_rate <= 50)),
    ADD COLUMN IF NOT EXISTS senior_effective_from   DATE,
    ADD COLUMN IF NOT EXISTS senior_effective_to     DATE;

ALTER TABLE deposit_account
    ADD COLUMN IF NOT EXISTS interest_category       VARCHAR(20)
        CHECK (interest_category IS NULL OR interest_category IN ('REGULAR', 'SENIOR_CITIZEN')),
    ADD COLUMN IF NOT EXISTS member_age_at_opening   SMALLINT;
