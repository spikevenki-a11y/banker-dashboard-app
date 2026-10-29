import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { checkDayEndRestriction } from "@/lib/dayend-check"
import { openGlVoucher, lockOpenTransferBatch, insertGlLine, type GlVoucherType } from "@/lib/gl-voucher"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const accountNumber = searchParams.get("account")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!accountNumber) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }

    // Get deposit account info with member/scheme details vengatesh
    const { rows: accountRows } = await pool.query(
      `SELECT
        da.id, da.accountnumber, da.deposittype, da.membership_no,
        da.accountopendate, da.rateofinterest, da.clearbalance, da.unclearbalance,
        da.accountstatus, da.schemeid,
        ds.scheme_name, ds.deposit_gl_account, ds.interest_expense_gl_account,
        ds.interest_payable_gl_account,
        c.full_name AS member_name,
        m.customer_code,
        td.depositamount, td.periodmonths, td.perioddays,
        td.maturitydate AS td_maturity_date, td.maturityamount AS td_maturity_amount,
        rd.installment_amount, rd.installment_frequency,
        rd.numberofinstallments, rd.numberofinstalmentspaid,
        rd.maturitydate AS rd_maturity_date, rd.maturityamount AS rd_maturity_amount,
        rd.nextinstalmentdate, rd.penalrate,
        pd.minimum_daily_amount, pd.collection_frequency
      FROM deposit_account da
      LEFT JOIN memberships m ON m.membership_no = da.membership_no AND m.branch_id = da.branch_id
      LEFT JOIN customers c ON c.customer_code = m.customer_code
      LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
      LEFT JOIN term_deposit_details td ON td.accountnumber = da.accountnumber
      LEFT JOIN recurring_deposit_details rd ON rd.accountnumber = da.accountnumber
      LEFT JOIN pigmy_deposit_details pd ON pd.accountnumber = da.accountnumber
      WHERE da.accountnumber = $1 AND da.branch_id = $2`,
      [accountNumber, branchId]
    )

    if (accountRows.length === 0) {
      return NextResponse.json({ error: "Deposit account not found" }, { status: 404 })
    }

    const account = accountRows[0]

    // Get transaction history from deposit_transactions
    const { rows: transactions } = await pool.query(
      `SELECT
        dt.id,
        dt.transaction_date,
        dt.transaction_type,
        dt.voucher_type,
        dt.debit_amount,
        dt.credit_amount,
        dt.running_balance,
        dt.narration,
        dt.voucher_no,
        dt.gl_batch_id,
        dt.created_at,
        gb.status AS batch_status
      FROM deposit_transactions dt
      LEFT JOIN gl_batches gb ON gb.branch_id = dt.branch_id AND gb.batch_id = dt.gl_batch_id
      WHERE dt.accountnumber = $1 AND dt.branch_id = $2
      ORDER BY dt.transaction_date DESC, dt.created_at DESC
      LIMIT $3 OFFSET $4`,
      [String(accountNumber), branchId, limit, offset]
    )

    const { rows: countResult } = await pool.query(
      `SELECT COUNT(*) as total FROM deposit_transactions WHERE accountnumber = $1  AND branch_id = $2`,
      [String(accountNumber), branchId]
    )

    // Fetch RD installment details if it's a recurring deposit
    let rdInstallments: any[] = []
    if (account.deposittype === "RECURING" || account.deposittype === "R" || account.deposittype === "RECURRING") {
      const { rows: installmentRows } = await pool.query(
        `SELECT
          id, installment_number, installment_amount, installment_due_date,
          installment_paid_date, installment_voucher_no, penalty_collected
        FROM rd_installment_details
        WHERE accountnumber = $1 AND branch_id = $2
        ORDER BY installment_number ASC`,
        [accountNumber, branchId]
      )
      rdInstallments = installmentRows
    }

    return NextResponse.json({
      account: {
        accountNumber: String(account.accountnumber),
        depositType: account.deposittype,
        membershipNo: String(account.membership_no),
        memberName: account.member_name || "N/A",
        openDate: account.accountopendate,
        interestRate: Number(account.rateofinterest),
        balance: Number(account.clearbalance),
        unclearBalance: Number(account.unclearbalance),
        accountStatus: account.accountstatus,
        schemeId: account.schemeid,
        schemeName: account.scheme_name || "N/A",
        depositGlAccount: account.depositGl,
        // Type-specific
        depositAmount: account.depositamount ,
        periodMonths: account.periodmonths,
        periodDays: account.perioddays,
        maturityDate: account.td_maturity_date || account.rd_maturity_date || null,
        maturityAmount: account.td_maturity_amount
          ? Number(account.td_maturity_amount)
          : account.rd_maturity_amount
            ? Number(account.rd_maturity_amount)
            : null,
        installmentAmount: account.installment_amount ? Number(account.installment_amount) : null,
        installmentFrequency: account.installment_frequency,
        totalInstallments: account.numberofinstallments,
        paidInstallments: account.numberofinstalmentspaid,
        nextInstallmentDate: account.nextinstalmentdate,
        penalRate: account.penalrate ? Number(account.penalrate) : 0,
        dailyAmount: account.minimum_daily_amount ? Number(account.minimum_daily_amount) : null,
        collectionFrequency: account.collection_frequency,
      },
      transactions,
      total: parseInt(countResult[0]?.total || "0"),
      rdInstallments,
    })
  } catch (error: any) {
    console.error("Failed to fetch deposit transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions: " + error.message }, { status: 500 })
  }
}

