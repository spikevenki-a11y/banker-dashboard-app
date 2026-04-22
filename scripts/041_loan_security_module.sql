-- =========================================================
-- LOAN SECURITY MODULE - Redesigned Schema
-- Pattern: Class Table Inheritance (Hybrid approach)
--
-- Architecture:
--   loan_securities            → central base table (common fields)
--   security_gold_details      → gold-specific attributes
--   security_property_details  → immovable property attributes
--   security_vehicle_details   → vehicle attributes
--   security_deposit_details   → FD/RD/NSC/KVP attributes
--   security_insurance_details → insurance policy attributes
--   security_valuations        → valuation history (append-only)
--   security_documents         → supporting document registry
--   security_custom_attributes → ad-hoc key-value pairs for niche types
--   security_audit_log         → full field-level audit trail
--
-- Existing tables preserved:
--   loan_scheme_security_master   (lookup — altered below)
--   loan_scheme_security_mapping  (scheme-to-type mapping — kept as-is)
--   loan_security_details         (deprecated; base table replaces it)
--   security_details              (deprecated; type tables replace it)
-- =========================================================


-- ---------------------------------------------------------
-- 0. Extend the existing security type master
-- ---------------------------------------------------------
ALTER TABLE loan_scheme_security_master
    ADD COLUMN IF NOT EXISTS security_code       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS requires_valuation  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS revaluation_days    INT;   -- how often to revalue (in days)

UPDATE loan_scheme_security_master SET security_code = 'LAND'     WHERE security_id = 1;
UPDATE loan_scheme_security_master SET security_code = 'BUILDING' WHERE security_id = 2;
UPDATE loan_scheme_security_master SET security_code = 'MACHNY'   WHERE security_id = 3;
UPDATE loan_scheme_security_master SET security_code = 'INVENT'   WHERE security_id = 4;
UPDATE loan_scheme_security_master SET security_code = 'AR'       WHERE security_id = 5;
UPDATE loan_scheme_security_master SET security_code = 'GOLD'     WHERE security_id = 6;
UPDATE loan_scheme_security_master SET security_code = 'VEHICLE'  WHERE security_id = 7;
UPDATE loan_scheme_security_master SET security_code = 'DEPOSIT'  WHERE security_id = 8;
UPDATE loan_scheme_security_master SET security_code = 'OTHER'    WHERE security_id = 9;

INSERT INTO loan_scheme_security_master (security_id, security_name, security_code, requires_valuation, revaluation_days)
VALUES
    (10, 'Insurance Policy', 'INSUR',   TRUE,  365),
    (11, 'Shares / Stocks',  'SHARES',  TRUE,   30),
    (12, 'NSC / KVP',        'NSC_KVP', FALSE, NULL);

UPDATE loan_scheme_security_master SET revaluation_days = 180  WHERE security_id = 1;  -- Land
UPDATE loan_scheme_security_master SET revaluation_days = 180  WHERE security_id = 2;  -- Building
UPDATE loan_scheme_security_master SET revaluation_days = 90   WHERE security_id = 6;  -- Gold
UPDATE loan_scheme_security_master SET revaluation_days = 365  WHERE security_id = 7;  -- Vehicle
UPDATE loan_scheme_security_master SET requires_valuation = FALSE WHERE security_id = 8; -- Deposit (self-valued)


