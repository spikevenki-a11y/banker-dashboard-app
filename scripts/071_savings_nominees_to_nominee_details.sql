-- =========================================================
-- SAVINGS NOMINEES -> nominee_details
-- Savings Management (Open Account, View / Modify Account) now reads and writes
-- nominees in nominee_details (070). This copies any nominees still held in the
-- old savings_account_nominees table. Safe to re-run: accounts that already have
-- rows in nominee_details are skipped, and nothing happens if the old table is gone.
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_nominee_details_account
    ON nominee_details (branch_id, account_number);

DO $$
BEGIN
  IF to_regclass('public.savings_account_nominees') IS NOT NULL THEN
    INSERT INTO nominee_details (
      branch_id, account_number, is_member, member_id,
      nominee_name, nominee_relation, created_at, updated_at
    )
    SELECT
      CAST(sa.branch_id AS VARCHAR),
      san.account_number,
      false,
      CAST(sa.membership_no AS VARCHAR),
      LEFT(san.nominee_name, 100),
      san.relation,
      -- keep the original nominee order
      COALESCE(san.created_at, NOW()) + (san.nominee_order * INTERVAL '1 millisecond'),
      NOW()
    FROM savings_account_nominees san
    JOIN savings_accounts sa ON sa.account_number = san.account_number
    WHERE NOT EXISTS (
      SELECT 1 FROM nominee_details nd
      WHERE nd.account_number = san.account_number
        AND nd.branch_id = CAST(sa.branch_id AS VARCHAR)
    );
  END IF;
END $$;
