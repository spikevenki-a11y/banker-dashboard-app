create table public.sundry_creditor_transactions (
  id uuid not null default gen_random_uuid (),
  branch_id integer not null,
  account_number character varying(50) not null,
  transaction_date date not null,
  voucher_type character varying(20) not null,
  description text null,
  debit_amount numeric(18, 2) null default 0,
  credit_amount numeric(18, 2) null default 0,
  running_balance numeric(18, 2) null default 0,
  reference_no character varying(50) null,
  gl_batch_id integer null,
  voucher_no integer null,
  created_by uuid not null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint sundry_creditor_transactions_pkey primary key (id)
) TABLESPACE pg_default;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sundry_creditor_txn_branch ON sundry_creditor_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_sundry_creditor_txn_account ON sundry_creditor_transactions(account_number);
CREATE INDEX IF NOT EXISTS idx_sundry_creditor_txn_date ON sundry_creditor_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sundry_creditor_txn_batch ON sundry_creditor_transactions(gl_batch_id);

-- Add updated_at column to sundry_creditors if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sundry_creditors' AND column_name = 'updated_at') THEN
        ALTER TABLE sundry_creditors ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
