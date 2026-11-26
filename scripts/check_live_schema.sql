-- Run this in the Supabase SQL editor BEFORE deploying the report bot (after 087 + 088).
-- The migration files in scripts/ don't fully match the live DB (see SCHEMA_NOTES.md §4),
-- so this confirms every column the report catalog relies on actually exists.
-- Any row returned = a column the catalog uses that is missing live → tell me and I'll remap it.

WITH needed(tbl, col) AS (VALUES
  ('memberships','membership_no'),('memberships','customer_code'),('memberships','branch_id'),('memberships','membership_class'),
  ('memberships','member_type'),('memberships','status'),('memberships','join_date'),('memberships','close_date'),
  ('customers','customer_code'),('customers','full_name'),('customers','father_name'),('customers','mobile_no'),
  ('customers','gender'),('customers','caste_category'),('customers','occupation'),
  ('customer_address','customer_code'),('customer_address','village'),('customer_address','thaluk'),('customer_address','district'),
  ('branchparameters','branch_id'),('branchparameters','branch_name'),
  ('loan_applications','loan_application_id'),('loan_applications','branch_id'),('loan_applications','membership_no'),
  ('loan_applications','scheme_id'),('loan_applications','loan_purpose'),('loan_applications','application_status'),
  ('loan_applications','applied_loan_amount'),('loan_applications','loan_outstanding'),('loan_applications','overdue_days'),
  ('loan_applications','npa_flag'),('loan_applications','application_date'),
  ('loan_sanction_details','loan_application_id'),('loan_sanction_details','branch_id'),('loan_sanction_details','sanctioned_amount'),
  ('loan_sanction_details','sanction_date'),('loan_sanction_details','interest_rate'),('loan_sanction_details','repayment_type'),
  ('loan_sanction_details','created_at'),
  ('loan_schemes','scheme_id'),('loan_schemes','branch_id'),('loan_schemes','scheme_name'),('loan_schemes','loan_type'),
  ('loan_repayment_schedule_details','loan_account_no'),('loan_repayment_schedule_details','payment_status'),
  ('loan_repayment_schedule_details','total_installment'),('loan_repayment_schedule_details','due_date'),
  ('loan_transaction_details','loan_account_no'),('loan_transaction_details','branch_id'),('loan_transaction_details','transaction_date'),
  ('loan_transaction_details','transaction_type'),('loan_transaction_details','credit_principal_amount'),
  ('loan_transaction_details','credit_interest_amount'),('loan_transaction_details','debit_amount'),
  ('member_share_transactions','membership_no'),('member_share_transactions','branch_id'),('member_share_transactions','status'),
  ('member_share_transactions','credit_amount'),('member_share_transactions','debit_amount'),
  ('savings_accounts','account_number'),('savings_accounts','branch_id'),('savings_accounts','scheme_id'),('savings_accounts','membership_no'),
  ('savings_accounts','available_balance'),('savings_accounts','accrued_interest_balance'),('savings_accounts','account_status'),
  ('savings_accounts','operation_type'),('savings_accounts','opening_date'),('savings_accounts','account_closed_date'),
  ('savings_schemes','scheme_id'),('savings_schemes','branch_id'),('savings_schemes','scheme_name'),
  ('savings_transactions','account_number'),('savings_transactions','branch_id'),('savings_transactions','transaction_date'),
  ('savings_transactions','transaction_type'),('savings_transactions','voucher_type'),('savings_transactions','status'),
  ('savings_transactions','credit_amount'),('savings_transactions','debit_amount'),
  ('deposit_account','accountnumber'),('deposit_account','branch_id'),('deposit_account','schemeid'),('deposit_account','deposittype'),
  ('deposit_account','membership_no'),('deposit_account','accountstatus'),('deposit_account','clearbalance'),
  ('deposit_account','rateofinterest'),('deposit_account','interestpaidamount'),('deposit_account','interestdueforpayment'),
  ('deposit_account','tdsrecovered'),('deposit_account','accountopendate'),('deposit_account','accountclosedate'),
  ('deposit_account','interest_category'),
  ('deposit_schemes','scheme_id'),('deposit_schemes','branch_id'),('deposit_schemes','scheme_name'),('deposit_schemes','deposit_type'),
  ('term_deposit_details','accountnumber'),('term_deposit_details','depositamount'),('term_deposit_details','maturitydate'),
  ('term_deposit_details','maturityamount'),
  ('recurring_deposit_details','accountnumber'),('recurring_deposit_details','installment_amount'),
  ('recurring_deposit_details','maturitydate'),('recurring_deposit_details','maturityamount'),
  ('ref_account_status','account_status_id'),('ref_account_status','account_status_name'),
  ('gl_batches','batch_id'),('gl_batches','branch_id'),('gl_batches','status'),('gl_batches','voucher_type'),('gl_batches','voucher_id'),
  ('gl_batch_lines','batch_id'),('gl_batch_lines','branch_id'),('gl_batch_lines','business_date'),('gl_batch_lines','accountcode'),
  ('gl_batch_lines','debit_amount'),('gl_batch_lines','credit_amount'),('gl_batch_lines','narration'),
  ('chart_of_accounts','accountcode'),('chart_of_accounts','branch_id'),('chart_of_accounts','accountname'),
  ('chart_of_accounts','accounttypecode'),
  ('loan_securities','id'),('loan_securities','loan_application_id'),('loan_securities','branch_id'),('loan_securities','is_deleted'),
  ('security_gold_details','security_id'),('security_gold_details','number_of_items'),('security_gold_details','gross_weight_grams'),
  ('security_gold_details','stone_weight_grams'),('security_gold_details','net_weight_grams'),('security_gold_details','packet_no'),
  ('security_gold_details','purity_karat'),('security_gold_details','market_value'),('security_gold_details','max_sanction_amount'),
  ('deposit_transactions','accountnumber'), ('deposit_transactions','transaction_date'), ('deposit_transactions','branch_id'), ('deposit_transactions','transaction_type'), ('deposit_transactions','narration'), ('deposit_transactions','voucher_type'), ('deposit_transactions','credit_amount'), ('deposit_transactions','debit_amount'), ('deposit_transactions','status'),
  ('rd_installment_details','branch_id'), ('rd_installment_details','accountnumber'), ('rd_installment_details','installment_number'), ('rd_installment_details','installment_amount'), ('rd_installment_details','installment_due_date'), ('rd_installment_details','installment_paid_date'), ('rd_installment_details','penalty_collected'),
  ('loan_repayment_schedule_details','principal_amount'), ('loan_repayment_schedule_details','interest_amount'), ('loan_repayment_schedule_details','balance_principal'), ('loan_repayment_schedule_details','installment_type'), ('loan_repayment_schedule_details','installment_no'),
  ('loan_scheme_security_master','security_id'), ('loan_scheme_security_master','security_name'),
  ('loan_securities','security_type_id'), ('loan_securities','security_ref_no'), ('loan_securities','description'), ('loan_securities','security_status'), ('loan_securities','verification_status'), ('loan_securities','lien_marked'), ('loan_securities','assessed_value'), ('loan_securities','forced_sale_value'), ('loan_securities','valuation_date'), ('loan_securities','lien_release_date'),
  ('chart_of_accounts','parentaccountcode'), ('chart_of_accounts','accountbalance'),
  ('lockers','id'), ('lockers','branch_id'), ('lockers','locker_no'), ('lockers','locker_type_id'), ('lockers','cabinet_no'), ('lockers','status'),
  ('locker_types','locker_type_id'), ('locker_types','branch_id'), ('locker_types','type_name'), ('locker_types','annual_rent'),
  ('locker_assignments','locker_id'), ('locker_assignments','membership_no'), ('locker_assignments','assigned_date'), ('locker_assignments','expiry_date'), ('locker_assignments','annual_rent'), ('locker_assignments','deposit_amount'), ('locker_assignments','status'),
  ('asset_items','branch_id'), ('asset_items','asset_id'), ('asset_items','asset_name'), ('asset_items','category_id'),
  ('asset_categories','category_id'), ('asset_categories','category_name'),
  ('asset_purchase_items','branch_id'), ('asset_purchase_items','asset_id'), ('asset_purchase_items','quantity'), ('asset_purchase_items','total_cost'),
  ('asset_depreciation_details','branch_id'), ('asset_depreciation_details','asset_id'), ('asset_depreciation_details','depreciation_date'), ('asset_depreciation_details','accumulated_depreciation'), ('asset_depreciation_details','book_value'),
  ('asset_sales_details','branch_id'), ('asset_sales_details','asset_id'), ('asset_sales_details','sale_date'), ('asset_sales_details','sale_amount'),
  ('borrowing_master','branch_id'), ('borrowing_master','account_number'), ('borrowing_master','borrowing_head'), ('borrowing_master','date_of_sanction'), ('borrowing_master','ledger_balance'), ('borrowing_master','status'),
  ('borrowing_transactions','branch_id'), ('borrowing_transactions','account_number'), ('borrowing_transactions','transaction_date'), ('borrowing_transactions','voucher_no'), ('borrowing_transactions','voucher_type'), ('borrowing_transactions','transaction_type'), ('borrowing_transactions','drawal_amount'), ('borrowing_transactions','repayment_amount'), ('borrowing_transactions','interest_amount'), ('borrowing_transactions','status'),
  ('investment_master','branch_id'), ('investment_master','account_number'), ('investment_master','investment_head'), ('investment_master','date_of_investment'), ('investment_master','ledger_balance'), ('investment_master','status'),
  ('investment_transactions','branch_id'), ('investment_transactions','account_number'), ('investment_transactions','transaction_date'), ('investment_transactions','voucher_no'), ('investment_transactions','transaction_type'), ('investment_transactions','debit_amount'), ('investment_transactions','credit_amount'), ('investment_transactions','interest_amount'), ('investment_transactions','status'),
  ('bank_accounts','branch_id'), ('bank_accounts','account_number'), ('bank_accounts','account_head'), ('bank_accounts','date_of_account_opening'), ('bank_accounts','account_balance'), ('bank_accounts','status'),
  ('bank_accounts_transactions','branch_id'), ('bank_accounts_transactions','account_number'), ('bank_accounts_transactions','transaction_date'), ('bank_accounts_transactions','voucher_no'), ('bank_accounts_transactions','transaction_type'), ('bank_accounts_transactions','debit_amount'), ('bank_accounts_transactions','credit_amount'), ('bank_accounts_transactions','interest_amount'), ('bank_accounts_transactions','status'),
  ('income_accounts','branch_id'), ('income_accounts','account_number'), ('income_accounts','account_name'), ('income_accounts','opening_date'), ('income_accounts','closing_date'), ('income_accounts','current_balance'), ('income_accounts','account_status'),
  ('income_transactions','branch_id'), ('income_transactions','account_number'), ('income_transactions','transaction_date'), ('income_transactions','voucher_no'), ('income_transactions','voucher_type'), ('income_transactions','description'), ('income_transactions','debit_amount'), ('income_transactions','credit_amount'),
  ('expense_accounts','branch_id'), ('expense_accounts','account_number'), ('expense_accounts','account_name'), ('expense_accounts','opening_date'), ('expense_accounts','closing_date'), ('expense_accounts','current_balance'), ('expense_accounts','account_status'),
  ('expense_transactions','branch_id'), ('expense_transactions','account_number'), ('expense_transactions','transaction_date'), ('expense_transactions','voucher_no'), ('expense_transactions','voucher_type'), ('expense_transactions','description'), ('expense_transactions','debit_amount'), ('expense_transactions','credit_amount'),
  ('sundry_creditors','branch_id'), ('sundry_creditors','account_number'), ('sundry_creditors','account_name'), ('sundry_creditors','account_opened_date'), ('sundry_creditors','account_closed_date'), ('sundry_creditors','ledger_balance'), ('sundry_creditors','account_status'),
  ('sundry_debitors','branch_id'), ('sundry_debitors','account_number'), ('sundry_debitors','account_name'), ('sundry_debitors','account_opened_date'), ('sundry_debitors','account_closed_date'), ('sundry_debitors','ledger_balance'), ('sundry_debitors','account_status'),
  ('reserve_and_fund_master','branch_id'), ('reserve_and_fund_master','account_number'), ('reserve_and_fund_master','account_name'), ('reserve_and_fund_master','account_opened_date'), ('reserve_and_fund_master','account_closed_date'), ('reserve_and_fund_master','ledger_balance'), ('reserve_and_fund_master','account_status'),
  ('provisions_master','branch_id'), ('provisions_master','account_number'), ('provisions_master','account_name'), ('provisions_master','account_opened_date'), ('provisions_master','account_closed_date'), ('provisions_master','ledger_balance'), ('provisions_master','account_status'),
  ('other_assets_master','branch_id'), ('other_assets_master','account_number'), ('other_assets_master','account_name'), ('other_assets_master','account_opened_date'), ('other_assets_master','account_closed_date'), ('other_assets_master','ledger_balance'), ('other_assets_master','account_status'),
  ('other_liabilities_master','branch_id'), ('other_liabilities_master','account_number'), ('other_liabilities_master','account_name'), ('other_liabilities_master','account_opened_date'), ('other_liabilities_master','account_closed_date'), ('other_liabilities_master','ledger_balance'), ('other_liabilities_master','account_status'),
  ('grands_and_subsidies_master','branch_id'), ('grands_and_subsidies_master','account_number'), ('grands_and_subsidies_master','account_name'), ('grands_and_subsidies_master','account_opened_date'), ('grands_and_subsidies_master','account_closed_date'), ('grands_and_subsidies_master','ledger_balance'), ('grands_and_subsidies_master','account_status'),
  ('sundry_creditor_transactions','branch_id'), ('sundry_creditor_transactions','account_number'), ('sundry_creditor_transactions','transaction_date'), ('sundry_creditor_transactions','voucher_no'), ('sundry_creditor_transactions','voucher_type'), ('sundry_creditor_transactions','description'), ('sundry_creditor_transactions','debit_amount'), ('sundry_creditor_transactions','credit_amount'),
  ('sundry_debitors_transactions','branch_id'), ('sundry_debitors_transactions','account_number'), ('sundry_debitors_transactions','transaction_date'), ('sundry_debitors_transactions','voucher_no'), ('sundry_debitors_transactions','voucher_type'), ('sundry_debitors_transactions','description'), ('sundry_debitors_transactions','debit_amount'), ('sundry_debitors_transactions','credit_amount'),
  ('reserve_and_fund_transactions','branch_id'), ('reserve_and_fund_transactions','account_number'), ('reserve_and_fund_transactions','transaction_date'), ('reserve_and_fund_transactions','voucher_no'), ('reserve_and_fund_transactions','voucher_type'), ('reserve_and_fund_transactions','description'), ('reserve_and_fund_transactions','debit_amount'), ('reserve_and_fund_transactions','credit_amount'),
  ('provisions_transactions','branch_id'), ('provisions_transactions','account_number'), ('provisions_transactions','transaction_date'), ('provisions_transactions','voucher_no'), ('provisions_transactions','voucher_type'), ('provisions_transactions','description'), ('provisions_transactions','debit_amount'), ('provisions_transactions','credit_amount'),
  ('other_assets_transactions','branch_id'), ('other_assets_transactions','account_number'), ('other_assets_transactions','transaction_date'), ('other_assets_transactions','voucher_no'), ('other_assets_transactions','voucher_type'), ('other_assets_transactions','description'), ('other_assets_transactions','debit_amount'), ('other_assets_transactions','credit_amount'),
  ('other_liabilities_transactions','branch_id'), ('other_liabilities_transactions','account_number'), ('other_liabilities_transactions','transaction_date'), ('other_liabilities_transactions','voucher_no'), ('other_liabilities_transactions','voucher_type'), ('other_liabilities_transactions','description'), ('other_liabilities_transactions','debit_amount'), ('other_liabilities_transactions','credit_amount'),
  ('grands_and_subsidies_transactions','branch_id'), ('grands_and_subsidies_transactions','account_number'), ('grands_and_subsidies_transactions','transaction_date'), ('grands_and_subsidies_transactions','voucher_no'), ('grands_and_subsidies_transactions','voucher_type'), ('grands_and_subsidies_transactions','description'), ('grands_and_subsidies_transactions','debit_amount'), ('grands_and_subsidies_transactions','credit_amount')
)
SELECT n.tbl, n.col, 'MISSING' AS problem
FROM needed n
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = n.tbl AND c.column_name = n.col
WHERE c.column_name IS NULL
ORDER BY 1, 2;

