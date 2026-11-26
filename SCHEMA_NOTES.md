# Report Bot — Schema Analysis (banker-dashboard-app)

Source: `scripts/001…086` (85 migration files, ~7,000 lines) replayed into a scratch PostgreSQL 16. The schema was then cross-checked against the SQL in `app/api/**` and `lib/**`. 142 tables were rebuilt. The report bot uses 21 of them.

## 1. Module → tables

| Module | Tables used for reports |
|---|---|
| Branch | `branchparameters` (branch_id, branch_name, parent_branch_id, hierarchy_level, region_office) |
| Customer / Member | `customers` (customer_code), `customer_address` (village, thaluk, district) — *table not in migrations, exists live*, `memberships` (membership_no, class A/B, status) |
| Share | `member_share_transactions` (credit − debit, status COMPLETED) |
| Loans | `loan_applications` (portfolio + `loan_outstanding`, `overdue_days`, `npa_flag`), `loan_sanction_details`, `loan_schemes`, `loan_repayment_schedule_details`, `loan_transaction_details` |
| Savings | `savings_accounts`, `savings_schemes`, `savings_transactions` |
| Deposits | `deposit_account`, `deposit_schemes`, `term_deposit_details`, `recurring_deposit_details`, `ref_account_status` |
| GL | `gl_batches` (voucher header + status), `gl_batch_lines` (Dr/Cr per account), `chart_of_accounts` |

## 2. Join keys (with the type traps)

| From → To | Join | Watch out |
|---|---|---|
| loan / savings / deposit → member | `m.membership_no::text = x.membership_no::text AND m.branch_id = x.branch_id` | membership_no is **TEXT** in memberships & loan_applications, **BIGINT** in savings_accounts, **NUMERIC** in deposit_account. Always compare `::text`. |
| member → customer | `c.customer_code = m.customer_code` | customers.customer_code is CHAR (padded); equality still works |
| member → address | `customer_address.customer_code` | may hold >1 row per customer → bot takes 1 row (LATERAL … LIMIT 1) so totals don't double |
| loan → sanction | `lsd.loan_application_id = la.loan_application_id AND branch_id` | can be >1 sanction row → bot takes the latest by sanction_date |
| loan → schedule / ledger | `loan_account_no = la.loan_application_id::text` | "loan account no" is the application id stored as text |
| scheme | `scheme_id + branch_id` (all three scheme tables) | scheme ids repeat across branches |
| deposit → term / RD detail | `accountnumber` only | detail tables have **no branch_id**. Fine only if account numbers are unique across branches (check query (b)) |
| GL line → header | `batch_id + branch_id` | |
| GL line → account | `accountcode + branch_id` | |

## 3. Codes the bot relies on

- `deposit_account.accountstatus` → `ref_account_status`: 0 Pending, 1 Active, 2 Freeze, 3 Inactive, 4 Dormant, 5 Maturity, 6/7 Partial Dr/Cr Freeze, 8 Lien, 9 Closed, 10 Premature Closure, 11 Rejected
- `chart_of_accounts.accounttypecode`: 1 Liabilities, 2 Assets, 3 Income, 4 Expense
- Passed GL vouchers: `gb.status` in COMPLETED / APPROVED / PASSED / POSTED, the same rule as the Day Book and accounting reports
- `loan_applications.application_status`: PENDING, SANCTIONED, ACTIVE, OVERDUE, CLOSED, REJECTED
- `loan_repayment_schedule_details.payment_status`: PENDING, PAID, OVERDUE
- `savings_accounts.account_status`: mixed case in code (ACTIVE / Active / active) → bot compares `UPPER()`

## 4. Migrations ≠ live database

The scripts don't rebuild the live DB on their own. 51 of the 85 files raised errors on a clean replay: SQL Server syntax (`NVARCHAR`, `GETDATE()`, `AUTO_INCREMENT`), `notnull` typos, `//` comments, a missing comma in `045_lockers_module.sql`, `ADD CONSTRAINT` inside `CREATE TABLE`, a filename containing a space (`012_chart_of_accounts .sql`), and files that depend on later-numbered files.

The app code also uses columns or tables that **no migration creates**:

| Table | Missing in scripts, used in code |
|---|---|
| `customer_address` | whole table |
| `member_share_transactions` | `membership_no` (scripts have `membership_id`); status `COMPLETED` is used by code but blocked by the scripts' CHECK constraint |
| `member_shares` | `branch_id`, `membership_no`, `share_balance` |
| `loan_applications` | `loan_tenure_months` |
| `memberships` | `board_resolution_date`, `board_resolution_number`, `ledger_folio_number` |
| `deposit_schemes` | `interest_policy_id` |
| `expense_transactions` | `gl_batch_id` |
| others | `nextnumber`, `user_webauthn_credentials`, `users.two_factor_*`, `lockers.location`, `sundry_creditors.description`, `asset_purchase_details.status` |

