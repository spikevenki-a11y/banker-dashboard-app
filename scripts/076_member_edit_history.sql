-- =============================================================
-- Member edit history
-- Tables : member_edit_history
--
-- One row per changed field each time a tab is saved in
-- Member Management → View Member → Edit Member.
-- Rows are append-only: a trigger rejects every UPDATE and DELETE,
-- so history cannot be altered through the application (or by
-- accident in SQL) once written.
-- =============================================================

CREATE TABLE IF NOT EXISTS member_edit_history (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- All fields changed by one "Update ..." click share a change_id
  change_id        UUID          NOT NULL,
  branch_id        VARCHAR(20)   NOT NULL,
  membership_no    VARCHAR(20)   NOT NULL,
  customer_code    VARCHAR(20)   NOT NULL,
  section          VARCHAR(20)   NOT NULL
                     CHECK (section IN ('personal', 'address', 'kyc', 'membership')),
  field_name       VARCHAR(50)   NOT NULL,
  old_value        TEXT,
  new_value        TEXT,
  changed_by       UUID,
  changed_by_name  TEXT,
  changed_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_edit_history_member
  ON member_edit_history (branch_id, membership_no, changed_at DESC);

-- Append-only: block UPDATE / DELETE / TRUNCATE
CREATE OR REPLACE FUNCTION member_edit_history_readonly()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'member_edit_history is append-only; % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_member_edit_history_no_update ON member_edit_history;
CREATE TRIGGER trg_member_edit_history_no_update
  BEFORE UPDATE OR DELETE ON member_edit_history
  FOR EACH ROW EXECUTE FUNCTION member_edit_history_readonly();

DROP TRIGGER IF EXISTS trg_member_edit_history_no_truncate ON member_edit_history;
CREATE TRIGGER trg_member_edit_history_no_truncate
  BEFORE TRUNCATE ON member_edit_history
  FOR EACH STATEMENT EXECUTE FUNCTION member_edit_history_readonly();

-- =============================================================
-- END OF MIGRATION
-- =============================================================
