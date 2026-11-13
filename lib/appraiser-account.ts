import type { PoolClient } from "pg"

// Account an appraiser's charge is credited to (appraiser_master.account_number / account_type).
export type AppraiserAccount = {
  appraiser_id: number
  appraiser_code: string
  appraiser_name: string
  account_number: string
  account_type: "SAVINGS" | "SUNDRY_CREDITOR"
  gl_account: string
  // GL income ledger that receives the society's share of the charge
  income_account_code: string
  income_account_name: string
}

const MANAGE_HINT = "Update it in Settings > Management > Manage Appraiser Details."

// Appraiser charge distribution: 80% to the appraiser's account, 20% to the income account.
export const APPRAISER_SHARE_PERCENT = 80
export const INCOME_SHARE_PERCENT = 100 - APPRAISER_SHARE_PERCENT

// Splits a charge into the appraiser and income shares, in whole paise, so the two
// amounts always add up exactly to the (2-decimal) charge. The income share takes the
// rounding remainder.
export function splitAppraiserCharge(totalCharge: number) {
  const totalPaise = Math.round(totalCharge * 100)
  const appraiserPaise = Math.round((totalPaise * APPRAISER_SHARE_PERCENT) / 100)
  const incomePaise = totalPaise - appraiserPaise
  return {
    total: totalPaise / 100,
    appraiserShare: appraiserPaise / 100,
    incomeShare: incomePaise / 100,
  }
}

// Validates that the code is an active income ledger in the branch's chart of accounts.
// Returns the account name, or { error }.
export async function findIncomeAccount(
  client: Pick<PoolClient, "query">,
  branchId: number | string,
  accountCode: number | string
): Promise<{ accountName: string; error?: undefined } | { accountName?: undefined; error: string }> {
  const code = String(accountCode ?? "").trim()
  if (!/^\d+$/.test(code)) return { error: "Invalid income account" }

  const { rows } = await client.query(
    `SELECT accountname, accounttypecode,
            (isledger = B'1') AS is_ledger, (isactive = B'1') AS is_active
     FROM chart_of_accounts
     WHERE branch_id = $1 AND accountcode = $2`,
    [branchId, code]
  )
  const acc = rows[0]
  if (!acc) return { error: `Income account ${code} was not found in the chart of accounts` }
  if (Number(acc.accounttypecode) !== 3) return { error: `Account ${code} (${acc.accountname}) is not an income account` }
  if (!acc.is_ledger) return { error: `Income account ${code} (${acc.accountname}) is not a ledger account` }
  if (!acc.is_active) return { error: `Income account ${code} (${acc.accountname}) is not active` }
  return { accountName: acc.accountname }
}

// Loads the appraiser and locks their designated account.
// Returns { error } when the appraiser or account cannot receive the charge.
export async function lockAppraiserAccount(
  client: PoolClient,
  branchId: number | string,
  appraiserId: number
): Promise<{ account: AppraiserAccount; error?: undefined } | { account?: undefined; error: string }> {
  const { rows } = await client.query(
    `SELECT appraiser_id, appraiser_code, appraiser_name, status,
            account_number::text AS account_number, account_type,
            income_account_code::text AS income_account_code
     FROM appraiser_master
     WHERE appraiser_id = $1 AND branch_id = $2`,
    [appraiserId, branchId]
  )
  const appraiser = rows[0]
  if (!appraiser) return { error: "Selected appraiser was not found" }

  const label = `${appraiser.appraiser_name} (${appraiser.appraiser_code})`
  if (appraiser.status !== "ACTIVE") return { error: `Appraiser ${label} is inactive` }
  if (!appraiser.account_number || !appraiser.account_type) {
    return { error: `No account is configured for appraiser ${label}. ${MANAGE_HINT}` }
  }

  const accountNo = appraiser.account_number
  let glAccount: string | null = null
  let accountStatus: string | null = null

  if (appraiser.account_type === "SAVINGS") {
    const { rows: acc } = await client.query(
      `SELECT sa.account_status, ss.savings_gl_account AS gl_account
       FROM savings_accounts sa
       JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
       WHERE sa.account_number = $1 AND sa.branch_id = $2
       FOR UPDATE OF sa`,
      [accountNo, branchId]
    )
    if (acc.length === 0) return { error: `Appraiser savings account ${accountNo} was not found. ${MANAGE_HINT}` }
    glAccount = acc[0].gl_account
    accountStatus = acc[0].account_status
  } else if (appraiser.account_type === "SUNDRY_CREDITOR") {
    const { rows: acc } = await client.query(
      `SELECT account_status, parent_account_number AS gl_account
       FROM sundry_creditors
       WHERE account_number = $1 AND branch_id = $2
       FOR UPDATE`,
      [accountNo, branchId]
    )
    if (acc.length === 0) return { error: `Appraiser sundry creditor account ${accountNo} was not found. ${MANAGE_HINT}` }
    glAccount = acc[0].gl_account
    accountStatus = acc[0].account_status
  } else {
    return { error: `Account type ${appraiser.account_type} is not supported for appraiser ${label}. ${MANAGE_HINT}` }
  }

  if (String(accountStatus).toUpperCase() !== "ACTIVE") {
    return { error: `Appraiser account ${accountNo} is not active. ${MANAGE_HINT}` }
  }
  if (!glAccount) return { error: `GL account is not configured for appraiser account ${accountNo}` }

  // Income account for the society's share of the charge
  if (!appraiser.income_account_code) {
    return { error: `No income account is configured for appraiser ${label}. ${MANAGE_HINT}` }
  }
  const income = await findIncomeAccount(client, branchId, appraiser.income_account_code)
  if (income.error) return { error: `${income.error}. ${MANAGE_HINT}` }

  return {
    account: {
      appraiser_id: appraiser.appraiser_id,
      appraiser_code: appraiser.appraiser_code,
      appraiser_name: appraiser.appraiser_name,
      account_number: accountNo,
      account_type: appraiser.account_type,
      gl_account: String(glAccount),
      income_account_code: appraiser.income_account_code,
      income_account_name: income.accountName!,
    },
  }
}

