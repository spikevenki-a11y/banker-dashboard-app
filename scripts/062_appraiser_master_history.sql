-- =========================================================
-- APPRAISER MASTER HISTORY
-- One row per add / update of an appraiser: full snapshot of the
-- details after the change, plus the old -> new values that changed.
-- =========================================================

CREATE TABLE IF NOT EXISTS appraiser_master_history (
    history_id          SERIAL          PRIMARY KEY,
    appraiser_id        INTEGER         NOT NULL REFERENCES appraiser_master(appraiser_id),
    branch_id           INTEGER         NOT NULL,

    action              VARCHAR(20)     NOT NULL,   -- CREATED | UPDATED | ACTIVATED | DEACTIVATED
    changes             JSONB,                      -- { field: { "old": .., "new": .. } }, NULL for CREATED

    -- Snapshot after the change
    appraiser_code      VARCHAR(20)     NOT NULL,
    appraiser_name      VARCHAR(150)    NOT NULL,
    license_no          VARCHAR(50),
    license_valid_till  DATE,
    mobile_no           VARCHAR(15),
    email               VARCHAR(150),
    address             TEXT,
    status              VARCHAR(20)     NOT NULL,

    -- Audit
    changed_by          VARCHAR(100),
    changed_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appraiser_hist_appraiser ON appraiser_master_history(appraiser_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_appraiser_hist_branch    ON appraiser_master_history(branch_id);

-- Backfill: seed a CREATED entry for appraisers added before history existed
INSERT INTO appraiser_master_history
    (appraiser_id, branch_id, action, changes, appraiser_code, appraiser_name, license_no,
     license_valid_till, mobile_no, email, address, status, changed_by, changed_at)
SELECT m.appraiser_id, m.branch_id, 'CREATED', NULL, m.appraiser_code, m.appraiser_name, m.license_no,
       m.license_valid_till, m.mobile_no, m.email, m.address, m.status,
       COALESCE(m.updated_by, m.created_by), COALESCE(m.updated_at, m.created_at, now())
FROM appraiser_master m
WHERE NOT EXISTS (SELECT 1 FROM appraiser_master_history h WHERE h.appraiser_id = m.appraiser_id);