**Before go-live:** run `scripts/check_live_schema.sql` in Supabase. It lists any column the catalog uses that is missing live (expected result: 0 rows) and includes the data sanity checks below.

**Separately, worth doing:** take a `pg_dump --schema-only` of the live DB and commit it as `000_baseline.sql`. Then a new environment (staging, a second bank) can actually be built from the repo.

## 5. Data / accuracy notes

1. **"Outstanding" is today's balance.** `loan_applications.loan_outstanding` is a live figure. For "as on <past date>" the bot switches to *Outstanding (as on)*, which it rebuilds from `loan_transaction_details` (disbursed − principal repaid up to that date). Loans with no DISBURSEMENT row in that ledger (e.g. migrated old loans) show 0. Check query (d) counts them.
2. **Overdue is current.** It comes from schedule rows with `payment_status = 'OVERDUE'` (updated by day-end). There is no historical overdue snapshot.
3. **Indexes are mostly missing.** Most report tables only have a PK index. `087_report_bot.sql` adds 15 indexes on the join and filter columns.
4. `memberships.membership_no` has a global unique index in the scripts. If that's also true live, member numbers never repeat across branches.

## 6. What the bot can answer

Seven datasets with 145 fields in total. Every field was tested ungrouped, grouped, and filtered against the rebuilt schema, and returned 0 errors. Figures were checked on seeded sample data: dedup of address and sanction rows, row-level vs group-level filters, share balance, as-on balance.

| Dataset | Group by (examples) | Amounts |
|---|---|---|
| Loans | scheme, loan type, village, taluk, class, purpose, status, NPA, ageing bucket, month | sanctioned, outstanding, outstanding as on, overdue amount, overdue days, ROI, count |
| Loan transactions | date, month, scheme, loan, txn type | principal, interest, total collected, disbursed |
| Members | village, taluk, district, class, type, gender, caste category, occupation, status, month | share capital, count |
| Savings / Savings txns | scheme, status, village, date, month | balance, accrued interest, credit, debit |
| Deposits | scheme, FD/RD/Pigmy, status, interest category, maturity month | balance, deposit, maturity amount, interest paid/due, TDS |
| General ledger | account head, account type, voucher type, date, month | debit, credit, net |

Sample questions and what the parser produced:

```
branch wise jewel loan outstanding            → loans  group=[branch]  sum(outstanding)  scheme=JEWEL LOAN
scheme wise loan outstanding as on 31-03-2026 → loans  group=[scheme]  outstanding_as_on  to=2026-03-31
village wise overdue amount and count         → loans  group=[village] overdue_amount,count  overdue>0
ageing wise overdue                           → loans  group=[overdue_bucket] 0 / 1-90 / 91-180 / 181-365 / >1yr
npa loans overdue above 365 days              → loans  npa_status=NPA, overdue_days>365
how many active members                       → members summary count, status=ACTIVE
class wise share capital                      → members group=[member_class] sum(share_balance)
loan collection this month scheme wise        → loan_txns group=[scheme] principal+interest, type=REPAYMENT
monthly disbursement this year                → loan_txns group=[month] disbursed, FY 01-04..31-03
FD maturing next month                        → deposits type=T*, maturity_date in next month
head wise income this year                    → ledger group=[account_name] net, type=INCOME
எத்தனை உறுப்பினர்                              → members summary count
```

Amount filters apply to each record by default ("loans above 1 lakh"). With "total" they apply to the group ("scheme wise outstanding total above 10 lakh" → HAVING).

## 7. Files

| File | Purpose |
|---|---|
| `lib/report-bot/catalog.ts` | Whitelist of datasets, joins, fields, synonyms (English / Tanglish / Tamil). Add words here. |
| `lib/report-bot/spec.ts` | `ReportSpec`, the JSON shared by chat, the manual builder UI and saved reports |
| `lib/report-bot/parser.ts` | Rule-based question → spec (dates incl. FY Apr–Mar, lakh/crore, top N, X-wise) |
| `lib/report-bot/builder.ts` | Spec → one parameterized SELECT (branch scope `= ANY($1)`, 5,000-row cap) |
| `app/api/report-chat/route.ts` | POST endpoint: session branch, READ ONLY transaction, 15 s timeout, totals, audit log |
| `scripts/087_report_bot.sql` | `report_bot_log` table + indexes (+ optional read-only role) |
| `scripts/check_live_schema.sql` | Run on Supabase before deploying |
