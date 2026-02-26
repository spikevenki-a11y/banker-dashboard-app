import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

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

    // Determine if premature
    const maturityDate = account.td_maturity_date || account.rd_maturity_date || null
    const isPremature = maturityDate ? new Date(maturityDate) > new Date() : false
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
        interestdueforpayment : account.interestdueforpayment
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

export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const businessDate = session.businessDate

    const body = await request.json()
    const { accountNumber, payoutAmount, penaltyAmount, narration, voucherType, creditAccounts } = body

    if (!accountNumber || payoutAmount == null) {
      return NextResponse.json({ error: "Account number and payout amount are required" }, { status: 400 })
    }

    if (!voucherType || !["CASH", "TRANSFER"].includes(voucherType)) {
      return NextResponse.json({ error: "Valid voucher type (CASH/TRANSFER) is required" }, { status: 400 })
    }

    const payout = parseFloat(payoutAmount)
    if (isNaN(payout) || payout < 0) {
      return NextResponse.json({ error: "Payout amount must be non-negative" }, { status: 400 })
    }

    await client.query("BEGIN")

    // Get account info with lock
    const { rows: accounts } = await client.query(
      `SELECT da.*, ds.deposit_gl_account, ds.scheme_name,
              ds.interest_expense_gl_account, ds.interest_payable_gl_account
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
    const depositGlAccount = account.deposit_gl_account
    const penalty = parseFloat(penaltyAmount) || 0

    // Get batch ID
    const { rows: [batch] } = await client.query(`
      UPDATE gl_batch_sequences
      SET last_batch_id = last_batch_id + 1
      WHERE branch_id = $1
      RETURNING last_batch_id
    `, [branchId])
    const batchId = batch.last_batch_id

    // Get voucher number
    const { rows: [voucher] } = await client.query(`
      INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
      VALUES ($1, $2, 1)
      ON CONFLICT (branch_id, business_date)
      DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
      RETURNING last_voucher_no
    `, [branchId, businessDate])
    const voucherNo = voucher.last_voucher_no

    // Create GL batch header
    await client.query(`
      INSERT INTO gl_batches (
        business_date, branch_id, batch_id, voucher_id,
        voucher_type, maker_id, status
      ) VALUES ($1,$2,$3,$4,$5,$6,'PENDING')
    `, [businessDate, branchId, batchId, voucherNo, voucherType, session.userId])

    const closureNarration = narration || `Deposit Closure - A/c ${accountNumber}`

    // DR Deposit GL (liability decreases - debit the deposit account)
    await client.query(`
      INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)
    `, [
      branchId, batchId, businessDate,
      depositGlAccount, String(accountNumber),
      currentBalance,
      voucherNo,
      closureNarration,
      session.userId
    ])

    // If there's a penalty, record it
    if (penalty > 0) {
      // CR Penalty (income for the bank)
      await client.query(`
        INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)
      `, [
        branchId, batchId, businessDate,
        depositGlAccount, String(accountNumber),
        penalty,
        voucherNo,
        `Premature closure penalty - A/c ${accountNumber}`,
        session.userId
      ])
    }

    // CR Savings Account(s) or Cash (payout to member)
    if (creditAccounts && Array.isArray(creditAccounts) && creditAccounts.length > 0) {
      for (const credit of creditAccounts) {
        const creditAmt = parseFloat(credit.amount)
        if (isNaN(creditAmt) || creditAmt <= 0) continue

        // Get savings account details
        const { rows: savingsRows } = await client.query(
          `SELECT sa.*, ss.savings_gl_account
           FROM savings_accounts sa
           JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
           WHERE sa.account_number = $1 AND sa.branch_id = $2
           FOR UPDATE`,
          [credit.accountNumber, branchId]
        )

        if (savingsRows.length === 0) {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: `Savings account ${credit.accountNumber} not found` }, { status: 404 })
        }

        const savingsAccount = savingsRows[0]
        const savingsGl = savingsAccount.savings_gl_account
        const newSavingsBalance = parseFloat(savingsAccount.available_balance) + creditAmt

        // CR Savings GL (liability increases)
        await client.query(`
          INSERT INTO gl_batch_lines (
            branch_id, batch_id, business_date,
            accountcode, ref_account_id,
            debit_amount, credit_amount,
            voucher_id, narration, created_by
          ) VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)
        `, [
          branchId, batchId, businessDate,
          savingsGl, String(credit.accountNumber),
          creditAmt,
          voucherNo,
          `Deposit Closure credit from A/c ${accountNumber}`,
          session.userId
        ])

        // Record savings transaction
        await client.query(`
          INSERT INTO savings_transactions (
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
          )
        `, [
          branchId, credit.accountNumber,
          businessDate,
          creditAmt, newSavingsBalance,
          `Deposit Closure credit from A/c ${accountNumber}`,
          voucherNo, batchId,
          session.userId
        ])

        // Update savings balance
        await client.query(
          `UPDATE savings_accounts
           SET available_balance = $1, clear_balance = $1, updated_at = NOW()
           WHERE account_number = $2 AND branch_id = $3`,
          [newSavingsBalance, credit.accountNumber, branchId]
        )
      }
    } else if (voucherType === "CASH") {
      // CR Cash (if cash payout)
      await client.query(`
        INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)
      `, [
        branchId, batchId, businessDate,
        23100000, '0',
        payout,
        voucherNo,
        closureNarration,
        session.userId
      ])
    }

    // Update deposit account: set balance to 0, status to Closed (3), set close date
    // await client.query(
    //   `UPDATE deposit_account
    //    SET clearbalance = 0,
    //        unclearbalance = 0,
    //        accountstatus = 3,
    //        accountclosedate = $1
    //    WHERE accountnumber = $2 AND branch_id = $3`,
    //   [businessDate, accountNumber, branchId]
    // )

    await client.query("COMMIT")

    const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      batch_id: batchId,
      message: `Account ${accountNumber} closed successfully.\nPayout: ${fmt.format(payout)}\nBatch: ${batchId} | Voucher: ${voucherNo}`,
    })
  } catch (err: any) {
    await client.query("ROLLBACK")
    console.error("Failed to process account closure:", err)
    return NextResponse.json({ error: err.message || "Closure failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