-- ---------------------------------------------------------
-- 1. Central Security Records (base table)
--    One row per security pledged against a loan application.
--    Type-specific detail tables hang off this via FK.
-- ---------------------------------------------------------
CREATE TABLE loan_securities (
    id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    security_seq_no      BIGSERIAL,                          -- human-readable sequential ref
    branch_id            INT     NOT NULL,
    loan_application_id  BIGINT  NOT NULL,
    security_type_id     INT     NOT NULL,                   -- FK → loan_scheme_security_master

    security_ref_no      VARCHAR(50) UNIQUE,                 -- generated reference e.g. SEC/2024/00001
    description          TEXT,

    -- rank / role within the loan
    is_primary_security  BOOLEAN        NOT NULL DEFAULT TRUE,
    security_rank        SMALLINT       NOT NULL DEFAULT 1,  -- 1 = first charge, 2 = second charge…

    -- current valuation snapshot (full history in security_valuations)
    assessed_value       DECIMAL(15,2),
    forced_sale_value    DECIMAL(15,2),
    valuation_date       DATE,

    -- lien
    lien_marked          BOOLEAN  NOT NULL DEFAULT FALSE,
    lien_date            DATE,
    lien_release_date    DATE,

    -- lifecycle status
    -- PENDING | ACTIVE | UNDER_REVIEW | RELEASED | SUBSTITUTED | UNDER_DISPUTE | DISCHARGED
    security_status      VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    -- verification
    -- PENDING | VERIFIED | REJECTED
    verification_status  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    verified_by          UUID,
    verified_at          TIMESTAMP WITHOUT TIME ZONE,
    verification_remarks TEXT,

    -- audit
    created_by           UUID,
    created_at           TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_by           UUID,
    updated_at           TIMESTAMP WITHOUT TIME ZONE,

    -- soft delete
    is_deleted           BOOLEAN   NOT NULL DEFAULT FALSE,
    deleted_at           TIMESTAMP WITHOUT TIME ZONE,
    deleted_by           UUID,

    CONSTRAINT fk_ls_branch      FOREIGN KEY (branch_id)           REFERENCES branchparameters(branch_id),
    CONSTRAINT fk_ls_loan_app    FOREIGN KEY (loan_application_id) REFERENCES loan_applications(loan_application_id),
    CONSTRAINT fk_ls_sec_type    FOREIGN KEY (security_type_id)    REFERENCES loan_scheme_security_master(security_id)
);

CREATE INDEX idx_ls_loan_app   ON loan_securities(loan_application_id);
CREATE INDEX idx_ls_type       ON loan_securities(security_type_id);
CREATE INDEX idx_ls_status     ON loan_securities(security_status);
CREATE INDEX idx_ls_branch     ON loan_securities(branch_id);
CREATE INDEX idx_ls_ref_no     ON loan_securities(security_ref_no);


-- ---------------------------------------------------------
-- 2. Gold Security Details
-- ---------------------------------------------------------
CREATE TABLE security_gold_details (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id           UUID NOT NULL UNIQUE,             -- 1-to-1 with loan_securities

    gold_form             VARCHAR(30) NOT NULL,             -- ORNAMENTS | COIN | BAR | BISCUIT
    purity_karat          SMALLINT    NOT NULL,             -- 18 | 20 | 22 | 24
    purity_percent        NUMERIC(5,2),                     -- e.g. 91.67 for 22K

    number_of_items       SMALLINT,
    gross_weight_grams    NUMERIC(10,3) NOT NULL,
    stone_weight_grams    NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    net_weight_grams      NUMERIC(10,3),                    -- gross − stone; stored for audit

    packet_no             VARCHAR(30),
    seal_no               VARCHAR(30),

    appraiser_name        VARCHAR(100),
    appraiser_license_no  VARCHAR(50),
    appraisal_date        DATE,

    gold_rate_per_gram    DECIMAL(10,2),                    -- rate on appraisal date
    gold_rate_date        DATE,
    market_value          DECIMAL(15,2),                    -- net_weight × rate

    storage_location      VARCHAR(100),                     -- vault / locker ref

    created_at            TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_sgd_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);


-- ---------------------------------------------------------
-- 3. Property / Immovable Security Details
-- ---------------------------------------------------------
CREATE TABLE security_property_details (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id             UUID NOT NULL UNIQUE,

    property_type           VARCHAR(30) NOT NULL,           -- RESIDENTIAL | COMMERCIAL | AGRICULTURAL | INDUSTRIAL | PLOT
    ownership_type          VARCHAR(20),                    -- OWNED | CO_OWNED | LEASEHOLD

    survey_no               VARCHAR(100),
    sub_division_no         VARCHAR(50),
    door_no                 VARCHAR(50),
    address_line1           VARCHAR(255),
    address_line2           VARCHAR(255),
    city                    VARCHAR(100),
    district                VARCHAR(100),
    state                   VARCHAR(100),
    pincode                 VARCHAR(10),

    land_area_sqft          NUMERIC(12,2),
    built_up_area_sqft      NUMERIC(12,2),
    land_area_acres         NUMERIC(10,4),

    registration_no         VARCHAR(100),
    registration_date       DATE,
    document_type           VARCHAR(50),                    -- SALE_DEED | GIFT_DEED | PARTITION_DEED | LEASE_DEED

    owner_name              VARCHAR(200),

    guideline_value         DECIMAL(15,2),
    market_value            DECIMAL(15,2),

    encumbrance_cert_date   DATE,                           -- date of latest EC obtained
    title_clear             BOOLEAN,
    legal_opinion_by        VARCHAR(100),
    legal_opinion_date      DATE,

    created_at              TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_spd_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);


