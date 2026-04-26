-- =========================================================
-- Gold Items Table — individual ornament-level tracking
-- Each row is one ornament/item pledged under a gold security.
-- Aggregated totals are stored in security_gold_details.
-- =========================================================

CREATE TABLE security_gold_items (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id         UUID         NOT NULL,
    item_seq            SMALLINT     NOT NULL DEFAULT 1,
    ornament_name       VARCHAR(100) NOT NULL,
    gold_form           VARCHAR(30)  NOT NULL DEFAULT 'ORNAMENTS',  -- ORNAMENTS | COIN | BAR | BISCUIT
    purity_karat        SMALLINT     NOT NULL DEFAULT 22,
    number_of_pieces    SMALLINT     NOT NULL DEFAULT 1,
    gross_weight_grams  NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    stone_weight_grams  NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    net_weight_grams    NUMERIC(10,3),                              -- gross − stone; stored for audit
    created_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_sgi_security FOREIGN KEY (security_id) REFERENCES loan_securities(id)
);

CREATE INDEX idx_sgi_security ON security_gold_items(security_id);
