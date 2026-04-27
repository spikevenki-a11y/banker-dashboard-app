-- Nominees for savings accounts (up to 4 per account)
CREATE TABLE savings_account_nominees (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number VARCHAR(20)  NOT NULL,
    nominee_name   VARCHAR(200) NOT NULL,
    relation       VARCHAR(50)  NOT NULL,
    nominee_order  SMALLINT     NOT NULL DEFAULT 1,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_san_account
        FOREIGN KEY (account_number)
        REFERENCES savings_accounts(account_number)
        ON DELETE CASCADE
);

CREATE INDEX idx_san_account ON savings_account_nominees(account_number);