-- Data sanity checks (each should return 0 rows / small numbers):
-- a) duplicate address rows per customer (bot takes the first one)
-- SELECT customer_code, COUNT(*) FROM customer_address GROUP BY 1 HAVING COUNT(*) > 1 LIMIT 20;
-- b) deposit account numbers reused across branches (term/RD detail tables have no branch_id)
-- SELECT accountnumber, COUNT(DISTINCT branch_id) FROM deposit_account GROUP BY 1 HAVING COUNT(DISTINCT branch_id) > 1 LIMIT 20;
-- c) actual status values in use
-- SELECT 'loan' t, application_status v, COUNT(*) FROM loan_applications GROUP BY 2
-- UNION ALL SELECT 'savings', account_status, COUNT(*) FROM savings_accounts GROUP BY 2
-- UNION ALL SELECT 'member', status, COUNT(*) FROM memberships GROUP BY 2
-- UNION ALL SELECT 'share_txn', status, COUNT(*) FROM member_share_transactions GROUP BY 2
-- UNION ALL SELECT 'schedule', payment_status, COUNT(*) FROM loan_repayment_schedule_details GROUP BY 2
-- UNION ALL SELECT 'loan_txn', transaction_type, COUNT(*) FROM loan_transaction_details GROUP BY 2 ORDER BY 1, 3 DESC;
-- d) loans with no DISBURSEMENT entry in loan_transaction_details. "Outstanding as on <past date>"
--    is rebuilt from that ledger, so these loans would show 0 for past dates (e.g. migrated old loans).
-- SELECT la.branch_id, COUNT(*) AS loans_without_disbursement_txn
-- FROM loan_applications la
-- WHERE la.application_status IN ('ACTIVE','OVERDUE')
--   AND NOT EXISTS (SELECT 1 FROM loan_transaction_details t
--                   WHERE t.loan_account_no = la.loan_application_id::text AND t.branch_id = la.branch_id AND t.debit_amount > 0)
-- GROUP BY 1;
-- e) gold loans with no weight recorded (old loans entered before the gold security screen)
-- SELECT COUNT(*) FROM loan_applications la JOIN loan_schemes ls ON ls.scheme_id = la.scheme_id AND ls.branch_id = la.branch_id
-- WHERE (ls.scheme_name ILIKE '%JEWEL%' OR ls.scheme_name ILIKE '%GOLD%') AND la.application_status IN ('ACTIVE','OVERDUE')
--   AND NOT EXISTS (SELECT 1 FROM loan_securities s JOIN security_gold_details g ON g.security_id = s.id
--                   WHERE s.loan_application_id = la.loan_application_id AND s.branch_id = la.branch_id);