// CR the appraiser's account GL in the given batch, record the sub-ledger transaction
// and update the account balance (pending voucher approval, like other transfers).
export async function creditAppraiserAccount(
  client: PoolClient,
  p: {
    account: AppraiserAccount
    branchId: number | string
    batchId: number
    voucherNo: number
    businessDate: string
    voucherType: "CASH" | "TRANSFER"
    amount: number
    narration: string
    userId: string
  }
) {
  const { account, branchId, batchId, voucherNo, businessDate, voucherType, amount, narration, userId } = p

  await client.query(
    `INSERT INTO gl_batch_lines (
       branch_id, batch_id, business_date,
       accountcode, ref_account_id,
       debit_amount, credit_amount,
       voucher_id, narration, created_by
     ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)`,
    [branchId, batchId, businessDate, account.gl_account, account.account_number, amount, voucherNo, narration, userId]
  )

  if (account.account_type === "SAVINGS") {
    // Pending savings credit: the account balance is set from running_balance when the
    // voucher is verified (FAS → Verify Voucher), and a rejected voucher leaves it untouched,
    // so the balance is not updated here. The row is already locked by lockAppraiserAccount.
    const { rows: [current] } = await client.query(
      `SELECT available_balance FROM savings_accounts
       WHERE account_number = $1 AND branch_id = $2`,
      [account.account_number, branchId]
    )
    if (!current) throw new Error(`Appraiser savings account ${account.account_number} was not found`)
    const bal = { available_balance: Math.round((parseFloat(current.available_balance) + amount) * 100) / 100 }

    await client.query(
      `INSERT INTO savings_transactions (
         branch_id, account_number,
         transaction_date, value_date,
         transaction_type, voucher_type,
         debit_amount, credit_amount, running_balance,
         narration, voucher_no, gl_batch_id,
         status, created_by
       ) VALUES ($1, $2, $3, $3, 'DEPOSIT', $4, 0, $5, $6, $7, $8, $9, 'PENDING', $10)`,
      [branchId, account.account_number, businessDate, voucherType, amount, bal.available_balance,
       narration, voucherNo, batchId, userId]
    )
  } else {
    const { rows: [bal] } = await client.query(
      `UPDATE sundry_creditors
       SET ledger_balance = ledger_balance + $1, updated_at = NOW()
       WHERE account_number = $2 AND branch_id = $3
       RETURNING ledger_balance`,
      [amount, account.account_number, branchId]
    )

    await client.query(
      `INSERT INTO sundry_creditor_transactions (
         branch_id, account_number,
         transaction_date, voucher_type,
         description, debit_amount, credit_amount,
         running_balance, reference_no,
         gl_batch_id, voucher_no,
         created_by
       ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, NULL, $8, $9, $10)`,
      [branchId, account.account_number, businessDate, voucherType, narration, amount, bal.ledger_balance,
       batchId, voucherNo, userId]
    )
  }
}

// Posts an appraiser charge into the given batch as two credits that together equal the
// charge: the appraiser's share to their account and the society's share to the income
// account. The caller posts the matching debit(s) in the same batch, inside the same DB
// transaction, so either every line is posted or none is.
export async function postAppraiserChargeCredits(
  client: PoolClient,
  p: {
    account: AppraiserAccount
    branchId: number | string
    batchId: number
    voucherNo: number
    businessDate: string
    voucherType: "CASH" | "TRANSFER"
    amount: number
    narration: string
    userId: string
  }
) {
  const split = splitAppraiserCharge(p.amount)
  if (split.appraiserShare <= 0) throw new Error("Appraiser charge is too small to distribute")

  await creditAppraiserAccount(client, {
    ...p,
    amount: split.appraiserShare,
    narration: `${p.narration} (${APPRAISER_SHARE_PERCENT}% appraiser share)`,
  })

  if (split.incomeShare > 0) {
    await client.query(
      `INSERT INTO gl_batch_lines (
         branch_id, batch_id, business_date,
         accountcode, ref_account_id,
         debit_amount, credit_amount,
         voucher_id, narration, created_by
       ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)`,
      // GL-only line (no sub-ledger), so ref_account_id is '0' as for Cash
      [p.branchId, p.batchId, p.businessDate, p.account.income_account_code, '0',
       split.incomeShare, p.voucherNo, `${p.narration} (${INCOME_SHARE_PERCENT}% income share)`, p.userId]
    )
  }

  return split
}
