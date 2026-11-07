-- =========================================================
-- LOAN PURPOSE MAPPING
-- Settings > Management > Loan Purpose Mapping maintains the
-- loan purpose master and which purposes each loan scheme allows.
-- =========================================================

-- Purposes can be retired without deleting history
ALTER TABLE loan_purpose_master
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lpm_purpose_name_ci
    ON loan_purpose_master (LOWER(TRIM(purpose_name)));

-- Remove duplicate scheme/purpose rows before enforcing uniqueness
DELETE FROM loan_scheme_purpose_mapping a
USING loan_scheme_purpose_mapping b
WHERE a.ctid > b.ctid
  AND a.branch_id = b.branch_id
  AND a.scheme_id = b.scheme_id
  AND a.purpose_id = b.purpose_id;

ALTER TABLE loan_scheme_purpose_mapping
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_lspm_branch_scheme_purpose'
    ) THEN
        ALTER TABLE loan_scheme_purpose_mapping
            ADD CONSTRAINT uq_lspm_branch_scheme_purpose UNIQUE (branch_id, scheme_id, purpose_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lspm_branch_scheme
    ON loan_scheme_purpose_mapping(branch_id, scheme_id);
