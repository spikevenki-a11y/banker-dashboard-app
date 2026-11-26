-- 087_report_bot.sql — support objects for the custom report bot (/api/report-chat)
-- Safe to re-run. No existing table or data is changed.

-- 1. Audit log: every question, the spec it produced, outcome. Also the list of
--    unmatched questions you use to add synonyms to lib/report-bot/catalog.ts.
CREATE TABLE IF NOT EXISTS report_bot_log (
  id          BIGSERIAL PRIMARY KEY,
  branch_id   BIGINT,
  user_id     TEXT,
  question    TEXT,
  spec        JSONB,
  status      VARCHAR(500),
  row_count   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_bot_log_branch_date ON report_bot_log (branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_bot_log_unmatched ON report_bot_log (created_at DESC) WHERE status = 'UNMATCHED';

-- 2. Indexes on the join / filter columns the report queries use.
--    Today most of these tables only have a primary-key index, so every report
--    is a full scan; fine at 5k rows, slow at 5 lakh.
CREATE INDEX IF NOT EXISTS idx_memberships_branch_no        ON memberships (branch_id, membership_no);
CREATE INDEX IF NOT EXISTS idx_customer_address_code        ON customer_address (customer_code);
CREATE INDEX IF NOT EXISTS idx_loan_app_branch_status       ON loan_applications (branch_id, application_status);
CREATE INDEX IF NOT EXISTS idx_loan_app_branch_appid        ON loan_applications (branch_id, loan_application_id);
CREATE INDEX IF NOT EXISTS idx_loan_sanction_app            ON loan_sanction_details (loan_application_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_loan_sched_acct_status       ON loan_repayment_schedule_details (loan_account_no, payment_status);
CREATE INDEX IF NOT EXISTS idx_loan_txn_branch_date         ON loan_transaction_details (branch_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_loan_txn_acct                ON loan_transaction_details (loan_account_no);
CREATE INDEX IF NOT EXISTS idx_savings_acc_branch           ON savings_accounts (branch_id, account_number);
CREATE INDEX IF NOT EXISTS idx_deposit_acc_branch           ON deposit_account (branch_id, accountnumber);
CREATE INDEX IF NOT EXISTS idx_term_dep_acct                ON term_deposit_details (accountnumber);
CREATE INDEX IF NOT EXISTS idx_rd_acct                      ON recurring_deposit_details (accountnumber);
CREATE INDEX IF NOT EXISTS idx_share_txn_branch_member      ON member_share_transactions (branch_id, membership_no);
CREATE INDEX IF NOT EXISTS idx_gl_lines_branch_date         ON gl_batch_lines (branch_id, business_date);
CREATE INDEX IF NOT EXISTS idx_gl_lines_branch_batch        ON gl_batch_lines (branch_id, batch_id);

-- 3. (Recommended) a SELECT-only login for the report bot.
--    Run once as the postgres/admin user, then point REPORTS_DATABASE_URL at it
--    and create a second pg Pool for /api/report-chat. The route already uses
--    BEGIN READ ONLY, so this is defence in depth.
-- CREATE ROLE report_reader LOGIN PASSWORD 'change-me';
-- GRANT USAGE ON SCHEMA public TO report_reader;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO report_reader;
-- GRANT INSERT ON report_bot_log TO report_reader;
-- GRANT USAGE ON SEQUENCE report_bot_log_id_seq TO report_reader;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO report_reader;
