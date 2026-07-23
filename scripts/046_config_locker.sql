-- =========================================================
-- LOCKER CONFIGURATION MODULE
-- Branch-level locker rules, pricing, deposits, GL mapping
-- =========================================================

CREATE TABLE config_locker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Branch
    branch_id BIGINT NOT NULL
        REFERENCES branchparameters(branch_id),

    -- Locker Type Reference
    locker_type_id UUID NOT NULL
        REFERENCES locker_types(id),

    -- Financial Rules
    annual_rent NUMERIC(12,2) NOT NULL,              -- yearly rent
    security_deposit_amount NUMERIC(12,2) NOT NULL, -- refundable deposit
    interest_rate NUMERIC(6,3) NOT NULL DEFAULT 0,  -- deposit interest
    minimum_period_years SMALLINT NOT NULL DEFAULT 1,
    maximum_period_years SMALLINT,

    -- Availability Rules
    max_lockers_per_member INTEGER NOT NULL DEFAULT 1,
    nominee_required BOOLEAN NOT NULL DEFAULT true,

    -- Penalty / Late Fee
    late_fee_amount NUMERIC(10,2) DEFAULT 0,
    grace_period_days INTEGER DEFAULT 0,

    -- GL Accounts
    locker_rent_gl_account BIGINT NOT NULL,
    locker_deposit_gl_account BIGINT NOT NULL,
    locker_interest_gl_account BIGINT,
    locker_penalty_gl_account BIGINT,

    -- Lifecycle
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_locker_config_branch_type_active
        UNIQUE (branch_id, locker_type_id, is_active),

    CONSTRAINT chk_locker_period
        CHECK (
            maximum_period_years IS NULL
            OR maximum_period_years >= minimum_period_years
        ),

    CONSTRAINT chk_locker_deposit_positive
        CHECK (security_deposit_amount >= 0),

    CONSTRAINT chk_locker_rent_positive
        CHECK (annual_rent >= 0)
);

-- =========================================================
-- GL ACCOUNT FOREIGN KEYS
-- =========================================================

ALTER TABLE config_locker
ADD CONSTRAINT fk_locker_rent_gl
FOREIGN KEY (locker_rent_gl_account)
REFERENCES chart_of_accounts(accountcode);

ALTER TABLE config_locker
ADD CONSTRAINT fk_locker_deposit_gl
FOREIGN KEY (locker_deposit_gl_account)
REFERENCES chart_of_accounts(accountcode);

ALTER TABLE config_locker
ADD CONSTRAINT fk_locker_interest_gl
FOREIGN KEY (locker_interest_gl_account)
REFERENCES chart_of_accounts(accountcode);

ALTER TABLE config_locker
ADD CONSTRAINT fk_locker_penalty_gl
FOREIGN KEY (locker_penalty_gl_account)
REFERENCES chart_of_accounts(accountcode);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_config_locker_branch
    ON config_locker(branch_id);

CREATE INDEX idx_config_locker_active
    ON config_locker(is_active);

CREATE INDEX idx_config_locker_type
    ON config_locker(locker_type_id);