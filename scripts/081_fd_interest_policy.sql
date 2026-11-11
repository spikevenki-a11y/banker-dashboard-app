-- =========================================================
-- FIXED DEPOSIT INTEREST POLICY CONFIGURATION
-- Settings > Interest Policy Configuration.
--
-- fd_interest_policies          one row per policy (scheme, status, current version)
-- fd_interest_policy_versions   every configuration a policy has had; an edit or a
--                               status change adds a version, nothing is overwritten
--
-- A new term deposit is opened under the policy in force for its scheme, opening
-- date and tenure. The account keeps the version it used and a copy of the terms,
-- so later policy changes never alter existing deposits.
-- =========================================================

CREATE TABLE IF NOT EXISTS fd_interest_policies (
    policy_id        SERIAL PRIMARY KEY,
    branch_id        INTEGER      NOT NULL,
    scheme_id        INTEGER      NOT NULL,              -- deposit_schemes.scheme_id
    policy_name      VARCHAR(100) NOT NULL,
    status           VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    current_version  INTEGER      NOT NULL DEFAULT 1,
    created_by       VARCHAR(100),
    created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_by       VARCHAR(100),
    updated_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fd_policy_branch_scheme
    ON fd_interest_policies (branch_id, scheme_id, status);

CREATE TABLE IF NOT EXISTS fd_interest_policy_versions (
    version_id                 SERIAL PRIMARY KEY,
    policy_id                  INTEGER      NOT NULL REFERENCES fd_interest_policies(policy_id),
    version_no                 INTEGER      NOT NULL,
    policy_name                VARCHAR(100) NOT NULL,
    status                     VARCHAR(10)  NOT NULL,

    -- PERIOD_WISE: rate by tenure. AGE_WISE: rate by tenure, with a separate
    -- senior citizen rate for depositors at or above senior_citizen_age.
    calculation_method         VARCHAR(20)  NOT NULL CHECK (calculation_method IN ('PERIOD_WISE', 'AGE_WISE')),
    senior_citizen_age         SMALLINT     CHECK (senior_citizen_age IS NULL OR senior_citizen_age BETWEEN 1 AND 120),
    -- [{ "tenure_from_days": 7, "tenure_to_days": 45, "interest_rate": 5.5, "senior_citizen_rate": 6.0 }]
    rate_slabs                 JSONB        NOT NULL,

    compounding_frequency      VARCHAR(20)  NOT NULL
        CHECK (compounding_frequency IN ('NONE', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY')),
    effective_from             DATE         NOT NULL,
    effective_to               DATE,
    CHECK (effective_to IS NULL OR effective_to >= effective_from),

    -- Premature closure: allowed or not, minimum days before it is allowed, and the
    -- penal rate (% of interest earned, as closure already calculates it)
    premature_closure_allowed  BOOLEAN      NOT NULL DEFAULT TRUE,
    premature_lock_in_days     INTEGER      NOT NULL DEFAULT 0 CHECK (premature_lock_in_days >= 0),
    premature_penal_rate       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (premature_penal_rate BETWEEN 0 AND 100),

    -- Maturity amount rounding
    maturity_rounding          VARCHAR(20)  NOT NULL DEFAULT 'NEAREST_RUPEE'
        CHECK (maturity_rounding IN ('NEAREST_RUPEE', 'NEAREST_PAISE', 'ROUND_DOWN_RUPEE')),

    change_type                VARCHAR(20)  NOT NULL,   -- CREATED | EDITED | ACTIVATED | DEACTIVATED
    change_remarks             VARCHAR(255),
    created_by                 VARCHAR(100),
    created_at                 TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (policy_id, version_no)
);

-- The policy version (and a copy of its terms) each deposit was opened with
ALTER TABLE deposit_account
    ADD COLUMN IF NOT EXISTS interest_policy_version_id INTEGER,
    ADD COLUMN IF NOT EXISTS interest_policy_snapshot   JSONB;
