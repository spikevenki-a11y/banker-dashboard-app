-- =========================================================
-- APPRAISER MASTER
-- Jewel / gold loan appraisers maintained per branch
-- (Settings > Management > Manage Appraiser Details)
-- =========================================================

CREATE TABLE IF NOT EXISTS appraiser_master (
    appraiser_id        SERIAL          PRIMARY KEY,
    branch_id           INTEGER         NOT NULL,

    appraiser_code      VARCHAR(20)     NOT NULL,
    appraiser_name      VARCHAR(150)    NOT NULL,
    license_no          VARCHAR(50),
    license_valid_till  DATE,
    mobile_no           VARCHAR(15),
    email               VARCHAR(150),
    address             TEXT,

    status              VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | INACTIVE

    -- Audit
    created_by          VARCHAR(100),
    created_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_by          VARCHAR(100),
    updated_at          TIMESTAMP WITHOUT TIME ZONE,

    CONSTRAINT uq_appraiser_code UNIQUE (branch_id, appraiser_code)
);

CREATE INDEX IF NOT EXISTS idx_appraiser_branch ON appraiser_master(branch_id);
CREATE INDEX IF NOT EXISTS idx_appraiser_status ON appraiser_master(status);
