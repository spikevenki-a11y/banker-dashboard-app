// Report Bot catalog — mapped to the banker-dashboard-app schema (scripts/001…086 + live-DB drift found in app code).
// Only tables/columns listed here can ever appear in a generated query.
//
// Conventions in this schema (see SCHEMA_NOTES.md):
//  * Every business table is scoped by branch_id  →  builder always adds  <branchColumn> = ANY($1)
//  * membership_no is TEXT in memberships/loan_applications, BIGINT in savings_accounts, NUMERIC in deposit_account
//    → all member joins compare ::text
//  * Loan "account no" in loan_transaction_details / loan_repayment_schedule_details = loan_applications.loan_application_id::text
//  * deposit_account.accountstatus → ref_account_status (0 Pending, 1 Active, … 9 Closed, 10 Premature Closure, 11 Rejected)
//  * GL: only passed vouchers (COMPLETED/APPROVED/PASSED/POSTED), same rule as the Day Book / accounting reports
//  * chart_of_accounts.accounttypecode: 1 Liabilities, 2 Assets, 3 Income, 4 Expense

import type { Agg, Dataset, Field, FieldType } from "./catalog-types"
import { MORE_DATASETS, LEDGER_MODULE_WORDS } from "./catalog-more"
export type { Agg, Dataset, Field, FieldType }

// ---------- shared joins / fields ----------
const MEMBER_JOIN = (alias: string) => `
  LEFT JOIN memberships m ON m.membership_no::text = ${alias}.membership_no::text AND m.branch_id = ${alias}.branch_id
  LEFT JOIN customers c ON c.customer_code = m.customer_code
  LEFT JOIN LATERAL (SELECT * FROM customer_address x WHERE x.customer_code = m.customer_code LIMIT 1) ca ON true`

// member share capital up to the report date ({{AS_ON}})
const SHARE_JOIN = `
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(mst.credit_amount - mst.debit_amount),0) AS share_balance
    FROM member_share_transactions mst
    WHERE mst.membership_no::text = m.membership_no::text AND mst.branch_id = m.branch_id
      AND UPPER(mst.status) IN ('COMPLETED','APPROVED') AND mst.business_date <= {{AS_ON}}
  ) sh ON true`

const SHARE_FIELD: Field = {
  key: "share_balance", sql: "COALESCE(sh.share_balance,0)", label: "Share Capital", type: "number", aggregate: "SUM",
  synonyms: ["share", "share amount", "member share", "share capital", "share balance", "pangu", "பங்கு"],
}

const BRANCH_JOIN = (col: string) => `
  LEFT JOIN branchparameters bp ON bp.branch_id = ${col}`

const MEMBER_FIELDS: Field[] = [
  { key: "membership_no", sql: "m.membership_no", label: "Member No", type: "text", synonyms: ["member no", "membership no", "m.no"] },
  { key: "member_name", sql: "c.full_name", label: "Member Name", type: "text", synonyms: ["member name", "name", "borrower", "depositor", "member wise", "member-wise"] },
  { key: "mobile", sql: "c.mobile_no", label: "Mobile", type: "text", synonyms: ["mobile", "phone", "mobile no", "phone no", "cell"] },
  { key: "father_name", sql: "c.father_name", label: "Father / Husband", type: "text", synonyms: ["father", "father name", "husband", "husband name", "s/o", "w/o"] },
  { key: "village", sql: "ca.village", label: "Village", type: "text", synonyms: ["village", "ooru", "கிராமம்"] },
  { key: "taluk", sql: "ca.thaluk", label: "Taluk", type: "text", synonyms: ["taluk", "thaluk", "வட்டம்"] },
  { key: "member_class", sql: "m.membership_class", label: "Class", type: "text", synonyms: ["class", "a class", "b class"] },
  { key: "gender", sql: "c.gender", label: "Gender", type: "text", synonyms: ["gender", "male", "female"] },
  { key: "caste", sql: "c.caste_category", label: "Caste Category", type: "text", synonyms: ["caste", "community", "sc/st", "category"] },
]

const BRANCH_FIELD: Field = { key: "branch", sql: "bp.branch_name", label: "Branch", type: "text", synonyms: ["branch", "kilai", "கிளை"] }

const month = (dateSql: string): Field => ({
  key: "month", sql: `TO_CHAR(${dateSql}, 'YYYY-MM')`, label: "Month", type: "text", synonyms: ["month", "monthly", "maadham"],
})