-- ---------------------------------------------------------
-- 4. Vehicle Security Details
-- ---------------------------------------------------------
CREATE TABLE security_vehicle_details (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id             UUID NOT NULL UNIQUE,

    -- TWO_WHEELER | FOUR_WHEELER | COMMERCIAL | TRACTOR | CONSTRUCTION | OTHER
    vehicle_type            VARCHAR(30) NOT NULL,
    registration_no         VARCHAR(30) NOT NULL,
    chassis_no              VARCHAR(50),
    engine_no               VARCHAR(50),

    manufacturer            VARCHAR(100),
    model                   VARCHAR(100),
    variant                 VARCHAR(100),
    color                   VARCHAR(50),
    year_of_manufacture     SMALLINT,

    registration_date       DATE,
    registration_expiry     DATE,

    rc_book_held            BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_policy_no     VARCHAR(50),
    insurance_expiry        DATE,

    hypothecation_marked    BOOLEAN NOT NULL DEFAULT FALSE,

    purchase_price          DECIMAL(15,2),
    current_market_value    DECIMAL(15,2),

    created_at              TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_svd_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);


-- ---------------------------------------------------------
-- 5. Deposit Security Details  (FD / RD / NSC / KVP / Post Office)
-- ---------------------------------------------------------
CREATE TABLE security_deposit_details (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id         UUID NOT NULL UNIQUE,

    -- FD | RD | NSC | KVP | POST_OFFICE_SAVINGS | OTHER
    deposit_type        VARCHAR(30) NOT NULL,
    deposit_account_no  VARCHAR(50),
    certificate_no      VARCHAR(50),

    institution_name    VARCHAR(200) NOT NULL,
    institution_branch  VARCHAR(100),

    deposit_amount      DECIMAL(15,2) NOT NULL,
    deposit_date        DATE          NOT NULL,
    maturity_date       DATE,
    maturity_amount     DECIMAL(15,2),
    interest_rate       NUMERIC(5,2),

    lien_amount         DECIMAL(15,2),                      -- amount under lien (can be partial)
    auto_renewal        BOOLEAN NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_sdd_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);


-- ---------------------------------------------------------
-- 6. Insurance Policy Security Details
-- ---------------------------------------------------------
CREATE TABLE security_insurance_details (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id          UUID NOT NULL UNIQUE,

    policy_no            VARCHAR(50) NOT NULL,
    -- LIFE | ENDOWMENT | MONEY_BACK | ULIP | GENERAL
    policy_type          VARCHAR(50),
    insurer_name         VARCHAR(200) NOT NULL,
    insured_name         VARCHAR(200),

    sum_assured          DECIMAL(15,2),
    surrender_value      DECIMAL(15,2),
    surrender_value_date DATE,

    premium_amount       DECIMAL(15,2),
    -- MONTHLY | QUARTERLY | HALF_YEARLY | ANNUAL | SINGLE
    premium_frequency    VARCHAR(20),
    policy_start_date    DATE,
    policy_maturity_date DATE,
    premium_due_date     DATE,

    assignment_done      BOOLEAN NOT NULL DEFAULT FALSE,
    assignee_name        VARCHAR(200),

    created_at           TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_sid_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);


-- ---------------------------------------------------------
-- 7. Valuation History  (append-only; never update rows)
--    The latest row drives loan_securities.assessed_value.
-- ---------------------------------------------------------
CREATE TABLE security_valuations (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id              UUID NOT NULL,

    valuation_date           DATE          NOT NULL,
    valuation_amount         DECIMAL(15,2) NOT NULL,
    forced_sale_value        DECIMAL(15,2),

    -- MARKET | FORCED_SALE | BOOK_VALUE | GOVT_GUIDELINE | INSURANCE
    valuation_method         VARCHAR(30),
    valuator_name            VARCHAR(100),
    -- INTERNAL | EXTERNAL | GOVT_APPROVED | BRANCH
    valuator_type            VARCHAR(20),
    valuation_certificate_no VARCHAR(50),

    next_revaluation_date    DATE,
    remarks                  TEXT,

    created_by               UUID,
    created_at               TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_sv_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);

CREATE INDEX idx_sv_security ON security_valuations(security_id);
CREATE INDEX idx_sv_date     ON security_valuations(security_id, valuation_date DESC);


