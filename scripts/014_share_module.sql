create table public.member_shares (
  id uuid not null default gen_random_uuid (),
  membership_id uuid not null,
  share_balance numeric(12, 2) not null,
  share_opened_date date not null,
  closing_date date null,
  status character varying(20) not null default 'ACTIVE'::character varying,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  branch_id bigint not null,
  membership_no bigint null,
  constraint member_shares_pkey primary key (id),
  constraint member_shares_unique_membership unique (membership_id),
  constraint member_shares_membership_id_fkey foreign KEY (membership_id) references memberships (id) on delete RESTRICT,
  constraint member_shares_share_amount_check check ((share_balance >= (0)::numeric)),
  constraint member_shares_status_check check (
    (
      (status)::text = any (
        (
          array[
            'ACTIVE'::character varying,
            'CLOSED'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;


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
