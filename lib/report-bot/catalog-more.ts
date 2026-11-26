// Second half of the catalog: every other reportable module in the schema.
// Same rules as catalog.ts — only what is listed here can reach SQL.
import type { Dataset, Field } from "./catalog-types"

const MEMBER_JOIN = (alias: string) => `
  LEFT JOIN memberships m ON m.membership_no::text = ${alias}.membership_no::text AND m.branch_id = ${alias}.branch_id
  LEFT JOIN customers c ON c.customer_code = m.customer_code
  LEFT JOIN LATERAL (SELECT * FROM customer_address x WHERE x.customer_code = m.customer_code LIMIT 1) ca ON true`
const BRANCH_JOIN = (col: string) => `
  LEFT JOIN branchparameters bp ON bp.branch_id = ${col}`

const MEMBER_FIELDS: Field[] = [
  { key: "membership_no", sql: "m.membership_no", label: "Member No", type: "text", synonyms: ["member no", "membership no"] },
  { key: "member_name", sql: "c.full_name", label: "Member Name", type: "text", synonyms: ["member name", "name", "member wise"] },
  { key: "mobile", sql: "c.mobile_no", label: "Mobile", type: "text", synonyms: ["mobile", "phone", "mobile no", "phone no", "cell"] },
  { key: "father_name", sql: "c.father_name", label: "Father / Husband", type: "text", synonyms: ["father", "father name", "husband", "husband name"] },
  { key: "village", sql: "ca.village", label: "Village", type: "text", synonyms: ["village", "ooru", "கிராமம்"] },
  { key: "taluk", sql: "ca.thaluk", label: "Taluk", type: "text", synonyms: ["taluk", "thaluk"] },
]
const BRANCH_FIELD: Field = { key: "branch", sql: "bp.branch_name", label: "Branch", type: "text", synonyms: ["branch", "kilai", "கிளை"] }
const month = (d: string, key = "month", label = "Month", syn = ["month", "monthly"]): Field => ({ key, sql: `TO_CHAR(${d}, 'YYYY-MM')`, label, type: "text", synonyms: syn })
const count = (sql: string, label: string, distinct = false): Field => ({ key: "count", sql, label, type: "number", aggregate: "COUNT", distinct, synonyms: ["count", "number of", "no of", "how many", "ethanai", "எத்தனை"] })
const money = (key: string, sql: string, label: string, synonyms: string[], aggregate: Field["aggregate"] = "SUM"): Field => ({ key, sql, label, type: "number", aggregate, synonyms })
const text = (key: string, sql: string, label: string, synonyms: string[]): Field => ({ key, sql, label, type: "text", synonyms })
const date = (key: string, sql: string, label: string, synonyms: string[]): Field => ({ key, sql, label, type: "date", synonyms })

const PASSED = `UPPER(TRIM(gb.status)) IN ('COMPLETED','APPROVED','PASSED','POSTED')`

