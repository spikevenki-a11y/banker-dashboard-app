-- =========================================================
-- SAVINGS ACCOUNTS - SECONDARY HOLDER
-- Joint operation types (Either or Survivor, Joint, Former or Survivor,
-- Latter or Survivor) record a secondary holder's membership number.
-- SINGLE accounts leave it NULL.
-- =========================================================

ALTER TABLE public.savings_accounts
    ADD COLUMN IF NOT EXISTS secondary_membership_no BIGINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_accounts_secondary_membership_no_fkey'
  ) THEN
    ALTER TABLE public.savings_accounts
      ADD CONSTRAINT savings_accounts_secondary_membership_no_fkey
      FOREIGN KEY (secondary_membership_no) REFERENCES memberships (membership_no);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_accounts_secondary_holder_check'
  ) THEN
    ALTER TABLE public.savings_accounts
      ADD CONSTRAINT savings_accounts_secondary_holder_check
      CHECK (secondary_membership_no IS NULL OR secondary_membership_no <> membership_no);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_savings_accounts_secondary_membership
    ON public.savings_accounts (secondary_membership_no)
    WHERE secondary_membership_no IS NOT NULL;
