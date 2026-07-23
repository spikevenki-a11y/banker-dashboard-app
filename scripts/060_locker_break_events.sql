-- =========================================================
-- LOCKER BREAK EVENTS
-- Audit trail for forced locker break / force-open operations
-- =========================================================

CREATE TABLE IF NOT EXISTS locker_break_events (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       INTEGER         NOT NULL,

    -- Locker & assignment references (denormalized for audit clarity)
    locker_id       UUID            NOT NULL REFERENCES lockers(id),
    assignment_id   UUID,                           -- FK to locker_assignments  (best-effort, nullable)
    deposit_id      UUID,                           -- FK to locker_deposits     (best-effort, nullable)
    membership_no   NUMERIC         NOT NULL,
    locker_no       VARCHAR(20),                    -- snapshot at time of break
    member_name     VARCHAR(200),                   -- snapshot at time of break

    -- Break details
    break_reason    TEXT            NOT NULL,
    remarks         TEXT,

    -- Charge & GL
    breaking_charge NUMERIC(10,2)   NOT NULL DEFAULT 0,
    voucher_type    VARCHAR(20),                    -- CASH | TRANSFER | NULL (waived)
    voucher_no      INTEGER,
    batch_id        INTEGER,

    -- Audit
    performed_by    UUID,
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lbe_branch  ON locker_break_events(branch_id);
CREATE INDEX IF NOT EXISTS idx_lbe_locker  ON locker_break_events(locker_id);
CREATE INDEX IF NOT EXISTS idx_lbe_member  ON locker_break_events(membership_no);
CREATE INDEX IF NOT EXISTS idx_lbe_date    ON locker_break_events(created_at);
