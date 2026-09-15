import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { checkDayEndRestriction } from "@/lib/dayend-check"

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

    // Get deposit account info with member/scheme details
    const { rows: accountRows } = await pool.query(
      `SELECT
        da.id, da.accountnumber, da.deposittype, da.membership_no,
        da.accountopendate, da.rateofinterest, da.clearbalance, da.unclearbalance,
        da.accountstatus, da.schemeid,
        da.interestpaidamount, da.interestdueforpayment,
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

    // Get interest payment history from deposit_transactions
    const { rows: transactions } = await pool.query(
      `SELECT
        dt.id,
        dt.accountnumber,
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
      WHERE dt.accountnumber = $1 AND dt.branch_id = $2 AND dt.transaction_type = 'INTEREST_PAYOUT'
      ORDER BY dt.transaction_date DESC, dt.created_at DESC
      LIMIT $3 OFFSET $4`,
      [account.accountnumber, branchId, limit, offset]
    )

    const { rows: countResult } = await pool.query(
      `SELECT COUNT(*) as total FROM deposit_transactions
       WHERE accountnumber = $1 AND branch_id = $2 AND transaction_type = 'INTEREST_PAYOUT'`,
      [account.accountnumber, branchId]
    )

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
        interestPayableGlAccount: account.interest_payable_gl_account,
        interestDue: Number(account.interestdueforpayment) || 0,
        interestPaid: Number(account.interestpaidamount) || 0,
        // Type-specific
        depositAmount: account.depositamount,
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
        dailyAmount: account.minimum_daily_amount ? Number(account.minimum_daily_amount) : null,
        collectionFrequency: account.collection_frequency,
      },
      transactions,
      total: parseInt(countResult[0]?.total || "0"),
    })
  } catch (error: any) {
    console.error("Failed to fetch interest payment details:", error)
    return NextResponse.json({ error: "Failed to fetch interest payment details: " + error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const businessDate = session.businessDate

    const body = await request.json()
    const { accountNumber, amount, narration, voucherType, creditAccounts, selectedBatch } = body

    if (!accountNumber || !amount) {
      return NextResponse.json({ error: "Account number and amount are required" }, { status: 400 })
    }

    if (!voucherType || !["CASH", "TRANSFER"].includes(voucherType)) {
      return NextResponse.json({ error: "Valid voucher type (CASH/TRANSFER) is required" }, { status: 400 })
    }

    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 })
    }

    const dayendErr = await checkDayEndRestriction(branchId, businessDate)
    if (dayendErr) return dayendErr

    await client.query("BEGIN")

    // Get account info with lock
    const { rows: accounts } = await client.query(
      `SELECT da.*, ds.interest_payable_gl_account, ds.scheme_name
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

    if (account.accountstatus !== 1) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Account is not active. Interest can only be paid on active accounts." }, { status: 400 })
    }

    const interestDue = parseFloat(account.interestdueforpayment) || 0
    if (amt - interestDue > 0.01) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: `Payment amount cannot exceed interest due (${interestDue}).` }, { status: 400 })
    }
    if (interestDue <= 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "No interest is due for payment on this account." }, { status: 400 })
    }

    const interestPayableGlAccount = account.interest_payable_gl_account

    // Get or create batch ID
    let batchId = 0
    if (selectedBatch && selectedBatch !== 0) {
      batchId = selectedBatch
    } else {
      const { rows: [batch] } = await client.query(`
        UPDATE gl_batch_sequences
        SET last_batch_id = last_batch_id + 1
        WHERE branch_id = $1
        RETURNING last_batch_id
      `, [branchId])
      batchId = batch.last_batch_id
    }

    // Get voucher number
    let voucherNo = 0
    if (!selectedBatch || selectedBatch === 0) {
      const { rows: [voucher] } = await client.query(`
        INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
        VALUES ($1, $2, 1)
        ON CONFLICT (branch_id, business_date)
        DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
        RETURNING last_voucher_no
      `, [branchId, businessDate])
      voucherNo = voucher.last_voucher_no
    } else {
      const { rows: [lvo] } = await client.query(`
        SELECT voucher_id FROM gl_batches
        WHERE branch_id = $1 AND batch_id = $2
      `, [branchId, batchId])
      voucherNo = lvo?.voucher_id || 0
    }

    // Create GL batch header
    if (!selectedBatch || selectedBatch === 0) {
      await client.query(`
        INSERT INTO gl_batches (
          business_date, branch_id, batch_id, voucher_id,
          voucher_type, maker_id, status
        ) VALUES ($1,$2,$3,$4,$5,$6,'PENDING')
      `, [businessDate, branchId, batchId, voucherNo, voucherType, session.userId])
    }

    const txnNarration = narration || `Interest Payment - A/c ${accountNumber}`

    // DR Interest Payable GL (liability decreases - interest due is now being paid)
    await client.query(`
      INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)
    `, [
      branchId, batchId, businessDate,
      interestPayableGlAccount, String(accountNumber),
      amt,
      voucherNo,
      txnNarration,
      session.userId
    ])

    // CR Savings Account(s) or Cash (interest payout to member)
    if (creditAccounts && Array.isArray(creditAccounts) && creditAccounts.length > 0) {
      for (const credit of creditAccounts) {
        const creditAmt = parseFloat(credit.amount)
        if (isNaN(creditAmt) || creditAmt <= 0) continue

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
          `Interest Payment credit from Deposit A/c ${accountNumber}`,
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
          `Interest Payment credit from Deposit A/c ${accountNumber}`,
          voucherNo, batchId,
          session.userId
        ])

        // Update savings account balance
        await client.query(
          `UPDATE savings_accounts
           SET available_balance = $1, clear_balance = $1, updated_at = NOW()
           WHERE account_number = $2 AND branch_id = $3`,
          [newSavingsBalance, credit.accountNumber, branchId]
        )
      }
    } else if (voucherType === "CASH") {
      // CR Cash (interest paid out in cash)
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
        amt,
        voucherNo,
        txnNarration,
        session.userId
      ])
    }

    // Reduce interest due and accumulate interest paid on the deposit account
    const newInterestDue = interestDue - amt
    const newInterestPaid = (parseFloat(account.interestpaidamount) || 0) + amt
    await client.query(
      `UPDATE deposit_account
       SET interestdueforpayment = $1,
           interestpaidamount = $2
       WHERE accountnumber = $3 AND branch_id = $4`,
      [newInterestDue, newInterestPaid, accountNumber, branchId]
    )

    // Record interest payment in module transaction table
    await client.query(
      `INSERT INTO deposit_transactions (
         branch_id, accountnumber,
         transaction_date, value_date,
         transaction_type, voucher_type,
         debit_amount, credit_amount, running_balance,
         narration, voucher_no, gl_batch_id,
         status, created_by
       ) VALUES ($1,$2,$3,$3,'INTEREST_PAYOUT',$4,$5,0,$6,$7,$8,$9,'PENDING',$10)`,
      [
        branchId, accountNumber,
        businessDate,
        voucherType,
        amt, parseFloat(account.clearbalance),
        txnNarration, voucherNo, batchId,
        session.userId,
      ]
    )

    await client.query("COMMIT")

    const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      batch_id: batchId,
      newInterestDue,
      message: `Interest payment of ${fmt.format(amt)} processed successfully. Batch: ${batchId}, Voucher: ${voucherNo}. Remaining interest due: ${fmt.format(newInterestDue)}`,
    })
  } catch (err: any) {
    await client.query("ROLLBACK")
    console.error("Failed to process interest payment:", err)
    return NextResponse.json({ error: err.message || "Interest payment failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
