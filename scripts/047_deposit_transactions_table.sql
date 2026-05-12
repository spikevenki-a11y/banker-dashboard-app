-- =========================================================
-- Deposit Transactions Module Table
-- Provides module-level transaction ledger for all deposit
-- operations (credit installments, premature/maturity closure)
-- alongside gl_batches and gl_batch_lines for double-entry GL.
-- =========================================================

CREATE TABLE IF NOT EXISTS deposit_transactions (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id        INT          NOT NULL,
    account_number   VARCHAR(20)  NOT NULL,

    transaction_date DATE         NOT NULL,
    value_date       DATE         NOT NULL,

    -- DEPOSIT | CLOSURE | INTEREST_PAYOUT
    transaction_type VARCHAR(30)  NOT NULL,
    -- CASH | TRANSFER
    voucher_type     VARCHAR(15)  NOT NULL,

    debit_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
    credit_amount    NUMERIC(18,2) NOT NULL DEFAULT 0,
    running_balance  NUMERIC(18,2) NOT NULL DEFAULT 0,

    narration        TEXT,
    voucher_no       INTEGER      NOT NULL,
    gl_batch_id      BIGINT,

    -- PENDING | APPROVED | REJECTED
    status           VARCHAR(15)  NOT NULL DEFAULT 'PENDING',

    created_by       UUID,
    created_at       TIMESTAMP    WITHOUT TIME ZONE DEFAULT now(),

    CONSTRAINT fk_dt_branch
        FOREIGN KEY (branch_id) REFERENCES branchparameters(branch_id),
    CONSTRAINT fk_dt_batch
        FOREIGN KEY (branch_id, gl_batch_id) REFERENCES gl_batches(branch_id, batch_id)
);

CREATE INDEX idx_dt_account   ON deposit_transactions(account_number, branch_id);
CREATE INDEX idx_dt_date      ON deposit_transactions(transaction_date DESC);
CREATE INDEX idx_dt_batch     ON deposit_transactions(gl_batch_id);
