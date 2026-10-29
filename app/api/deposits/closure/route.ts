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
    const businessDate = session.businessDate

    const { searchParams } = new URL(request.url)
    const accountNumber = searchParams.get("account")

    if (!accountNumber) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }

    // Get deposit account info with member/scheme details
    const { rows: accountRows } = await pool.query(
      `SELECT
        da.id, da.accountnumber, da.deposittype, da.membership_no,
        da.accountopendate, da.rateofinterest, da.clearbalance, da.unclearbalance,
        da.accountstatus, da.schemeid, da.interestpaidamount, da.interestdueforpayment,
        ds.scheme_name, ds.deposit_gl_account, ds.interest_expense_gl_account,
        ds.interest_payable_gl_account, ds.premature_closure_allowed, ds.premature_penal_rate,
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

    // Calculate interest earned
    const depositAmount = Number(account.depositamount) || Number(account.clearbalance) || 0
    const maturityAmount = Number(account.td_maturity_amount) || Number(account.rd_maturity_amount) || 0
    const interestEarned = maturityAmount > 0 ? maturityAmount - depositAmount : 0
    const interestPaid = Number(account.interestpaidamount) || 0

    // Determine if premature, relative to the bank's current business date (not the server clock)
    const maturityDate = account.td_maturity_date || account.rd_maturity_date || null
    const isPremature = maturityDate ? new Date(maturityDate) > new Date(businessDate) : false
    const prematurePenalRate = Number(account.premature_penal_rate) || 0

    // For premature closure, calculate penalty on interest
    let penaltyAmount = 0
    if (isPremature && prematurePenalRate > 0) {
      penaltyAmount = Math.round((interestEarned * prematurePenalRate / 100) * 100) / 100
    }

    const currentBalance = Number(account.clearbalance)
    const payoutAmount = isPremature
      ? currentBalance - penaltyAmount
      : currentBalance

    // Interest actually paid out, from the interest payout transactions
    const { rows: [payoutTotals] } = await pool.query(
      `SELECT COALESCE(SUM(debit_amount), 0) AS total_paid, COUNT(*) AS payout_count
       FROM deposit_transactions
       WHERE accountnumber = $1 AND branch_id = $2
         AND transaction_type = 'INTEREST_PAYOUT'
         AND COALESCE(status, '') <> 'REVERSED'`,
      [account.accountnumber, branchId]
    )

    // Fetch savings accounts for credit
    const { rows: savingsRows } = await pool.query(
      `SELECT sa.account_number, sa.available_balance, sa.clear_balance, sa.account_status, sa.scheme_id,
              ss.scheme_name
       FROM savings_accounts sa
       JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
       WHERE sa.membership_no = $1 AND sa.branch_id = $2 AND UPPER(sa.account_status) = 'ACTIVE'
       ORDER BY sa.account_number`,
      [account.membership_no, branchId]
    )
    const statusMap: Record<number, string> = {
        1: "active",
        6: "matured",
        9: "closed",
        10: "premature",
      }

    return NextResponse.json({
      account: {
        accountNumber: String(account.accountnumber),
        depositType: account.deposittype,
        membershipNo: String(account.membership_no),
        memberName: account.member_name || "N/A",
        openDate: account.accountopendate,
        interestRate: Number(account.rateofinterest),
        balance: currentBalance,
        unclearBalance: Number(account.unclearbalance),
        accountStatus: account.accountstatus,
        status: statusMap[account.accountstatus] || "active",
        schemeId: account.schemeid,
        schemeName: account.scheme_name || "N/A",
        depositGlAccount: account.deposit_gl_account,
        interestExpenseGlAccount: account.interest_expense_gl_account,
        interestPayableGlAccount: account.interest_payable_gl_account,
        depositAmount: depositAmount,
        periodMonths: account.periodmonths,
        periodDays: account.perioddays,
        maturityDate: maturityDate,
        maturityAmount: maturityAmount,
        installmentAmount: account.installment_amount ? Number(account.installment_amount) : null,
        installmentFrequency: account.installment_frequency,
        totalInstallments: account.numberofinstallments,
        paidInstallments: account.numberofinstalmentspaid,
        interestEarned,
        interestPaid,
        isPremature,
        prematurePenalRate,
        penaltyAmount,
        payoutAmount,
        prematureClosureAllowed: account.premature_closure_allowed,
        interestdueforpayment : account.interestdueforpayment,
        interestPaidFromTransactions: Number(payoutTotals?.total_paid) || 0,
        interestPayoutCount: parseInt(payoutTotals?.payout_count || "0"),
      },
      savingsAccounts: savingsRows.map((s: any) => ({
        accountNumber: s.account_number,
        availableBalance: Number(s.available_balance),
        clearBalance: Number(s.clear_balance),
        schemeName: s.scheme_name,
      })),
    })
  } catch (error: any) {
    console.error("Failed to fetch closure details:", error)
    return NextResponse.json({ error: "Failed to fetch closure details: " + error.message }, { status: 500 })
  }
}

// Voucher types follow the Loans → Loan Disbursement transfer logic:
// CASH             — DR Deposit (+ DR Interest due, CR Penalty), CR Cash; balanced voucher.
// TRANSFER         — Bank Transfer. Same debit side, no contra line. Posted into a selected
//                    open transfer batch (or a new one); the batch stays open until the
//                    contra entry for the net payout is posted.
// DEFAULT_TRANSFER — Same debit side, CR the member's savings account(s); balanced voucher.
//                    Savings balances are updated when the voucher is verified.
const CLOSURE_VOUCHER_TYPES = ["CASH", "TRANSFER", "DEFAULT_TRANSFER"]
const CASH_GL_ACCOUNT = "23100000"

const round2 = (n: number) => Math.round(n * 100) / 100

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const businessDate = session.businessDate

    const body = await request.json()
    const { accountNumber, payoutAmount, penaltyAmount, narration, voucherType, creditAccounts, selectedBatch } = body

    if (!accountNumber || payoutAmount == null) {
      return NextResponse.json({ error: "Account number and payout amount are required" }, { status: 400 })
    }

    if (!voucherType || !CLOSURE_VOUCHER_TYPES.includes(voucherType)) {
      return NextResponse.json(
        { error: "Valid voucher type (Cash / Bank Transfer / Default Transfer) is required" },
        { status: 400 }
      )
    }

    const payout = parseFloat(payoutAmount)
    if (isNaN(payout) || payout < 0) {
      return NextResponse.json({ error: "Payout amount must be non-negative" }, { status: 400 })
    }

    const penalty = parseFloat(penaltyAmount) || 0
    if (penalty < 0) {
      return NextResponse.json({ error: "Penalty amount cannot be negative" }, { status: 400 })
    }

    const isTransfer = voucherType === "TRANSFER"
    const isDefaultTransfer = voucherType === "DEFAULT_TRANSFER"
    const glVoucherType: GlVoucherType = voucherType === "CASH" ? "CASH" : "TRANSFER"

    // An existing GL batch can only be reused for Bank Transfer (0/empty = new batch)
    if (isTransfer && selectedBatch && !(Number.isInteger(Number(selectedBatch)) && Number(selectedBatch) >= 0)) {
      return NextResponse.json({ error: "Invalid GL batch" }, { status: 400 })
    }
    const existingBatchId = isTransfer && Number(selectedBatch) > 0 ? Number(selectedBatch) : 0

    // Default Transfer: one or more of the member's savings accounts, each credited once
    const credits: { accountNumber: string; amount: number }[] = []
    if (isDefaultTransfer) {
      for (const c of Array.isArray(creditAccounts) ? creditAccounts : []) {
        const amt = round2(parseFloat(c?.amount))
        if (!c?.accountNumber || isNaN(amt) || amt <= 0) continue
        if (credits.some((x) => x.accountNumber === String(c.accountNumber))) {
          return NextResponse.json({ error: `Savings account ${c.accountNumber} is listed more than once` }, { status: 400 })
        }
        credits.push({ accountNumber: String(c.accountNumber), amount: amt })
      }
      if (credits.length === 0) {
        return NextResponse.json({ error: "Savings account is required for Default Transfer" }, { status: 400 })
      }
    }

    const dayendErr = await checkDayEndRestriction(branchId, businessDate)
    if (dayendErr) return dayendErr

    await client.query("BEGIN")

    // Get account info with lock
    const { rows: accounts } = await client.query(
      `SELECT da.*, ds.deposit_gl_account, ds.scheme_name,
              ds.interest_expense_gl_account, ds.interest_payable_gl_account,
              da.interestdueforpayment
       FROM deposit_account da
       JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
       WHERE da.accountnumber = $1 AND da.branch_id = $2
       FOR UPDATE`,
      [accountNumber, branchId]
    )

    if (accounts.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Deposit account not found" }, { status: 404 })
    }

    const account = accounts[0]

    // Account must be active (1) or matured (2)
    if (account.accountstatus !== 1 && account.accountstatus !== 2) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account is already closed. Only active or matured accounts can be closed." }, { status: 400 })
    }

    const currentBalance = parseFloat(account.clearbalance)
    const interestDue = parseFloat(account.interestdueforpayment) || 0
    const depositGlAccount = account.deposit_gl_account
    const interest_expense_gl_account = account.interest_expense_gl_account

    // Ledger consistency: DR (balance + interest due) must equal CR (penalty + payout)
    const expectedPayout = round2(currentBalance + interestDue - penalty)
    if (Math.abs(payout - expectedPayout) > 0.01) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: `Payout amount does not match the account balance (expected ${expectedPayout.toFixed(2)}). Reload the account and try again.` },
        { status: 400 }
      )
    }

    // Default Transfer: lock and validate the member's destination savings account(s)
    const savingsTargets: { accountNumber: string; amount: number; glAccount: string; newBalance: number }[] = []
    if (isDefaultTransfer) {
      const totalCredit = round2(credits.reduce((s, c) => s + c.amount, 0))
      if (Math.abs(totalCredit - payout) > 0.01) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: `Total credit (${totalCredit.toFixed(2)}) must equal payout amount (${payout.toFixed(2)})` },
          { status: 400 }
        )
      }

      for (const credit of credits) {
        const { rows: savingsRows } = await client.query(
          `SELECT sa.*, ss.savings_gl_account
           FROM savings_accounts sa
           JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
           WHERE sa.account_number = $1 AND sa.branch_id = $2
             AND CAST(sa.membership_no AS VARCHAR) = $3
           FOR UPDATE`,
          [credit.accountNumber, branchId, String(account.membership_no)]
        )

        if (savingsRows.length === 0) {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: `Savings account ${credit.accountNumber} not found for this member` }, { status: 404 })
        }

        const savingsAccount = savingsRows[0]

        if (String(savingsAccount.account_status).toUpperCase() !== "ACTIVE") {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: `Savings account ${credit.accountNumber} is not active` }, { status: 400 })
        }

        if (!savingsAccount.savings_gl_account) {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: "Savings GL account is not configured for the savings scheme" }, { status: 400 })
        }

        savingsTargets.push({
          accountNumber: credit.accountNumber,
          amount: credit.amount,
          glAccount: savingsAccount.savings_gl_account,
          newBalance: round2(parseFloat(savingsAccount.available_balance) + credit.amount),
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

    const closureNarration = narration || `Deposit Closure - A/c ${accountNumber}`
    const line = { branchId, batchId, businessDate, voucherNo, userId: session.userId }

    // DR Deposit GL (liability decreases) — all voucher types
    await insertGlLine(client, {
      ...line,
      accountCode: depositGlAccount, refAccountId: String(accountNumber),
      debit: currentBalance,
      narration: closureNarration,
    })

    // DR Interest Expense for interest due on closure
    if (interestDue > 0) {
      await insertGlLine(client, {
        ...line,
        accountCode: interest_expense_gl_account, refAccountId: String(accountNumber),
        debit: interestDue,
        narration: `Interest due for closure - A/c ${accountNumber}`,
      })
    }

    // CR Penalty (premature closure)
    if (penalty > 0) {
      await insertGlLine(client, {
        ...line,
        accountCode: interest_expense_gl_account, refAccountId: String(accountNumber),
        credit: penalty,
        narration: `Premature closure penalty - A/c ${accountNumber}`,
      })
    }

    if (isDefaultTransfer) {
      // CR Savings GL (liability increases) — credit member's savings account(s)
      const savingsNarration = `Deposit Closure credit from A/c ${accountNumber}`
      for (const target of savingsTargets) {
        await insertGlLine(client, {
          ...line,
          accountCode: target.glAccount, refAccountId: target.accountNumber,
          credit: target.amount,
          narration: savingsNarration,
        })

        // Pending savings credit. The account balance is set from running_balance when the
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
             'DEPOSIT','TRANSFER',
             0,$4,$5,
             $6,$7,$8,
             'PENDING',$9
           )`,
          [
            branchId, target.accountNumber,
            businessDate,
            target.amount, target.newBalance,
            savingsNarration,
            voucherNo, batchId,
            session.userId,
          ]
        )
      }
    } else if (!isTransfer && payout > 0) {
      // CASH: CR Cash (asset decreases)
      await insertGlLine(client, {
        ...line,
        accountCode: CASH_GL_ACCOUNT, refAccountId: "0",
        credit: payout,
        narration: closureNarration,
      })
    }
    // TRANSFER: no contra line here — the batch stays open for the credit side to be posted

    // Record closure in module transaction table. The deposit account is zeroed and
    // marked Closed when the voucher is verified.
    await client.query(
      `INSERT INTO deposit_transactions (
         branch_id, accountnumber,
         transaction_date, value_date,
         transaction_type, voucher_type,
         debit_amount, credit_amount, running_balance,
         narration, voucher_no, gl_batch_id,
         status, created_by
       ) VALUES ($1,$2,$3,$3,'CLOSURE',$4,$5,0,0,$6,$7,$8,'PENDING',$9)`,
      [
        branchId, String(accountNumber),
        businessDate,
        glVoucherType,
        currentBalance,
        closureNarration, voucherNo, batchId,
        session.userId,
      ]
    )

    await client.query("COMMIT")

    const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
    const modeLine = isDefaultTransfer
      ? `Credited to Savings A/c: ${savingsTargets.map((t) => t.accountNumber).join(", ")}`
      : isTransfer
        ? `Bank Transfer batch is open — post the contra entry for ${fmt.format(payout)}`
        : "Paid in Cash"

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      batch_id: batchId,
      voucher_type: voucherType,
      batch_open: isTransfer, // Bank Transfer batch still needs its contra entry
      savings_account_nos: isDefaultTransfer ? savingsTargets.map((t) => t.accountNumber) : [],
      message: `Account ${accountNumber} closed successfully.\nPayout: ${fmt.format(payout)}\n${modeLine}\nBatch: ${batchId} | Voucher: ${voucherNo}`,
    })
  } catch (err: any) {
    await client.query("ROLLBACK")
    console.error("Failed to process account closure:", err)
    return NextResponse.json({ error: err.message || "Closure failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
