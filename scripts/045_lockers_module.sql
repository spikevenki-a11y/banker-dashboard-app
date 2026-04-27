-- global locker type master (for reference and standardization across branches)
CREATE TABLE locker_type_master (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name     VARCHAR(50) NOT NULL UNIQUE,   -- Small, Medium, Large
    dimensions    VARCHAR(100),                  -- Standard size
    description   TEXT,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

INSERT INTO locker_type_master (type_name, dimensions, description)
VALUES
('Extra Small', '8x6x4 inches',   'For minimal storage like jewelry'),
('Small',       '12x8x5 inches',  'Small valuables and documents'),
('Medium',      '18x12x8 inches', 'General purpose storage'),
('Large',       '24x18x12 inches','Large items and storage boxes'),
('Extra Large', '36x24x18 inches','Very large storage needs');

-- Lockers Module
-- Manages locker inventory, allocation, and deposits where interest = rent

-- Locker size / category types
CREATE TABLE locker_types (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    locker_type_id SERIAL        NOT NULL,
    branch_id      INTEGER       NOT NULL,
    type_name      VARCHAR(50)   NOT NULL,   -- e.g. Small, Medium, Large
    dimensions     VARCHAR(100),             -- e.g. "12x8x5 inches"
    annual_rent    NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE INDEX idx_ltype_branch ON locker_types(branch_id);

-- Individual locker units in the branch vault
CREATE TABLE lockers (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id      INTEGER     NOT NULL,
    locker_no      VARCHAR(20) NOT NULL,
    locker_type_id INTEGER     NOT NULL REFERENCES locker_types(locker_type_id),
    location       VARCHAR(100),         -- e.g. "Row A, Cabinet 3"
    status         VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE | ALLOCATED | MAINTENANCE
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    CONSTRAINT uq_locker_no UNIQUE (branch_id, locker_no)
);
CREATE INDEX idx_lockers_branch ON lockers(branch_id);
CREATE INDEX idx_lockers_status ON lockers(status);

-- Locker deposit accounts (security deposit; interest earned = annual locker rent)
CREATE TABLE locker_deposits (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number   VARCHAR(20)   NOT NULL UNIQUE,
    branch_id        INTEGER       NOT NULL,
    membership_no    BIGINT        NOT NULL,
    locker_id        UUID          REFERENCES lockers(id),
    deposit_amount   NUMERIC(12,2) NOT NULL,
    interest_rate    NUMERIC(6,3)  NOT NULL DEFAULT 0,
    opening_date     DATE          NOT NULL,
    period_years     SMALLINT      NOT NULL DEFAULT 1,
    expiry_date      DATE,
    nominee_name     VARCHAR(200),
    nominee_relation VARCHAR(50),
    status           VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | CLOSED
    created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE INDEX idx_ld_branch ON locker_deposits(branch_id);
CREATE INDEX idx_ld_member ON locker_deposits(membership_no);
