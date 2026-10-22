-- =========================================================
-- LOAN SCHEME SECURITY CONFIGURATION
-- Settings > Management > Loan Scheme Security Configuration
-- maintains which security types a loan scheme accepts.
-- =========================================================

-- Remove duplicate scheme/security rows before enforcing uniqueness
DELETE FROM loan_scheme_security_mapping a
USING loan_scheme_security_mapping b
WHERE a.ctid > b.ctid
  AND a.branch_id = b.branch_id
  AND a.scheme_id = b.scheme_id
  AND a.security_id = b.security_id;

ALTER TABLE loan_scheme_security_mapping
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_lssm_branch_scheme_security'
    ) THEN
        ALTER TABLE loan_scheme_security_mapping
            ADD CONSTRAINT uq_lssm_branch_scheme_security UNIQUE (branch_id, scheme_id, security_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lssm_branch_scheme
    ON loan_scheme_security_mapping(branch_id, scheme_id);
