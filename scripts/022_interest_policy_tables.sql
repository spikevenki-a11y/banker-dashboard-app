-- Interest Policy tables (PostgreSQL)
-- Policies are effective-date based; no edits, only new policies.

CREATE TABLE IF NOT EXISTS interest_policy (
    policy_id      BIGSERIAL PRIMARY KEY,
    branch_id      BIGINT NOT NULL,
    product_type   VARCHAR(20) NOT NULL,            -- 'SAVINGS' | 'DEPOSITS'
    scheme_id      INTEGER NOT NULL,                -- FK to savings_schemes.scheme_id or deposit_schemes.scheme_id
    scheme_name    VARCHAR(100),
    base_rate      DECIMAL(5,2) NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL,
    effective_to   DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by     UUID,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interest_condition (
    condition_id        BIGSERIAL PRIMARY KEY,
    policy_id           BIGINT NOT NULL REFERENCES interest_policy(policy_id) ON DELETE CASCADE,
    parent_condition_id BIGINT REFERENCES interest_condition(condition_id) ON DELETE CASCADE,
    field_name          VARCHAR(50) NOT NULL,       -- e.g. 'amount', 'tenure_months', 'customer_age'
    operator            VARCHAR(10) NOT NULL,        -- 'BETWEEN', '>=', '<=', '='
    value_from          VARCHAR(50) NOT NULL,
    value_to            VARCHAR(50),
    interest_rate       DECIMAL(5,2) NOT NULL,
    penal_rate          DECIMAL(5,2) DEFAULT 0.00,
    created_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by branch + product + scheme
CREATE INDEX IF NOT EXISTS idx_interest_policy_lookup
    ON interest_policy (branch_id, product_type, scheme_id, status, effective_from);