-- ---------------------------------------------------------
-- 8. Security Documents
-- ---------------------------------------------------------
CREATE TABLE security_documents (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id      UUID NOT NULL,

    -- TITLE_DEED | RC_BOOK | INSURANCE_POLICY | EC | VALUATION_REPORT
    -- APPRAISAL_CERT | DEPOSIT_CERT | LEGAL_OPINION | OTHER
    document_type    VARCHAR(50) NOT NULL,
    document_name    VARCHAR(200),
    document_no      VARCHAR(100),

    issue_date       DATE,
    expiry_date      DATE,

    is_original      BOOLEAN     NOT NULL DEFAULT FALSE,
    -- BRANCH_VAULT | HEAD_OFFICE | WITH_MEMBER | LAWYER | OTHER
    custody_location VARCHAR(100),

    file_path        TEXT,                                   -- path / key in file storage
    file_name        VARCHAR(255),

    uploaded_by      UUID,
    uploaded_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_sd_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);

CREATE INDEX idx_sd_security ON security_documents(security_id);
CREATE INDEX idx_sd_expiry   ON security_documents(expiry_date) WHERE expiry_date IS NOT NULL;


-- ---------------------------------------------------------
-- 9. Custom / Dynamic Attributes
--    For niche or future security types that do not yet have
--    a dedicated detail table. Also usable for extra fields
--    added by a branch without a schema migration.
-- ---------------------------------------------------------
CREATE TABLE security_custom_attributes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id     UUID        NOT NULL,

    attribute_key   VARCHAR(100) NOT NULL,
    attribute_value TEXT,
    -- STRING | NUMBER | DATE | BOOLEAN
    data_type       VARCHAR(20) NOT NULL DEFAULT 'STRING',

    created_by      UUID,
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT uq_sca_key    UNIQUE (security_id, attribute_key),
    CONSTRAINT fk_sca_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);

CREATE INDEX idx_sca_security ON security_custom_attributes(security_id);


-- ---------------------------------------------------------
-- 10. Audit Log  (field-level change history)
-- ---------------------------------------------------------
CREATE TABLE security_audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id   UUID        NOT NULL,

    -- CREATED | UPDATED | VERIFIED | RELEASED | SUBSTITUTED | DELETED | REVALUED | LIEN_MARKED | LIEN_RELEASED
    action        VARCHAR(30) NOT NULL,
    changed_field VARCHAR(100),
    old_value     TEXT,
    new_value     TEXT,
    remarks       TEXT,

    performed_by  UUID        NOT NULL,
    performed_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_sal_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);

CREATE INDEX idx_sal_security ON security_audit_log(security_id);
CREATE INDEX idx_sal_action   ON security_audit_log(action);


-- ---------------------------------------------------------
-- 11. Convenience view — security with latest valuation
--    Useful for dashboards and loan review screens.
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW v_loan_securities_current AS
SELECT
    ls.id,
    ls.security_seq_no,
    ls.branch_id,
    ls.loan_application_id,
    ls.security_ref_no,
    lssm.security_name   AS security_type,
    lssm.security_code,
    ls.description,
    ls.is_primary_security,
    ls.security_rank,
    ls.assessed_value,
    ls.forced_sale_value,
    ls.valuation_date,
    ls.lien_marked,
    ls.lien_date,
    ls.lien_release_date,
    ls.security_status,
    ls.verification_status,
    ls.verified_by,
    ls.verified_at,
    ls.created_by,
    ls.created_at,
    ls.updated_at
FROM  loan_securities ls
JOIN  loan_scheme_security_master lssm ON lssm.security_id = ls.security_type_id
WHERE ls.is_deleted = FALSE;


-- ---------------------------------------------------------
-- 12. Convenience view — gold loan with appraisal detail
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW v_gold_security_summary AS
SELECT
    ls.id            AS security_id,
    ls.security_ref_no,
    ls.loan_application_id,
    ls.security_status,
    ls.lien_marked,
    gd.gold_form,
    gd.purity_karat,
    gd.number_of_items,
    gd.gross_weight_grams,
    gd.net_weight_grams,
    gd.packet_no,
    gd.appraiser_name,
    gd.gold_rate_per_gram,
    gd.gold_rate_date,
    gd.market_value,
    gd.storage_location,
    ls.assessed_value,
    ls.valuation_date
FROM  loan_securities ls
JOIN  security_gold_details gd ON gd.security_id = ls.id
WHERE ls.is_deleted = FALSE;