// ---------------------------------------------------------------------------
// Other ledgers: 11 modules with the same master + transaction shape, unified
// ---------------------------------------------------------------------------
type LedgerModule = { module: string; master: string; txn?: string; name: string; opened: string; balance: string; status: string; closed?: string }
const LEDGERS: LedgerModule[] = [
  { module: "SUNDRY CREDITORS", master: "sundry_creditors", txn: "sundry_creditor_transactions", name: "account_name", opened: "account_opened_date", balance: "ledger_balance", status: "account_status", closed: "account_closed_date" },
  { module: "SUNDRY DEBTORS", master: "sundry_debitors", txn: "sundry_debitors_transactions", name: "account_name", opened: "account_opened_date", balance: "ledger_balance", status: "account_status", closed: "account_closed_date" },
  { module: "RESERVES & FUNDS", master: "reserve_and_fund_master", txn: "reserve_and_fund_transactions", name: "account_name", opened: "account_opened_date", balance: "ledger_balance", status: "account_status", closed: "account_closed_date" },
  { module: "PROVISIONS", master: "provisions_master", txn: "provisions_transactions", name: "account_name", opened: "account_opened_date", balance: "ledger_balance", status: "account_status", closed: "account_closed_date" },
  { module: "OTHER ASSETS", master: "other_assets_master", txn: "other_assets_transactions", name: "account_name", opened: "account_opened_date", balance: "ledger_balance", status: "account_status", closed: "account_closed_date" },
  { module: "OTHER LIABILITIES", master: "other_liabilities_master", txn: "other_liabilities_transactions", name: "account_name", opened: "account_opened_date", balance: "ledger_balance", status: "account_status", closed: "account_closed_date" },
  { module: "GRANTS & SUBSIDIES", master: "grands_and_subsidies_master", txn: "grands_and_subsidies_transactions", name: "account_name", opened: "account_opened_date", balance: "ledger_balance", status: "account_status", closed: "account_closed_date" },
  { module: "BORROWINGS", master: "borrowing_master", txn: "borrowing_transactions", name: "borrowing_head", opened: "date_of_sanction", balance: "ledger_balance", status: "status" },
  { module: "INVESTMENTS", master: "investment_master", txn: "investment_transactions", name: "investment_head", opened: "date_of_investment", balance: "ledger_balance", status: "status" },
  { module: "OTHER BANK ACCOUNTS", master: "bank_accounts", txn: "bank_accounts_transactions", name: "account_head", opened: "date_of_account_opening", balance: "account_balance", status: "status" },
  { module: "INCOME ACCOUNTS", master: "income_accounts", txn: "income_transactions", name: "account_name", opened: "opening_date", balance: "current_balance", status: "account_status", closed: "closing_date" },
  { module: "EXPENSE ACCOUNTS", master: "expense_accounts", txn: "expense_transactions", name: "account_name", opened: "opening_date", balance: "current_balance", status: "account_status", closed: "closing_date" },
]

const ledgerMasterUnion = LEDGERS.map(l => `
    SELECT '${l.module}'::text AS module, branch_id::bigint AS branch_id, account_number::text AS account_number,
           ${l.name}::text AS account_name, ${l.opened}::date AS opened_date, ${l.closed ? `${l.closed}::date` : "NULL::date"} AS closed_date,
           COALESCE(${l.balance},0)::numeric AS balance, UPPER(${l.status}::text) AS status
    FROM ${l.master}`).join("\n    UNION ALL")

// txn tables differ: borrowings use drawal/repayment, the rest debit/credit
const txnCols = (l: LedgerModule) =>
  l.module === "BORROWINGS"
    ? `COALESCE(repayment_amount,0) AS debit, COALESCE(drawal_amount,0) AS credit, COALESCE(interest_amount,0) AS interest, transaction_type::text AS txn_type, NULL::text AS narration, status::text AS status`
    : l.module === "INVESTMENTS" || l.module === "OTHER BANK ACCOUNTS"
      ? `COALESCE(debit_amount,0) AS debit, COALESCE(credit_amount,0) AS credit, COALESCE(interest_amount,0) AS interest, transaction_type::text AS txn_type, NULL::text AS narration, status::text AS status`
      : `COALESCE(debit_amount,0) AS debit, COALESCE(credit_amount,0) AS credit, 0::numeric AS interest, NULL::text AS txn_type, description::text AS narration, NULL::text AS status`
const ledgerTxnUnion = LEDGERS.filter(l => l.txn).map(l => `
    SELECT '${l.module}'::text AS module, branch_id::bigint AS branch_id, account_number::text AS account_number,
           transaction_date::date AS txn_date, voucher_no::text AS voucher_no,
           ${l.module === "INVESTMENTS" || l.module === "OTHER BANK ACCOUNTS" ? "NULL::text" : "voucher_type::text"} AS voucher_type, ${txnCols(l)}
    FROM ${l.txn}`).join("\n    UNION ALL")