// Voucher types follow the Loans → Loan Disbursement transfer logic (mirrored: the deposit is credited):
// CASH             — DR Cash, CR Deposit; balanced voucher.
// TRANSFER         — Bank Transfer. CR Deposit only, posted into a selected open transfer batch
//                    (or a new one). The batch stays open until the contra (debit) entry is posted.
// DEFAULT_TRANSFER — DR member's savings account(s), CR Deposit; balanced voucher. Savings
//                    balances are updated when the voucher is verified, like other savings debits.
const DEPOSIT_VOUCHER_TYPES = ["CASH", "TRANSFER", "DEFAULT_TRANSFER"]
const CASH_GL_ACCOUNT = "23100000"
const RD_TYPES = ["R", "RECURING", "RECURRING"]

const round2 = (n: number) => Math.round(n * 100) / 100

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const businessDate = session.businessDate

    const body = await request.json()
    const { accountNumber, amount, narration, voucherType, selectedBatch, debitAccounts, selectedInstallments } = body

    if (!accountNumber || !amount) {
      return NextResponse.json({ error: "Account number and amount are required" }, { status: 400 })
    }

    if (!voucherType || !DEPOSIT_VOUCHER_TYPES.includes(voucherType)) {
      return NextResponse.json(
        { error: "Valid voucher type (Cash / Bank Transfer / Default Transfer) is required" },
        { status: 400 }
      )
    }

    const amt = round2(parseFloat(amount))
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 })
    }

    const isTransfer = voucherType === "TRANSFER"
    const isDefaultTransfer = voucherType === "DEFAULT_TRANSFER"
    const glVoucherType: GlVoucherType = voucherType === "CASH" ? "CASH" : "TRANSFER"

    // An existing GL batch can only be reused for Bank Transfer (0/empty = new batch)
    if (isTransfer && selectedBatch && !(Number.isInteger(Number(selectedBatch)) && Number(selectedBatch) >= 0)) {
      return NextResponse.json({ error: "Invalid GL batch" }, { status: 400 })
    }
    const existingBatchId = isTransfer && Number(selectedBatch) > 0 ? Number(selectedBatch) : 0

    // Default Transfer: one or more of the member's savings accounts, each debited once
    const debits: { accountNumber: string; amount: number }[] = []
    if (isDefaultTransfer) {
      for (const d of Array.isArray(debitAccounts) ? debitAccounts : []) {
        const debitAmt = round2(parseFloat(d?.amount))
        if (!d?.accountNumber || isNaN(debitAmt) || debitAmt <= 0) continue
        if (debits.some((x) => x.accountNumber === String(d.accountNumber))) {
          return NextResponse.json({ error: `Savings account ${d.accountNumber} is listed more than once` }, { status: 400 })
        }
        debits.push({ accountNumber: String(d.accountNumber), amount: debitAmt })
      }
      if (debits.length === 0) {
        return NextResponse.json({ error: "Savings account is required for Default Transfer" }, { status: 400 })
      }
      const totalDebit = round2(debits.reduce((s, d) => s + d.amount, 0))
      if (Math.abs(totalDebit - amt) > 0.01) {
        return NextResponse.json(
          { error: `Total debit (${totalDebit.toFixed(2)}) must equal credit amount (${amt.toFixed(2)})` },
          { status: 400 }
        )
      }
    }

    const installments: { id: any; penalty: number }[] = Array.isArray(selectedInstallments)
      ? selectedInstallments.map((i: any) => ({ id: i?.id, penalty: Number(i?.penalty) || 0 }))
      : []
    if (installments.some((i) => i.id == null || i.penalty < 0)) {
      return NextResponse.json({ error: "Invalid installment selection" }, { status: 400 })
    }
    if (new Set(installments.map((i) => String(i.id))).size !== installments.length) {
      return NextResponse.json({ error: "An installment is selected more than once" }, { status: 400 })
    }

    const dayendErr = await checkDayEndRestriction(branchId, businessDate)
    if (dayendErr) return dayendErr

    await client.query("BEGIN")

    // Get account info
    const { rows: accounts } = await client.query(
      `SELECT da.*, ds.deposit_gl_account, ds.scheme_name, td.depositamount
       FROM deposit_account da
       JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
       LEFT JOIN term_deposit_details td ON td.accountnumber = da.accountnumber
       WHERE da.accountnumber = $1 AND da.branch_id = $2
       FOR UPDATE OF da`,
      [accountNumber, branchId]
    )

    if (accounts.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Deposit account not found" }, { status: 404 })
    }

    const account = accounts[0]

    if (account.accountstatus !== 1) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account is not active. Only active accounts can receive deposits." }, { status: 400 })
    }

    const depositGlAccount = account.deposit_gl_account
    if (!depositGlAccount) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Deposit GL account is not configured for the deposit scheme" }, { status: 400 })
    }

    const isRd = RD_TYPES.includes(account.deposittype)
    const isTerm = account.deposittype === "TERM"

    // Term deposit is funded once, for exactly the deposit amount
    if (isTerm) {
      const termAmount = parseFloat(account.depositamount) || 0
      if (termAmount > 0 && Math.abs(amt - termAmount) > 0.01) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: `Credit amount must equal the deposit amount (${termAmount.toFixed(2)})` },
          { status: 400 }
        )
      }
      const { rows: [funded] } = await client.query(
        `SELECT COUNT(*)::int AS n FROM deposit_transactions
         WHERE accountnumber = $1 AND branch_id = $2
           AND transaction_type = 'DEPOSIT' AND status IN ('PENDING', 'COMPLETED')`,
        [String(accountNumber), branchId]
      )
      if (funded.n > 0 || (termAmount > 0 && parseFloat(account.clearbalance) >= termAmount)) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "This deposit has already been credited (or a credit is awaiting verification)" },
          { status: 400 }
        )
      }
    }

    // RD: the selected installments must belong to this account and still be unpaid
    // (an installment in a pending voucher is already marked paid)
    if (isRd && installments.length > 0) {
      const { rows: instRows } = await client.query(
        `SELECT id, installment_amount, installment_paid_date
         FROM rd_installment_details
         WHERE id::text = ANY($1::text[]) AND accountnumber = $2 AND branch_id = $3
         FOR UPDATE`,
        [installments.map((i) => String(i.id)), accountNumber, branchId]
      )
      if (instRows.length !== installments.length) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Selected installments were not found for this account" }, { status: 400 })
      }
      if (instRows.some((r: any) => r.installment_paid_date)) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "One or more selected installments are already paid. Reload the account and try again." },
          { status: 400 }
        )
      }
      const expected = round2(
        instRows.reduce((s: number, r: any) => s + (parseFloat(r.installment_amount) || 0), 0) +
          installments.reduce((s, i) => s + i.penalty, 0)
      )
      if (Math.abs(expected - amt) > 0.01) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: `Credit amount must equal the selected installments plus penalty (${expected.toFixed(2)})` },
          { status: 400 }
        )
      }
    }

    // Balance after this credit, counting credits still awaiting verification so the
    // running balance stays in sequence
    const { rows: [pending] } = await client.query(
      `SELECT COALESCE(SUM(credit_amount), 0) AS total FROM deposit_transactions
       WHERE accountnumber = $1 AND branch_id = $2
         AND transaction_type = 'DEPOSIT' AND status = 'PENDING'`,
      [String(accountNumber), branchId]
    )
    const newBalance = round2(parseFloat(account.clearbalance) + (parseFloat(pending.total) || 0) + amt)

    // Default Transfer: lock and validate the member's source savings account(s)
    const savingsSources: { accountNumber: string; amount: number; glAccount: string; newBalance: number }[] = []
    if (isDefaultTransfer) {
      for (const debit of debits) {
        const { rows: savingsRows } = await client.query(
          `SELECT sa.*, ss.savings_gl_account
           FROM savings_accounts sa
           JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
           WHERE sa.account_number = $1 AND sa.branch_id = $2
             AND CAST(sa.membership_no AS VARCHAR) = $3
           FOR UPDATE`,
          [debit.accountNumber, branchId, String(account.membership_no)]
        )

        if (savingsRows.length === 0) {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: `Savings account ${debit.accountNumber} not found for this member` }, { status: 404 })
        }

        const savingsAccount = savingsRows[0]

        if (String(savingsAccount.account_status).toUpperCase() !== "ACTIVE") {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: `Savings account ${debit.accountNumber} is not active` }, { status: 400 })
        }

        if (!savingsAccount.savings_gl_account) {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: "Savings GL account is not configured for the savings scheme" }, { status: 400 })
        }

        const savingsBalance = parseFloat(savingsAccount.available_balance)
        if (debit.amount > savingsBalance) {
          await client.query("ROLLBACK")
          return NextResponse.json({
            error: `Insufficient balance in savings account ${debit.accountNumber}. Available: ${savingsBalance}, Required: ${debit.amount}`
          }, { status: 400 })
        }

        savingsSources.push({
          accountNumber: debit.accountNumber,
          amount: debit.amount,
          glAccount: savingsAccount.savings_gl_account,
          newBalance: round2(savingsBalance - debit.amount),
        })
      }
    }

    // GL batch + voucher: reuse the selected open batch (Bank Transfer), otherwise open a new one
    let batchId: number
    let voucherNo: number
    if (existingBatchId) {
      const locked = await lockOpenTransferBatch(client, { branchId, batchId: existingBatchId, businessDate })
      if (locked.error) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: locked.error }, { status: 400 })
      }
      batchId = existingBatchId
      voucherNo = locked.voucherNo!
    } else {
      ;({ batchId, voucherNo } = await openGlVoucher(client, {
        branchId, businessDate, voucherType: glVoucherType, userId: session.userId,
      }))
    }

    const txnNarration = narration || "Deposit Credit"
    const line = { branchId, batchId, businessDate, voucherNo, userId: session.userId }

    if (isDefaultTransfer) {
      // DR Savings GL (liability decreases) — debit member's savings account(s)
      const savingsNarration = `Transfer to Deposit A/c ${accountNumber}`
      for (const source of savingsSources) {
        await insertGlLine(client, {
          ...line,
          accountCode: source.glAccount, refAccountId: source.accountNumber,
          debit: source.amount,
          narration: savingsNarration,
        })

        // Pending savings debit. The account balance is set from running_balance when the
        // voucher is verified (FAS → Verify Voucher), so it is not updated here.
        await client.query(
          `INSERT INTO savings_transactions (
             branch_id, account_number,
             transaction_date, value_date,
             transaction_type, voucher_type,
             debit_amount, credit_amount, running_balance,
             narration, voucher_no, gl_batch_id,
             status, created_by
           ) VALUES (
             $1,$2,
             $3,$3,
             'WITHDRAWAL','TRANSFER',
             $4,0,$5,
             $6,$7,$8,
             'PENDING',$9
           )`,
          [
            branchId, source.accountNumber,
            businessDate,
            source.amount, source.newBalance,
            savingsNarration,
            voucherNo, batchId,
            session.userId,
          ]
        )
      }
    } else if (!isTransfer) {
      // CASH: DR Cash (asset increases)
      await insertGlLine(client, {
        ...line,
        accountCode: CASH_GL_ACCOUNT, refAccountId: "0",
        debit: amt,
        narration: txnNarration,
      })
    }
    // TRANSFER: no contra line here — the batch stays open for the debit side to be posted

    // CR Deposit GL (liability increases) — all voucher types
    await insertGlLine(client, {
      ...line,
      accountCode: depositGlAccount, refAccountId: String(accountNumber),
      credit: amt,
      narration: txnNarration,
    })

    // Record deposit transaction in module table. The deposit balance is set from
    // running_balance when the voucher is verified.
    await client.query(
      `INSERT INTO deposit_transactions (
         branch_id, accountnumber,
         transaction_date, value_date,
         transaction_type, voucher_type,
         debit_amount, credit_amount, running_balance,
         narration, voucher_no, gl_batch_id,
         status, created_by
       ) VALUES ($1,$2,$3,$3,'DEPOSIT',$4,0,$5,$6,$7,$8,$9,'PENDING',$10)`,
      [
        branchId, String(accountNumber),
        businessDate,
        glVoucherType,
        amt, newBalance,
        txnNarration, voucherNo, batchId,
        session.userId,
      ]
    )

    // If RD, update paid installments count and mark selected installments as paid
    if (isRd) {
      const installmentCount = installments.length > 0 ? installments.length : 1

      await client.query(
        `UPDATE recurring_deposit_details
         SET numberofinstalmentspaid = COALESCE(numberofinstalmentspaid, 0) + $1,
             nextinstalmentdate = nextinstalmentdate + ($2 || ' months')::INTERVAL
         WHERE accountnumber = $3`,
        [installmentCount, String(installmentCount), accountNumber]
      )

      if (installments.length > 0) {
        // Mark specific selected installments as paid with their penalties
        for (const inst of installments) {
          await client.query(
            `UPDATE rd_installment_details
             SET installment_paid_date = $1,
                 installment_voucher_no = $2,
                 penalty_collected = $3,
                 updated_at = NOW()
             WHERE id = $4 AND accountnumber = $5 AND branch_id = $6`,
            [businessDate, voucherNo, inst.penalty, inst.id, accountNumber, branchId]
          )
        }
      } else {
        // Fallback: mark the next unpaid installment as paid
        const { rows: unpaidRows } = await client.query(
          `SELECT id, installment_number FROM rd_installment_details
           WHERE accountnumber = $1 AND branch_id = $2 AND installment_paid_date IS NULL
           ORDER BY installment_number ASC
           LIMIT 1
           FOR UPDATE`,
          [accountNumber, branchId]
        )

        if (unpaidRows.length > 0) {
          await client.query(
            `UPDATE rd_installment_details
             SET installment_paid_date = $1,
                 installment_voucher_no = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [businessDate, voucherNo, unpaidRows[0].id]
          )
        }
      }
    }

    await client.query("COMMIT")

    const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
    const modeText = isDefaultTransfer
      ? ` Debited from Savings A/c: ${savingsSources.map((s) => s.accountNumber).join(", ")}.`
      : isTransfer
        ? ` Bank Transfer batch is open — post the contra (debit) entry for ${fmt.format(amt)}.`
        : ""

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      batch_id: batchId,
      voucher_type: voucherType,
      batch_open: isTransfer, // Bank Transfer batch still needs its contra entry
      savings_account_nos: isDefaultTransfer ? savingsSources.map((s) => s.accountNumber) : [],
      newBalance,
      message: `Credit of ${fmt.format(amt)} successful. Batch: ${batchId}, Voucher: ${voucherNo}.${modeText} New balance: ${fmt.format(newBalance)}`,
    })
  } catch (err: any) {
    await client.query("ROLLBACK")
    console.error("Failed to process deposit transaction:", err)
    return NextResponse.json({ error: err.message || "Transaction failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
