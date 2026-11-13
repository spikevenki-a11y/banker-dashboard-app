-- =========================================================
-- MEMBER MANAGEMENT - MEMBER CLOSURE
-- Member Management → Member Closure closes a membership once it has no open,
-- active or pending accounts in any module (checked by POST /api/members/closure).
-- memberships.status becomes 'CLOSED' and memberships.close_date the business date;
-- these columns record why and by whom. Linked accounts and all transaction
-- history are left untouched. Safe to re-run.
-- =========================================================

ALTER TABLE public.memberships
    ADD COLUMN IF NOT EXISTS closure_reason   VARCHAR(50),
    ADD COLUMN IF NOT EXISTS closure_remarks  TEXT,
    ADD COLUMN IF NOT EXISTS closed_by        TEXT,          -- staff user id
    ADD COLUMN IF NOT EXISTS closed_by_name   TEXT,
    ADD COLUMN IF NOT EXISTS closed_at        TIMESTAMPTZ;   -- system time of closure