export const LEDGER_MODULE_WORDS: Record<string, string> = {
  "sundry creditor": "SUNDRY CREDITORS", creditors: "SUNDRY CREDITORS", creditor: "SUNDRY CREDITORS",
  "sundry debtor": "SUNDRY DEBTORS", "sundry debitor": "SUNDRY DEBTORS", debtors: "SUNDRY DEBTORS", debtor: "SUNDRY DEBTORS",
  reserve: "RESERVES & FUNDS", reserves: "RESERVES & FUNDS", fund: "RESERVES & FUNDS", funds: "RESERVES & FUNDS",
  provision: "PROVISIONS", provisions: "PROVISIONS",
  "other asset": "OTHER ASSETS", "other assets": "OTHER ASSETS",
  "other liability": "OTHER LIABILITIES", "other liabilities": "OTHER LIABILITIES",
  grant: "GRANTS & SUBSIDIES", grants: "GRANTS & SUBSIDIES", subsidy: "GRANTS & SUBSIDIES", subsidies: "GRANTS & SUBSIDIES",
  borrowing: "BORROWINGS", borrowings: "BORROWINGS",
  investment: "INVESTMENTS", investments: "INVESTMENTS",
  "other bank": "OTHER BANK ACCOUNTS", "bank account": "OTHER BANK ACCOUNTS", "bank balance": "OTHER BANK ACCOUNTS",
  "income account": "INCOME ACCOUNTS", "expense account": "EXPENSE ACCOUNTS",
}
const LEDGER_SYNONYMS = Object.keys(LEDGER_MODULE_WORDS)