// ---------- datasets ----------
const BASE_DATASETS: Dataset[] = [
  // ======================= LOANS (portfolio) =======================
  {
    key: "loans",
    label: "Loans",
    synonyms: ["loan", "loans", "kadan", "கடன்", "outstanding", "overdue", "npa", "sanction", "borrower", "jewel", "gold"],
    from: `loan_applications la
  LEFT JOIN LATERAL (
    SELECT * FROM loan_sanction_details x
    WHERE x.loan_application_id = la.loan_application_id AND x.branch_id = la.branch_id
    ORDER BY x.sanction_date DESC NULLS LAST, x.created_at DESC LIMIT 1
  ) lsd ON true
  LEFT JOIN loan_schemes ls ON ls.scheme_id = la.scheme_id AND ls.branch_id = la.branch_id
  ${MEMBER_JOIN("la")}
  ${BRANCH_JOIN("la.branch_id")}
  LEFT JOIN LATERAL (
    SELECT SUM(s.total_installment) AS overdue_amount, MIN(s.due_date) AS oldest_due_date
    FROM loan_repayment_schedule_details s
    WHERE s.loan_account_no = la.loan_application_id::text AND s.payment_status = 'OVERDUE'
  ) od ON true
  LEFT JOIN LATERAL (
    -- balance rebuilt from the loan ledger up to the report date ({{AS_ON}} = spec.to or today)
    SELECT COALESCE(SUM(t.debit_amount),0) - COALESCE(SUM(t.credit_principal_amount),0) AS balance
    FROM loan_transaction_details t
    WHERE t.loan_account_no = la.loan_application_id::text AND t.branch_id = la.branch_id AND t.transaction_date <= {{AS_ON}}
  ) hb ON true
  LEFT JOIN LATERAL (
    -- pledged gold (security type 6): summary row per packet in security_gold_details
    SELECT COUNT(*) AS packets, SUM(gd.number_of_items) AS items,
           SUM(gd.gross_weight_grams) AS gross_wt, SUM(gd.stone_weight_grams) AS stone_wt, SUM(gd.net_weight_grams) AS net_wt,
           SUM(gd.market_value) AS market_value, SUM(gd.max_sanction_amount) AS eligible,
           STRING_AGG(DISTINCT gd.packet_no, ', ') AS packet_nos, MAX(gd.purity_karat) AS karat
    FROM loan_securities sec
    JOIN security_gold_details gd ON gd.security_id = sec.id
    WHERE sec.loan_application_id = la.loan_application_id AND sec.branch_id = la.branch_id
      AND COALESCE(sec.is_deleted, false) = false
  ) gold ON true
  ${SHARE_JOIN}`,
    branchColumn: "la.branch_id",
    dateField: "sanction_date",
    defaultColumns: ["loan_no", "membership_no", "member_name", "scheme", "sanction_date", "sanctioned", "outstanding", "overdue_amount", "status"],
    defaultMeasure: "outstanding",
    fields: [
      { key: "loan_no", sql: "la.loan_application_id", label: "Loan No", type: "text", synonyms: ["loan no", "loan number", "account no"] },
      ...MEMBER_FIELDS,
      BRANCH_FIELD,
      { key: "scheme", sql: "ls.scheme_name", label: "Scheme", type: "text", synonyms: ["scheme", "scheme wise", "product"] },
      { key: "loan_type", sql: "ls.loan_type", label: "Loan Type", type: "text", synonyms: ["loan type", "type"] },
      { key: "purpose", sql: "la.loan_purpose", label: "Purpose", type: "text", synonyms: ["purpose"] },
      { key: "status", sql: "UPPER(la.application_status)", label: "Status", type: "text", synonyms: ["status"] },
      { key: "npa_status", sql: "CASE WHEN la.npa_flag THEN 'NPA' ELSE 'STANDARD' END", label: "NPA Status", type: "text", synonyms: ["npa status", "asset class"] },
      { key: "repayment_type", sql: "lsd.repayment_type", label: "Repayment Type", type: "text", synonyms: ["repayment type", "emi", "bullet"] },
      {
        key: "overdue_bucket", label: "Overdue Age", type: "text", synonyms: ["ageing", "aging", "age wise", "bucket"],
        sql: `CASE WHEN COALESCE(la.overdue_days,0) = 0 THEN '0 Regular'
                   WHEN la.overdue_days <= 90 THEN '1-90 days'
                   WHEN la.overdue_days <= 180 THEN '91-180 days'
                   WHEN la.overdue_days <= 365 THEN '181-365 days'
                   ELSE 'Above 1 year' END`,
      },
      { key: "sanction_date", sql: "lsd.sanction_date", label: "Sanction Date", type: "date", synonyms: ["sanction date", "sanctioned on", "disbursed on"] },
      { key: "application_date", sql: "la.application_date", label: "Application Date", type: "date", synonyms: ["application date", "applied on"] },
      { key: "oldest_due_date", sql: "od.oldest_due_date", label: "Oldest Due", type: "date", synonyms: ["due date"] },
      month("lsd.sanction_date"),
      { key: "applied", sql: "la.applied_loan_amount", label: "Applied", type: "number", aggregate: "SUM", synonyms: ["applied", "application amount"] },
      { key: "sanctioned", sql: "lsd.sanctioned_amount", label: "Sanctioned", type: "number", aggregate: "SUM", synonyms: ["sanctioned", "sanction amount", "disbursed", "disbursement"] },
      { key: "outstanding", sql: "COALESCE(la.loan_outstanding,0)", label: "Outstanding", type: "number", aggregate: "SUM", synonyms: ["outstanding", "balance", "o/s", "nilluvai", "நிலுவை"] },
      SHARE_FIELD,
      {
        key: "gold_loan", label: "Gold Loan", type: "text", synonyms: ["gold loan"],
        sql: `CASE WHEN gold.packets > 0 OR ls.scheme_name ILIKE '%JEWEL%' OR ls.scheme_name ILIKE '%GOLD%' OR ls.scheme_name LIKE '%நகை%' THEN 'YES' ELSE 'NO' END`,
      },
      { key: "packet_no", sql: "gold.packet_nos", label: "Packet No", type: "text", synonyms: ["packet", "packet no"] },
      { key: "karat", sql: "gold.karat", label: "Karat", type: "number", aggregate: "MAX", synonyms: ["karat", "carat", "purity"] },
      { key: "items", sql: "COALESCE(gold.items,0)", label: "Items", type: "number", aggregate: "SUM", synonyms: ["items", "ornaments", "no of jewels", "jewel count"] },
      { key: "gross_weight", sql: "COALESCE(gold.gross_wt,0)", label: "Gross Wt (g)", type: "number", aggregate: "SUM", synonyms: ["weight", "jewel weight", "gold weight", "gross weight", "edai", "எடை"] },
      { key: "stone_weight", sql: "COALESCE(gold.stone_wt,0)", label: "Stone Wt (g)", type: "number", aggregate: "SUM", synonyms: ["weight", "jewel weight", "gold weight", "stone weight", "less weight", "edai", "எடை"] },
      { key: "net_weight", sql: "COALESCE(gold.net_wt,0)", label: "Net Wt (g)", type: "number", aggregate: "SUM", synonyms: ["weight", "jewel weight", "gold weight", "net weight", "edai", "எடை"] },
      { key: "gold_value", sql: "COALESCE(gold.market_value,0)", label: "Gold Value", type: "number", aggregate: "SUM", synonyms: ["gold value", "jewel value", "market value"] },
      { key: "eligible_amount", sql: "COALESCE(gold.eligible,0)", label: "Eligible Amount", type: "number", aggregate: "SUM", synonyms: ["eligible", "eligible amount", "max sanction"] },
      { key: "outstanding_as_on", sql: "hb.balance", label: "Outstanding (as on)", type: "number", aggregate: "SUM", synonyms: ["ledger balance"] },
      { key: "overdue_amount", sql: "COALESCE(od.overdue_amount,0)", label: "Overdue Amount", type: "number", aggregate: "SUM", synonyms: ["overdue", "arrear", "arrears", "due amount", "thavanai", "தவணை"] },
      { key: "overdue_days", sql: "COALESCE(la.overdue_days,0)", label: "Overdue Days", type: "number", aggregate: "MAX", synonyms: ["overdue days", "days overdue"] },
      { key: "interest_rate", sql: "lsd.interest_rate", label: "ROI %", type: "number", aggregate: "AVG", synonyms: ["interest rate", "roi", "rate"] },
      { key: "count", sql: "la.id", label: "No. of Loans", type: "number", aggregate: "COUNT", distinct: true, synonyms: ["count", "number of", "no of", "how many", "ethanai", "எத்தனை"] },
    ],
  },

  // ======================= LOAN COLLECTIONS / DISBURSEMENTS =======================
  {
    key: "loan_txns",
    label: "Loan Transactions",
    synonyms: ["loan", "collection", "collected", "interest collected", "principal collected", "repayment", "recovery", "vasool", "வசூல்", "loan transaction", "disbursement", "disbursed"],
    from: `loan_transaction_details ltd
  LEFT JOIN loan_applications la ON la.loan_application_id::text = ltd.loan_account_no AND la.branch_id = ltd.branch_id
  LEFT JOIN loan_schemes ls ON ls.scheme_id = la.scheme_id AND ls.branch_id = la.branch_id
  ${MEMBER_JOIN("la")}
  ${BRANCH_JOIN("ltd.branch_id")}`,
    branchColumn: "ltd.branch_id",
    dateField: "txn_date",
    defaultColumns: ["txn_date", "loan_no", "member_name", "scheme", "txn_type", "principal", "interest", "disbursed"],
    defaultMeasure: "total_collected",
    fields: [
      { key: "txn_date", sql: "ltd.transaction_date", label: "Date", type: "date", synonyms: ["date", "day wise", "daily"] },
      month("ltd.transaction_date"),
      { key: "loan_no", sql: "ltd.loan_account_no", label: "Loan No", type: "text", synonyms: ["loan no", "loan wise"] },
      ...MEMBER_FIELDS,
      BRANCH_FIELD,
      { key: "scheme", sql: "ls.scheme_name", label: "Scheme", type: "text", synonyms: ["scheme", "scheme wise"] },
      { key: "txn_type", sql: "UPPER(ltd.transaction_type)", label: "Txn Type", type: "text", synonyms: ["transaction type", "txn type"] },
      { key: "principal", sql: "COALESCE(ltd.credit_principal_amount,0)", label: "Principal", type: "number", aggregate: "SUM", synonyms: ["principal"] },
      { key: "interest", sql: "COALESCE(ltd.credit_interest_amount,0)", label: "Interest", type: "number", aggregate: "SUM", synonyms: ["interest collected", "interest"] },
      { key: "total_collected", sql: "COALESCE(ltd.credit_principal_amount,0) + COALESCE(ltd.credit_interest_amount,0)", label: "Total Collected", type: "number", aggregate: "SUM", synonyms: ["collection", "collected", "recovery", "total"] },
      { key: "disbursed", sql: "COALESCE(ltd.debit_amount,0)", label: "Disbursed", type: "number", aggregate: "SUM", synonyms: ["disbursed", "disbursement"] },
      { key: "count", sql: "ltd.id", label: "No. of Txns", type: "number", aggregate: "COUNT", synonyms: ["count", "number of", "how many"] },
    ],
  },

  // ======================= MEMBERS =======================
  {
    key: "members",
    label: "Members",
    synonyms: ["members", "membership", "member list", "member register", "uruppinar", "உறுப்பினர்", "share", "share capital", "share balance", "shareholders", "share holders"],
    from: `memberships m
  LEFT JOIN customers c ON c.customer_code = m.customer_code
  LEFT JOIN LATERAL (SELECT * FROM customer_address x WHERE x.customer_code = m.customer_code LIMIT 1) ca ON true
  ${BRANCH_JOIN("m.branch_id")}
  ${SHARE_JOIN}`,
    branchColumn: "m.branch_id",
    dateField: "join_date",
    defaultColumns: ["membership_no", "member_name", "mobile", "village", "member_class", "join_date", "status", "share_balance"],
    defaultMeasure: "count",
    fields: [
      ...MEMBER_FIELDS,
      BRANCH_FIELD,
      { key: "district", sql: "ca.district", label: "District", type: "text", synonyms: ["district"] },
      { key: "member_type", sql: "m.member_type", label: "Member Type", type: "text", synonyms: ["member type"] },
      { key: "occupation", sql: "c.occupation", label: "Occupation", type: "text", synonyms: ["occupation", "farmer"] },
      { key: "status", sql: "UPPER(m.status)", label: "Status", type: "text", synonyms: ["status"] },
      { key: "join_date", sql: "m.join_date", label: "Join Date", type: "date", synonyms: ["join date", "joined", "admitted"] },
      { key: "close_date", sql: "m.close_date", label: "Close Date", type: "date", synonyms: ["closed on", "close date"] },
      month("m.join_date"),
      SHARE_FIELD,
      { key: "count", sql: "m.id", label: "No. of Members", type: "number", aggregate: "COUNT", distinct: true, synonyms: ["count", "number of", "no of", "how many", "ethanai", "எத்தனை"] },
    ],
  },

  // ======================= SAVINGS ACCOUNTS =======================
  {
    key: "savings",
    label: "Savings Accounts",
    synonyms: ["savings", "sb", "s.b", "sb account", "semippu", "சேமிப்பு"],
    from: `savings_accounts sa
  LEFT JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
  ${MEMBER_JOIN("sa")}
  ${BRANCH_JOIN("sa.branch_id")}`,
    branchColumn: "sa.branch_id",
    dateField: "opening_date",
    defaultColumns: ["account_no", "membership_no", "member_name", "scheme", "opening_date", "status", "balance"],
    defaultMeasure: "balance",
    fields: [
      { key: "account_no", sql: "sa.account_number", label: "Account No", type: "text", synonyms: ["account no", "account wise"] },
      ...MEMBER_FIELDS,
      BRANCH_FIELD,
      { key: "scheme", sql: "ss.scheme_name", label: "Scheme", type: "text", synonyms: ["scheme", "scheme wise"] },
      { key: "status", sql: "UPPER(sa.account_status)", label: "Status", type: "text", synonyms: ["status", "dormant", "inactive"] },
      { key: "operation_type", sql: "sa.operation_type", label: "Operation", type: "text", synonyms: ["operation", "joint", "single"] },
      { key: "opening_date", sql: "sa.opening_date", label: "Opened On", type: "date", synonyms: ["opened", "opening date"] },
      { key: "closed_date", sql: "sa.account_closed_date", label: "Closed On", type: "date", synonyms: ["closed on"] },
      month("sa.opening_date"),
      { key: "balance", sql: "COALESCE(sa.available_balance,0)", label: "Balance", type: "number", aggregate: "SUM", synonyms: ["balance", "amount"] },
      { key: "accrued_interest", sql: "COALESCE(sa.accrued_interest_balance,0)", label: "Accrued Interest", type: "number", aggregate: "SUM", synonyms: ["accrued", "interest"] },
      { key: "count", sql: "sa.id", label: "No. of Accounts", type: "number", aggregate: "COUNT", distinct: true, synonyms: ["count", "number of", "how many"] },
    ],
  },

  // ======================= SAVINGS TRANSACTIONS =======================
  {
    key: "savings_txns",
    label: "Savings Transactions",
    synonyms: ["savings", "savings transaction", "savings txn", "withdrawal", "savings credit", "savings debit"],
    from: `savings_transactions st
  LEFT JOIN savings_accounts sa ON sa.account_number = st.account_number AND sa.branch_id = st.branch_id
  LEFT JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
  ${MEMBER_JOIN("sa")}
  ${BRANCH_JOIN("st.branch_id")}`,
    branchColumn: "st.branch_id",
    dateField: "txn_date",
    defaultColumns: ["txn_date", "account_no", "member_name", "txn_type", "credit", "debit", "status"],
    defaultMeasure: "credit",
    fields: [
      { key: "txn_date", sql: "st.transaction_date", label: "Date", type: "date", synonyms: ["date", "daily", "day wise"] },
      month("st.transaction_date"),
      { key: "account_no", sql: "st.account_number", label: "Account No", type: "text", synonyms: ["account no", "account wise"] },
      ...MEMBER_FIELDS,
      BRANCH_FIELD,
      { key: "scheme", sql: "ss.scheme_name", label: "Scheme", type: "text", synonyms: ["scheme"] },
      { key: "txn_type", sql: "UPPER(st.transaction_type)", label: "Txn Type", type: "text", synonyms: ["transaction type", "txn type"] },
      { key: "voucher_type", sql: "st.voucher_type", label: "Mode", type: "text", synonyms: ["cash", "transfer", "mode", "voucher type"] },
      { key: "status", sql: "UPPER(st.status)", label: "Status", type: "text", synonyms: ["status"] },
      { key: "credit", sql: "COALESCE(st.credit_amount,0)", label: "Credit", type: "number", aggregate: "SUM", synonyms: ["credit", "deposit", "deposited"] },
      { key: "debit", sql: "COALESCE(st.debit_amount,0)", label: "Debit", type: "number", aggregate: "SUM", synonyms: ["debit", "withdrawal", "withdrawn"] },
      { key: "count", sql: "st.id", label: "No. of Txns", type: "number", aggregate: "COUNT", synonyms: ["count", "number of", "how many"] },
    ],
  },

  // ======================= TERM / RECURRING / PIGMY DEPOSITS =======================
  {
    key: "deposits",
    label: "Deposits (FD / RD / Pigmy)",
    synonyms: ["deposit", "deposits", "depositor", "depositors", "fd", "rd", "fixed deposit", "recurring", "term deposit", "pigmy", "maturity", "matured", "maturing", "vaippu", "வைப்பு"],
    from: `deposit_account da
  LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
  LEFT JOIN LATERAL (SELECT * FROM term_deposit_details x WHERE x.accountnumber = da.accountnumber ORDER BY x.maturitydate DESC NULLS LAST LIMIT 1) tdd ON true
  LEFT JOIN LATERAL (SELECT * FROM recurring_deposit_details x WHERE x.accountnumber = da.accountnumber ORDER BY x.maturitydate DESC NULLS LAST LIMIT 1) rdd ON true
  LEFT JOIN ref_account_status ras ON ras.account_status_id = da.accountstatus
  ${MEMBER_JOIN("da")}
  ${BRANCH_JOIN("da.branch_id")}`,
    branchColumn: "da.branch_id",
    dateField: "open_date",
    defaultColumns: ["account_no", "membership_no", "member_name", "scheme", "open_date", "deposit_amount", "rate", "maturity_date", "maturity_amount", "status"],
    defaultMeasure: "balance",
    fields: [
      { key: "account_no", sql: "da.accountnumber", label: "Account No", type: "text", synonyms: ["account no", "account wise"] },
      ...MEMBER_FIELDS,
      BRANCH_FIELD,
      { key: "scheme", sql: "ds.scheme_name", label: "Scheme", type: "text", synonyms: ["scheme", "scheme wise"] },
      { key: "deposit_type", sql: "UPPER(COALESCE(ds.deposit_type, da.deposittype))", label: "Deposit Type", type: "text", synonyms: ["deposit type", "type wise"] },
      { key: "status", sql: "ras.account_status_name", label: "Status", type: "text", synonyms: ["status"] },
      { key: "interest_category", sql: "da.interest_category", label: "Interest Category", type: "text", synonyms: ["senior citizen", "category"] },
      { key: "open_date", sql: "da.accountopendate", label: "Opened On", type: "date", synonyms: ["opened", "open date", "opening date"] },
      { key: "maturity_date", sql: "COALESCE(tdd.maturitydate, rdd.maturitydate)", label: "Maturity Date", type: "date", synonyms: ["maturity", "maturing", "matures", "matured"] },
      { key: "close_date", sql: "da.accountclosedate", label: "Closed On", type: "date", synonyms: ["closed on"] },
      { key: "maturity_month", sql: "TO_CHAR(COALESCE(tdd.maturitydate, rdd.maturitydate), 'YYYY-MM')", label: "Maturity Month", type: "text", synonyms: ["maturity month", "maturity wise"] },
      month("da.accountopendate"),
      { key: "balance", sql: "COALESCE(da.clearbalance,0)", label: "Balance", type: "number", aggregate: "SUM", synonyms: ["balance", "outstanding"] },
      { key: "deposit_amount", sql: "COALESCE(tdd.depositamount, rdd.installment_amount, 0)", label: "Deposit / Instalment", type: "number", aggregate: "SUM", synonyms: ["deposit amount", "principal", "instalment", "installment"] },
      { key: "maturity_amount", sql: "COALESCE(tdd.maturityamount, rdd.maturityamount, 0)", label: "Maturity Amount", type: "number", aggregate: "SUM", synonyms: ["maturity amount", "maturity value"] },
      { key: "interest_paid", sql: "COALESCE(da.interestpaidamount,0)", label: "Interest Paid", type: "number", aggregate: "SUM", synonyms: ["interest paid"] },
      { key: "interest_due", sql: "COALESCE(da.interestdueforpayment,0)", label: "Interest Due", type: "number", aggregate: "SUM", synonyms: ["interest due", "interest payable"] },
      { key: "tds", sql: "COALESCE(da.tdsrecovered,0)", label: "TDS", type: "number", aggregate: "SUM", synonyms: ["tds", "tds recovered", "tds deducted"] },
      { key: "rate", sql: "da.rateofinterest", label: "ROI %", type: "number", aggregate: "AVG", synonyms: ["interest rate", "roi", "rate"] },
      { key: "count", sql: "da.id", label: "No. of Deposits", type: "number", aggregate: "COUNT", distinct: true, synonyms: ["count", "number of", "how many"] },
    ],
  },

  // ======================= GENERAL LEDGER =======================
  {
    key: "ledger",
    label: "General Ledger",
    synonyms: ["ledger", "gl", "account head", "head wise", "voucher", "vouchers", "income", "expense", "expenditure", "day book", "cash book", "gl transaction"],
    from: `gl_batch_lines gbl
  JOIN gl_batches gb ON gb.batch_id = gbl.batch_id AND gb.branch_id = gbl.branch_id
  LEFT JOIN chart_of_accounts coa ON coa.accountcode = gbl.accountcode AND coa.branch_id = gbl.branch_id
  ${BRANCH_JOIN("gbl.branch_id")}`,
    branchColumn: "gbl.branch_id",
    baseWhere: [`UPPER(TRIM(gb.status)) IN ('COMPLETED','APPROVED','PASSED','POSTED')`],
    dateField: "date",
    defaultColumns: ["date", "voucher_no", "voucher_type", "account_code", "account_name", "narration", "debit", "credit"],
    defaultMeasure: "net",
    fields: [
      { key: "date", sql: "gbl.business_date", label: "Date", type: "date", synonyms: ["date", "daily", "day wise"] },
      month("gbl.business_date"),
      BRANCH_FIELD,
      { key: "account_code", sql: "gbl.accountcode", label: "A/c Code", type: "text", synonyms: ["account code", "code"] },
      { key: "account_name", sql: "coa.accountname", label: "Account Head", type: "text", synonyms: ["account head", "head wise", "head", "ledger wise", "account wise"] },
      {
        key: "account_type", label: "Account Type", type: "text", synonyms: ["account type", "type wise"],
        sql: `CASE coa.accounttypecode WHEN 1 THEN 'LIABILITIES' WHEN 2 THEN 'ASSETS' WHEN 3 THEN 'INCOME' WHEN 4 THEN 'EXPENSE' END`,
      },
      { key: "voucher_type", sql: "UPPER(gb.voucher_type)", label: "Voucher Type", type: "text", synonyms: ["voucher type", "cash", "transfer"] },
      { key: "voucher_no", sql: "gb.voucher_id", label: "Voucher No", type: "text", synonyms: ["voucher no", "voucher wise"] },
      { key: "narration", sql: "gbl.narration", label: "Narration", type: "text", synonyms: ["narration"] },
      { key: "debit", sql: "COALESCE(gbl.debit_amount,0)", label: "Debit", type: "number", aggregate: "SUM", synonyms: ["debit", "payment", "payments"] },
      { key: "credit", sql: "COALESCE(gbl.credit_amount,0)", label: "Credit", type: "number", aggregate: "SUM", synonyms: ["credit", "receipt", "receipts"] },
      { key: "net", sql: "COALESCE(gbl.credit_amount,0) - COALESCE(gbl.debit_amount,0)", label: "Net (Cr-Dr)", type: "number", aggregate: "SUM", synonyms: ["net", "total"] },
      { key: "count", sql: "gbl.id", label: "No. of Entries", type: "number", aggregate: "COUNT", synonyms: ["count", "number of", "how many"] },
    ],
  },
]

