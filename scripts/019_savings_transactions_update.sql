-- Migration: Update savings_transactions to align with share transactions pattern
-- Adds voucher_type column if not present, and ensures proper structure

-- Add voucher_type column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_transactions' AND column_name = 'voucher_type'
  ) THEN
    ALTER TABLE savings_transactions ADD COLUMN voucher_type VARCHAR(15) CHECK (voucher_type IN ('CASH','TRANSFER'));
  END IF;
END $$;

-- Add voucher_no column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_transactions' AND column_name = 'voucher_no'
  ) THEN
    ALTER TABLE savings_transactions ADD COLUMN voucher_no INTEGER;
  END IF;
END $$;

-- Add gl_batch_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_transactions' AND column_name = 'gl_batch_id'
  ) THEN
    ALTER TABLE savings_transactions ADD COLUMN gl_batch_id BIGINT;
  END IF;
END $$;

-- Add debit_amount column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_transactions' AND column_name = 'debit_amount'
  ) THEN
    ALTER TABLE savings_transactions ADD COLUMN debit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- Add credit_amount column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_transactions' AND column_name = 'credit_amount'
  ) THEN
    ALTER TABLE savings_transactions ADD COLUMN credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- Add running_balance column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_transactions' AND column_name = 'running_balance'
  ) THEN
    ALTER TABLE savings_transactions ADD COLUMN running_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- Add narration column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_transactions' AND column_name = 'narration'
  ) THEN
    ALTER TABLE savings_transactions ADD COLUMN narration TEXT;
  END IF;
END $$;

-- Add branch_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_transactions' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE savings_transactions ADD COLUMN branch_id BIGINT REFERENCES branchparameters(branch_id);
  END IF;
END $$;

-- Create index on gl_batch_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_savings_txn_gl_batch ON savings_transactions(gl_batch_id);