export const MORE_DATASETS: Dataset[] = [
  // ======================= OTHER LEDGERS: balances =======================
  {
    key: "ledgers",
    label: "Other Ledgers (Creditors, Debtors, Borrowings, Investments, Reserves…)",
    synonyms: [...LEDGER_SYNONYMS, "other ledger", "ledgers", "module wise"],
    from: `(${ledgerMasterUnion}
  ) lg
  ${BRANCH_JOIN("lg.branch_id")}`,
    branchColumn: "lg.branch_id",
    dateField: "opened_date",
    defaultColumns: ["module", "account_number", "account_name", "opened_date", "status", "balance"],
    defaultMeasure: "balance",
    fields: [
      text("module", "lg.module", "Module", ["module", "type", "head"]),
      text("account_number", "lg.account_number", "Account No", ["account no", "account wise"]),
      text("account_name", "lg.account_name", "Account Name", ["account name", "name", "party", "name wise"]),
      text("status", "lg.status", "Status", ["status"]),
      BRANCH_FIELD,
      date("opened_date", "lg.opened_date", "Opened On", ["opened", "opening date", "sanctioned on", "invested on"]),
      date("closed_date", "lg.closed_date", "Closed On", ["closed on"]),
      money("balance", "lg.balance", "Balance", ["balance", "amount", "outstanding"]),
      count("lg.account_number", "No. of Accounts"),
    ],
  },

  // ======================= OTHER LEDGERS: transactions =======================
  {
    key: "ledger_txns",
    label: "Other Ledger Transactions",
    synonyms: [...LEDGER_SYNONYMS.map(s => `${s} transaction`), ...LEDGER_SYNONYMS.map(s => `${s} txn`), "drawal", "drawals", "ledger transaction"],
    from: `(${ledgerTxnUnion}
  ) lt
  ${BRANCH_JOIN("lt.branch_id")}`,
    branchColumn: "lt.branch_id",
    dateField: "txn_date",
    defaultColumns: ["txn_date", "module", "account_number", "voucher_no", "narration", "debit", "credit"],
    defaultMeasure: "credit",
    fields: [
      date("txn_date", "lt.txn_date", "Date", ["date", "daily", "day wise"]),
      month("lt.txn_date"),
      text("module", "lt.module", "Module", ["module"]),
      text("account_number", "lt.account_number", "Account No", ["account no", "account wise"]),
      text("voucher_no", "lt.voucher_no", "Voucher No", ["voucher no", "voucher wise"]),
      text("voucher_type", "UPPER(lt.voucher_type)", "Mode", ["cash", "transfer", "mode"]),
      text("txn_type", "UPPER(lt.txn_type)", "Txn Type", ["transaction type", "txn type"]),
      text("narration", "lt.narration", "Narration", ["narration", "description"]),
      text("status", "UPPER(lt.status)", "Status", ["status"]),
      BRANCH_FIELD,
      money("debit", "lt.debit", "Debit", ["debit", "repayment", "repaid", "payment"]),
      money("credit", "lt.credit", "Credit", ["credit", "drawal", "drawn", "receipt"]),
      money("interest", "lt.interest", "Interest", ["interest"]),
      count("lt.account_number", "No. of Txns"),
    ],
  },

  // ======================= GL BALANCES / TRIAL BALANCE =======================
  {
    key: "gl_balances",
    label: "Trial Balance / Account Balances",
    synonyms: ["trial balance", "tb", "account balance", "head balance", "gl balance", "closing balance", "opening balance", "balance sheet", "receipts and payments", "r&p", "profit and loss", "p&l", "pl"],
    from: `chart_of_accounts coa
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS lines,
           SUM(CASE WHEN gbl.business_date <  {{FROM}} THEN COALESCE(gbl.credit_amount,0) - COALESCE(gbl.debit_amount,0) ELSE 0 END) AS opening_net,
           SUM(CASE WHEN gbl.business_date >= {{FROM}} THEN COALESCE(gbl.debit_amount,0)  ELSE 0 END) AS period_dr,
           SUM(CASE WHEN gbl.business_date >= {{FROM}} THEN COALESCE(gbl.credit_amount,0) ELSE 0 END) AS period_cr,
           SUM(COALESCE(gbl.credit_amount,0) - COALESCE(gbl.debit_amount,0)) AS closing_net
    FROM gl_batch_lines gbl
    JOIN gl_batches gb ON gb.batch_id = gbl.batch_id AND gb.branch_id = gbl.branch_id
    WHERE gbl.accountcode = coa.accountcode AND gbl.branch_id = coa.branch_id
      AND ${PASSED} AND gbl.business_date <= {{AS_ON}}
  ) b ON true
  ${BRANCH_JOIN("coa.branch_id")}`,
    branchColumn: "coa.branch_id",
    baseWhere: ["b.lines > 0"],
    dateMode: "param", // dates feed {{FROM}}/{{AS_ON}}; no WHERE on a date column
    dateField: "none",
    defaultColumns: ["account_code", "account_name", "account_type", "opening", "debit", "credit", "closing_debit", "closing_credit"],
    defaultMeasure: "closing",
    fields: [
      text("account_code", "coa.accountcode", "A/c Code", ["account code", "code"]),
      text("account_name", "coa.accountname", "Account Head", ["account head", "head wise", "account wise", "ledger wise", "head"]),
      text("parent_code", "coa.parentaccountcode", "Parent Code", ["parent", "group wise", "group"]),
      text("account_type", `CASE coa.accounttypecode WHEN 1 THEN 'LIABILITIES' WHEN 2 THEN 'ASSETS' WHEN 3 THEN 'INCOME' WHEN 4 THEN 'EXPENSE' END`, "Type", ["account type", "type wise", "type"]),
      BRANCH_FIELD,
      date("none", "NULL::date", "-", []),
      // natural sign: Assets/Expense are debit balances, Liabilities/Income credit balances
      money("opening", "CASE WHEN coa.accounttypecode IN (2,4) THEN -b.opening_net ELSE b.opening_net END", "Opening", ["opening", "opening balance"]),
      money("debit", "b.period_dr", "Debit", ["debit", "payments", "payment"]),
      money("credit", "b.period_cr", "Credit", ["credit", "receipts", "receipt"]),
      money("closing", "CASE WHEN coa.accounttypecode IN (2,4) THEN -b.closing_net ELSE b.closing_net END", "Closing", ["closing", "closing balance", "balance"]),
      money("closing_debit", "CASE WHEN b.closing_net < 0 THEN -b.closing_net ELSE 0 END", "Closing Dr", ["dr balance", "debit balance"]),
      money("closing_credit", "CASE WHEN b.closing_net > 0 THEN b.closing_net ELSE 0 END", "Closing Cr", ["cr balance", "credit balance"]),
      money("current_balance", "coa.accountbalance", "Current Balance (COA)", ["current balance", "today balance"]),
      count("coa.accountcode", "No. of Heads"),
    ],
  },

  // ======================= DEPOSIT TRANSACTIONS =======================
  {
    key: "deposit_txns",
    label: "Deposit Transactions",
    synonyms: ["deposit", "fd", "deposit transaction", "fd transaction", "rd transaction", "deposit txn", "interest payout", "deposit closure", "fd closure", "premature"],
    from: `deposit_transactions dt
  LEFT JOIN deposit_account da ON da.accountnumber = dt.accountnumber AND da.branch_id = dt.branch_id
  LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
  ${MEMBER_JOIN("da")}
  ${BRANCH_JOIN("dt.branch_id")}`,
    branchColumn: "dt.branch_id",
    dateField: "txn_date",
    defaultColumns: ["txn_date", "account_no", "member_name", "scheme", "txn_type", "credit", "debit", "status"],
    defaultMeasure: "credit",
    fields: [
      date("txn_date", "dt.transaction_date", "Date", ["date", "daily", "day wise"]),
      month("dt.transaction_date"),
      text("account_no", "dt.accountnumber", "Account No", ["account no", "account wise"]),
      ...MEMBER_FIELDS, BRANCH_FIELD,
      text("scheme", "ds.scheme_name", "Scheme", ["scheme", "scheme wise"]),
      text("deposit_type", "UPPER(COALESCE(ds.deposit_type, da.deposittype))", "Deposit Type", ["deposit type", "type wise"]),
      text("txn_type", "UPPER(dt.transaction_type)", "Txn Type", ["transaction type", "txn type"]),
      text("voucher_type", "UPPER(dt.voucher_type)", "Mode", ["cash", "transfer", "mode"]),
      text("status", "UPPER(dt.status)", "Status", ["status"]),
      text("narration", "dt.narration", "Narration", ["narration"]),
      money("credit", "COALESCE(dt.credit_amount,0)", "Credit", ["credit", "deposited", "receipt"]),
      money("debit", "COALESCE(dt.debit_amount,0)", "Debit", ["debit", "paid", "payout", "withdrawal", "closure amount"]),
      count("dt.id", "No. of Txns"),
    ],
  },

  // ======================= RD INSTALMENTS =======================
  {
    key: "rd_installments",
    label: "RD Instalments",
    synonyms: ["rd", "rd instalment", "rd installment", "rd due", "rd defaulter", "rd pending", "rd paid"],
    from: `rd_installment_details r
  LEFT JOIN deposit_account da ON da.accountnumber = r.accountnumber AND da.branch_id = r.branch_id
  LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
  ${MEMBER_JOIN("da")}
  ${BRANCH_JOIN("r.branch_id")}`,
    branchColumn: "r.branch_id",
    dateField: "due_date",
    defaultColumns: ["account_no", "member_name", "installment_no", "due_date", "paid_date", "paid_status", "amount", "penalty"],
    defaultMeasure: "amount",
    fields: [
      text("account_no", "r.accountnumber", "Account No", ["account no", "account wise"]),
      ...MEMBER_FIELDS, BRANCH_FIELD,
      text("scheme", "ds.scheme_name", "Scheme", ["scheme", "scheme wise"]),
      text("installment_no", "r.installment_number", "Inst. No", ["instalment no", "installment no"]),
      text("paid_status", "CASE WHEN r.installment_paid_date IS NULL THEN 'PENDING' ELSE 'PAID' END", "Paid?", ["paid status"]),
      date("due_date", "r.installment_due_date", "Due Date", ["due date", "due", "dues"]),
      date("paid_date", "r.installment_paid_date", "Paid On", ["paid on", "paid date"]),
      month("r.installment_due_date"),
      money("amount", "COALESCE(r.installment_amount,0)", "Amount", ["amount", "instalment amount", "installment amount"]),
      money("penalty", "COALESCE(r.penalty_collected,0)", "Penalty", ["penalty", "fine"]),
      count("r.id", "No. of Instalments"),
    ],
  },

  // ======================= SHARE TRANSACTIONS =======================
  {
    key: "share_txns",
    label: "Share Transactions",
    synonyms: ["share", "share transaction", "share txn", "share collected", "share collection", "share refund", "share paid"],
    from: `member_share_transactions mst
  ${MEMBER_JOIN("mst")}
  ${BRANCH_JOIN("mst.branch_id")}`,
    branchColumn: "mst.branch_id",
    dateField: "txn_date",
    defaultColumns: ["txn_date", "membership_no", "member_name", "voucher_type", "credit", "debit", "status"],
    defaultMeasure: "credit",
    fields: [
      date("txn_date", "mst.business_date", "Date", ["date", "daily", "day wise"]),
      month("mst.business_date"),
      ...MEMBER_FIELDS, BRANCH_FIELD,
      text("member_class", "m.membership_class", "Class", ["class", "class wise"]),
      text("voucher_type", "UPPER(mst.voucher_type)", "Mode", ["cash", "transfer", "mode"]),
      text("status", "UPPER(mst.status)", "Status", ["status"]),
      money("credit", "COALESCE(mst.credit_amount,0)", "Share Paid", ["credit", "collected", "collection", "paid", "share amount"]),
      money("debit", "COALESCE(mst.debit_amount,0)", "Refund", ["debit", "refund", "refunded", "withdrawn"]),
      money("net", "COALESCE(mst.credit_amount,0) - COALESCE(mst.debit_amount,0)", "Net", ["net"]),
      count("mst.id", "No. of Txns"),
    ],
  },

  // ======================= LOAN DEMAND (instalment dues) =======================
  {
    key: "loan_demand",
    label: "Loan Demand / Dues",
    synonyms: ["loan", "demand", "due", "due list", "instalment", "installment", "emi", "dcb", "demand collection balance", "repayment schedule", "thavanai list"],
    from: `loan_repayment_schedule_details s
  JOIN loan_applications la ON la.loan_application_id::text = s.loan_account_no
  LEFT JOIN loan_schemes ls ON ls.scheme_id = la.scheme_id AND ls.branch_id = la.branch_id
  ${MEMBER_JOIN("la")}
  ${BRANCH_JOIN("la.branch_id")}`,
    branchColumn: "la.branch_id",
    dateField: "due_date",
    defaultColumns: ["loan_no", "member_name", "mobile", "scheme", "installment_no", "due_date", "principal_due", "interest_due", "total_due", "payment_status"],
    defaultMeasure: "total_due",
    fields: [
      text("loan_no", "s.loan_account_no", "Loan No", ["loan no", "loan wise"]),
      ...MEMBER_FIELDS, BRANCH_FIELD,
      text("scheme", "ls.scheme_name", "Scheme", ["scheme", "scheme wise"]),
      text("installment_no", "s.installment_no", "Inst. No", ["instalment no", "installment no"]),
      text("payment_status", "UPPER(s.payment_status)", "Status", ["status", "payment status"]),
      text("installment_type", "s.installment_type", "Inst. Type", ["instalment type"]),
      date("due_date", "s.due_date", "Due Date", ["due date", "due on"]),
      month("s.due_date"),
      money("principal_due", "COALESCE(s.principal_amount,0)", "Principal Due", ["principal", "principal due"]),
      money("interest_due", "COALESCE(s.interest_amount,0)", "Interest Due", ["interest", "interest due"]),
      money("total_due", "COALESCE(s.total_installment,0)", "Total Due", ["demand", "due", "dues", "due amount", "instalment", "installment", "emi"]),
      money("balance_principal", "COALESCE(s.balance_principal,0)", "Balance Principal", ["balance principal", "balance"]),
      count("s.id", "No. of Instalments"),
    ],
  },

  // ======================= LOAN SECURITIES (all types) =======================
  {
    key: "securities",
    label: "Loan Securities",
    synonyms: ["loan", "security", "securities", "collateral", "pledge", "pledged", "lien", "property security", "vehicle security", "surety", "mortgage", "adamanam", "அடமானம்"],
    from: `loan_securities sec
  LEFT JOIN loan_scheme_security_master sm ON sm.security_id = sec.security_type_id
  JOIN loan_applications la ON la.loan_application_id = sec.loan_application_id AND la.branch_id = sec.branch_id
  LEFT JOIN loan_schemes ls ON ls.scheme_id = la.scheme_id AND ls.branch_id = la.branch_id
  LEFT JOIN security_gold_details gd ON gd.security_id = sec.id
  ${MEMBER_JOIN("la")}
  ${BRANCH_JOIN("sec.branch_id")}`,
    branchColumn: "sec.branch_id",
    baseWhere: ["COALESCE(sec.is_deleted, false) = false"],
    dateField: "valuation_date",
    defaultColumns: ["loan_no", "member_name", "scheme", "security_type", "security_ref_no", "assessed_value", "valuation_date", "lien_marked", "security_status"],
    defaultMeasure: "assessed_value",
    fields: [
      text("loan_no", "la.loan_application_id", "Loan No", ["loan no", "loan wise"]),
      ...MEMBER_FIELDS, BRANCH_FIELD,
      text("scheme", "ls.scheme_name", "Scheme", ["scheme", "scheme wise"]),
      text("loan_status", "UPPER(la.application_status)", "Loan Status", ["loan status"]),
      text("security_type", "sm.security_name", "Security Type", ["security type", "type wise", "type"]),
      text("security_ref_no", "sec.security_ref_no", "Ref No", ["ref no", "reference"]),
      text("security_status", "UPPER(sec.security_status)", "Status", ["status"]),
      text("verification_status", "UPPER(sec.verification_status)", "Verification", ["verification", "verified", "unverified"]),
      text("lien_marked", "CASE WHEN sec.lien_marked THEN 'YES' ELSE 'NO' END", "Lien", ["lien marked"]),
      text("description", "sec.description", "Description", ["description"]),
      date("valuation_date", "sec.valuation_date", "Valued On", ["valuation date", "valued on"]),
      date("lien_release_date", "sec.lien_release_date", "Released On", ["released on", "release date"]),
      money("assessed_value", "COALESCE(sec.assessed_value,0)", "Assessed Value", ["value", "assessed value", "security value"]),
      money("forced_sale_value", "COALESCE(sec.forced_sale_value,0)", "Forced Sale Value", ["forced sale", "distress value"]),
      money("net_weight", "COALESCE(gd.net_weight_grams,0)", "Net Wt (g)", ["weight", "net weight", "gold weight"]),
      count("sec.id", "No. of Securities"),
    ],
  },

  // ======================= LOCKERS =======================
  {
    key: "lockers",
    label: "Lockers",
    synonyms: ["locker", "lockers", "safe deposit", "locker rent"],
    from: `lockers l
  LEFT JOIN locker_types lty ON lty.locker_type_id = l.locker_type_id AND lty.branch_id = l.branch_id
  LEFT JOIN LATERAL (
    SELECT * FROM locker_assignments a WHERE a.locker_id = l.id AND UPPER(a.status) = 'ACTIVE' ORDER BY a.assigned_date DESC LIMIT 1
  ) asg ON true
  LEFT JOIN memberships m ON m.membership_no::text = asg.membership_no::text AND m.branch_id = l.branch_id
  LEFT JOIN customers c ON c.customer_code = m.customer_code
  LEFT JOIN LATERAL (SELECT * FROM customer_address x WHERE x.customer_code = m.customer_code LIMIT 1) ca ON true
  ${BRANCH_JOIN("l.branch_id")}`,
    branchColumn: "l.branch_id",
    dateField: "expiry_date",
    defaultColumns: ["locker_no", "locker_type", "cabinet_no", "locker_status", "membership_no", "member_name", "assigned_date", "expiry_date", "annual_rent"],
    defaultMeasure: "count",
    fields: [
      text("locker_no", "l.locker_no", "Locker No", ["locker no"]),
      text("locker_type", "lty.type_name", "Type", ["locker type", "type wise", "size"]),
      text("cabinet_no", "l.cabinet_no", "Cabinet", ["cabinet", "cabinet wise"]),
      text("locker_status", "UPPER(l.status)", "Status", ["status", "vacant", "available", "allotted"]),
      ...MEMBER_FIELDS, BRANCH_FIELD,
      date("assigned_date", "asg.assigned_date", "Allotted On", ["allotted on", "assigned on"]),
      date("expiry_date", "asg.expiry_date", "Expiry", ["expiry", "expiring", "renewal", "due for renewal"]),
      money("annual_rent", "COALESCE(asg.annual_rent, lty.annual_rent, 0)", "Annual Rent", ["rent", "annual rent"]),
      money("deposit_amount", "COALESCE(asg.deposit_amount,0)", "Deposit", ["locker deposit"]),
      count("l.id", "No. of Lockers", true),
    ],
  },

  // ======================= FIXED ASSETS =======================
  {
    key: "assets",
    label: "Fixed Assets",
    synonyms: ["asset", "assets", "fixed asset", "fixed assets", "furniture", "depreciation", "book value", "dead stock"],
    from: `asset_items ai
  LEFT JOIN asset_categories acat ON acat.category_id = ai.category_id
  LEFT JOIN LATERAL (
    SELECT SUM(pi.total_cost) AS cost, SUM(pi.quantity) AS qty
    FROM asset_purchase_items pi WHERE pi.asset_id = ai.asset_id AND pi.branch_id = ai.branch_id
  ) pc ON true
  LEFT JOIN LATERAL (
    SELECT d.accumulated_depreciation, d.book_value, d.depreciation_date
    FROM asset_depreciation_details d
    WHERE d.asset_id = ai.asset_id AND d.branch_id = ai.branch_id AND d.depreciation_date <= {{AS_ON}}
    ORDER BY d.depreciation_date DESC LIMIT 1
  ) dep ON true
  LEFT JOIN LATERAL (
    SELECT SUM(sd.sale_amount) AS sold_for, MAX(sd.sale_date) AS sale_date
    FROM asset_sales_details sd WHERE sd.asset_id = ai.asset_id AND sd.branch_id = ai.branch_id
  ) sl ON true
  ${BRANCH_JOIN("ai.branch_id")}`,
    branchColumn: "ai.branch_id",
    dateMode: "param",
    dateField: "none",
    defaultColumns: ["asset_name", "category", "quantity", "cost", "accumulated_depreciation", "book_value", "sale_date"],
    defaultMeasure: "book_value",
    fields: [
      text("asset_name", "ai.asset_name", "Asset", ["asset name", "asset wise", "item"]),
      text("category", "acat.category_name", "Category", ["category", "category wise"]),
      text("sold", "CASE WHEN sl.sale_date IS NULL THEN 'IN USE' ELSE 'SOLD' END", "In Use / Sold", ["sold", "in use", "disposed"]),
      BRANCH_FIELD,
      date("none", "NULL::date", "-", []),
      date("sale_date", "sl.sale_date", "Sold On", ["sold on", "sale date"]),
      date("last_depreciation", "dep.depreciation_date", "Last Depreciation", ["depreciation date"]),
      money("quantity", "COALESCE(pc.qty,0)", "Qty", ["quantity", "qty"]),
      money("cost", "COALESCE(pc.cost,0)", "Cost", ["cost", "purchase value", "purchase cost"]),
      money("accumulated_depreciation", "COALESCE(dep.accumulated_depreciation,0)", "Acc. Depreciation", ["depreciation", "accumulated depreciation"]),
      money("book_value", "COALESCE(dep.book_value, pc.cost, 0)", "Book Value (WDV)", ["book value", "wdv", "written down value", "value"]),
      money("sale_amount", "COALESCE(sl.sold_for,0)", "Sale Amount", ["sale amount", "sold for"]),
      count("ai.id", "No. of Assets"),
    ],
  },
]