/**
 * Words that map to a filter (field + ILIKE/equals). Loan types/scheme names are free text in
 * loan_schemes, so loan product words match scheme_name with ILIKE.
 */
export type ValueAlias = { dataset?: string[]; field: string; op: "=" | "ILIKE"; value: string }
export const VALUE_ALIASES: Record<string, ValueAlias[]> = {
  // gold loan = has a gold security, or scheme named Jewel / Gold / நகை
  jewel: [{ dataset: ["loans"], field: "gold_loan", op: "=", value: "YES" }, { dataset: ["loan_txns"], field: "scheme", op: "ILIKE", value: "%JEWEL%" }],
  gold: [{ dataset: ["loans"], field: "gold_loan", op: "=", value: "YES" }, { dataset: ["loan_txns"], field: "scheme", op: "ILIKE", value: "%GOLD%" }],
  "நகை": [{ dataset: ["loans"], field: "gold_loan", op: "=", value: "YES" }, { dataset: ["loan_txns"], field: "scheme", op: "ILIKE", value: "%JEWEL%" }],
  farm: [{ dataset: ["loans", "loan_txns"], field: "scheme", op: "ILIKE", value: "%FARM%" }],
  npa: [{ dataset: ["loans"], field: "npa_status", op: "=", value: "NPA" }],
  active: [
    { dataset: ["loans"], field: "status", op: "=", value: "ACTIVE" },
    { dataset: ["members", "savings"], field: "status", op: "=", value: "ACTIVE" },
    { dataset: ["deposits"], field: "status", op: "=", value: "Active" },
  ],
  "a class": [{ dataset: ["members", "loans", "share_txns"], field: "member_class", op: "=", value: "A" }],
  "b class": [{ dataset: ["members", "loans", "share_txns"], field: "member_class", op: "=", value: "B" }],
  "senior citizen": [{ dataset: ["deposits"], field: "interest_category", op: "ILIKE", value: "%SENIOR%" }],
  lien: [{ dataset: ["securities"], field: "lien_marked", op: "=", value: "YES" }],
  "lien marked": [{ dataset: ["securities"], field: "lien_marked", op: "=", value: "YES" }],
  sold: [{ dataset: ["assets"], field: "sold", op: "=", value: "SOLD" }],
  "in use": [{ dataset: ["assets"], field: "sold", op: "=", value: "IN USE" }],
  overdue: [{ dataset: ["loan_demand"], field: "payment_status", op: "=", value: "OVERDUE" }],
  cash: [{ dataset: ["savings_txns", "deposit_txns", "share_txns", "ledger", "ledger_txns"], field: "voucher_type", op: "=", value: "CASH" }],
  transfer: [{ dataset: ["savings_txns", "deposit_txns", "share_txns", "ledger", "ledger_txns"], field: "voucher_type", op: "=", value: "TRANSFER" }],
  closed: [
    { dataset: ["loans", "members", "savings"], field: "status", op: "=", value: "CLOSED" },
    { dataset: ["deposits"], field: "status", op: "=", value: "Closed" },
  ],
  dormant: [{ dataset: ["savings"], field: "status", op: "=", value: "DORMANT" }],
  fd: [{ dataset: ["deposits", "deposit_txns"], field: "deposit_type", op: "ILIKE", value: "T%" }],
  "fixed deposit": [{ dataset: ["deposits"], field: "deposit_type", op: "ILIKE", value: "T%" }],
  "term deposit": [{ dataset: ["deposits"], field: "deposit_type", op: "ILIKE", value: "T%" }],
  rd: [{ dataset: ["deposits", "deposit_txns"], field: "deposit_type", op: "ILIKE", value: "R%" }],
  recurring: [{ dataset: ["deposits"], field: "deposit_type", op: "ILIKE", value: "R%" }],
  pigmy: [{ dataset: ["deposits"], field: "deposit_type", op: "ILIKE", value: "PIGMY%" }],
  income: [{ dataset: ["ledger"], field: "account_type", op: "=", value: "INCOME" }],
  expense: [{ dataset: ["ledger"], field: "account_type", op: "=", value: "EXPENSE" }],
  expenditure: [{ dataset: ["ledger"], field: "account_type", op: "=", value: "EXPENSE" }],
  repayment: [{ dataset: ["loan_txns"], field: "txn_type", op: "=", value: "REPAYMENT" }],
  collection: [{ dataset: ["loan_txns"], field: "txn_type", op: "=", value: "REPAYMENT" }],
  disbursement: [{ dataset: ["loan_txns"], field: "txn_type", op: "=", value: "DISBURSEMENT" }],
}

export const CATALOG: Dataset[] = [...BASE_DATASETS, ...MORE_DATASETS]

// module words → filter on the unified ledgers ("sundry creditors balance", "borrowing transactions")
for (const [word, module] of Object.entries(LEDGER_MODULE_WORDS)) {
  VALUE_ALIASES[word] = [...(VALUE_ALIASES[word] ?? []), { dataset: ["ledgers", "ledger_txns"], field: "module", op: "=", value: module }]
}

export function getDataset(key: string) {
  const ds = CATALOG.find(d => d.key === key)
  if (!ds) throw new Error(`Unknown dataset: ${key}`)
  return ds
}
