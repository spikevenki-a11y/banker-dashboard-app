CREATE TABLE member_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  membership_id UUID NOT NULL
    REFERENCES memberships(id)
    ON DELETE RESTRICT,

  share_amount NUMERIC(12,2) NOT NULL
    CHECK (share_amount >= 0),

  share_opened_date DATE NOT NULL,

  closing_date DATE NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'CLOSED')),

  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

  CONSTRAINT member_shares_unique_membership
    UNIQUE (membership_id)
);


CREATE TABLE member_share_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  branch_id BIGINT NOT NULL
    REFERENCES branchparameters(branch_id),

  membership_id UUID NOT NULL
    REFERENCES memberships(id),

  voucher_type VARCHAR(15) NOT NULL
    CHECK (voucher_type IN ('CASH','TRANSFER','ADJUSTMENT')),

  -- Debit / Credit (one side only)
  debit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,

  business_date DATE NOT NULL,

  gl_batch_id BIGINT NOT NULL
    REFERENCES gl_batches(batch_id),

  voucher_no INTEGER NOT NULL,

  status VARCHAR(15) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),

  narration TEXT,

  created_at TIMESTAMP DEFAULT now(),
  created_by UUID NOT NULL,

  CONSTRAINT chk_share_debit_credit
    CHECK (
      (debit_amount > 0 AND credit_amount = 0)
      OR
      (credit_amount > 0 AND debit_amount = 0)
    )
);


CREATE INDEX idx_share_txn_membership
ON member_share_transactions(membership_id);

CREATE INDEX idx_share_txn_branch_date
ON member_share_transactions(branch_id, business_date);

CREATE INDEX idx_share_txn_batch
ON member_share_transactions(gl_batch_id);
