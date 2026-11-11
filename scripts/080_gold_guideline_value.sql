-- =========================================================
-- GOLD GUIDELINES VALUE PER GRAM
-- Settings > Management > Gold Guidelines Value keeps the per-gram
-- guideline value used to cap gold loans:
--   Maximum Sanction Amount = Guidelines Value per Gram x Net Weight
-- Every change is a new row, so the value in force at any time is kept
-- for audit; the current value is the latest row for the branch.
-- =========================================================

CREATE TABLE IF NOT EXISTS gold_guideline_values (
    id                SERIAL PRIMARY KEY,
    branch_id         INTEGER        NOT NULL,
    value_per_gram    NUMERIC(12,2)  NOT NULL CHECK (value_per_gram > 0),
    effective_from    DATE           NOT NULL,
    remarks           VARCHAR(255),
    created_by        VARCHAR(100),
    created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gold_guideline_branch
    ON gold_guideline_values (branch_id, id DESC);

-- The guideline value and the resulting cap are stored with each gold security,
-- so a later change to the guideline does not alter applications already made
ALTER TABLE security_gold_details
    ADD COLUMN IF NOT EXISTS guideline_value_per_gram NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS max_sanction_amount      NUMERIC(15,2);
