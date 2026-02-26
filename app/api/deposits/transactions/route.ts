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

    // Get transaction history from gl_batch_lines where the deposit GL is referenced
    const depositGl = account.deposit_gl_account
    const { rows: transactions } = await pool.query(
      `SELECT
        gbl.id,
        gbl.business_date AS transaction_date,
        gbl.debit_amount,
        gbl.credit_amount,
        gbl.narration,
        gbl.voucher_id AS voucher_no,
        gbl.batch_id AS gl_batch_id,
        gbl.created_at,
        gb.status AS batch_status,
        gb.voucher_type
      FROM gl_batch_lines gbl
      LEFT JOIN gl_batches gb ON gb.branch_id = gbl.branch_id AND gb.batch_id = gbl.batch_id
      WHERE gbl.ref_account_id = $1
        AND gbl.branch_id = $2
        AND gbl.accountcode = $3
      ORDER BY gbl.business_date DESC, gbl.created_at DESC
      LIMIT $4 OFFSET $5`,
      [String(accountNumber), branchId, depositGl, limit, offset]
    )

    const { rows: countResult } = await pool.query(
      `SELECT COUNT(*) as total
      FROM gl_batch_lines
      WHERE ref_account_id = $1 AND branch_id = $2 AND accountcode = $3`,
      [String(accountNumber), branchId, depositGl]
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
        depositGlAccount: depositGl,
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

export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const businessDate = session.businessDate

    const body = await request.json()
    const { accountNumber, amount, narration, voucherType, selectedBatch, debitAccounts, selectedInstallments } = body

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

    await client.query("BEGIN")

    // Get account info
    const { rows: accounts } = await client.query(
      `SELECT da.*, ds.deposit_gl_account, ds.scheme_name
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
      return NextResponse.json({ error: "Account is not active. Only active accounts can receive deposits." }, { status: 400 })
    }

    const depositGlAccount = account.deposit_gl_account
    const newBalance = parseFloat(account.clearbalance) + amt

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

    const txnNarration = narration || "Deposit Credit"

    // DR Savings Account(s) - Transfer from savings to deposit
    if (debitAccounts && Array.isArray(debitAccounts) && debitAccounts.length > 0) {
      for (const debit of debitAccounts) {
        const debitAmt = parseFloat(debit.amount)
        if (isNaN(debitAmt) || debitAmt <= 0) continue

        // Get savings account details
        const { rows: savingsRows } = await client.query(
          `SELECT sa.*, ss.savings_gl_account
           FROM savings_accounts sa
           JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
           WHERE sa.account_number = $1 AND sa.branch_id = $2
           FOR UPDATE`,
          [debit.accountNumber, branchId]
        )

        if (savingsRows.length === 0) {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: `Savings account ${debit.accountNumber} not found` }, { status: 404 })
        }

        const savingsAccount = savingsRows[0]
        const savingsBalance = parseFloat(savingsAccount.available_balance)

        if (debitAmt > savingsBalance) {
          await client.query("ROLLBACK")
          return NextResponse.json({
            error: `Insufficient balance in savings account ${debit.accountNumber}. Available: ${savingsBalance}, Required: ${debitAmt}`
          }, { status: 400 })
        }

        const savingsGl = savingsAccount.savings_gl_account

        // DR Savings GL (debit from savings - liability decreases)
        await client.query(`
          INSERT INTO gl_batch_lines (
            branch_id, batch_id, business_date,
            accountcode, ref_account_id,
            debit_amount, credit_amount,
            voucher_id, narration, created_by
          ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)
        `, [
          branchId, batchId, businessDate,
          savingsGl, String(debit.accountNumber),
          debitAmt,
          voucherNo,
          `Transfer to Deposit A/c ${accountNumber}`,
          session.userId
        ])

        // Record savings transaction
        const newSavingsBalance = savingsBalance - debitAmt
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
            'WITHDRAWAL','TRANSFER',
            $4,0,$5,
            $6,$7,$8,
            'PENDING',$9
          )
        `, [
          branchId, debit.accountNumber,
          businessDate,
          debitAmt, newSavingsBalance,
          `Transfer to Deposit A/c ${accountNumber}`,
          voucherNo, batchId,
          session.userId
        ])

        // Update savings account balance
        await client.query(
          `UPDATE savings_accounts
           SET available_balance = $1, clear_balance = $1, updated_at = NOW()
           WHERE account_number = $2 AND branch_id = $3`,
          [newSavingsBalance, debit.accountNumber, branchId]
        )
      }
    } else if (voucherType === "CASH") {
      // DR Cash/Bank (if CASH and no debit accounts)
      await client.query(`
        INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)
      `, [
        branchId, batchId, businessDate,
        23100000, '0',
        amt,
        voucherNo,
        txnNarration,
        session.userId
      ])
    }

    // CR Deposit GL (Liability increases)
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
      amt,
      voucherNo,
      txnNarration,
      session.userId
    ])

    // Update deposit account balance
    // await client.query(
    //   `UPDATE deposit_account
    //    SET clearbalance = $1
    //    WHERE accountnumber = $2 AND branch_id = $3`,
    //   [newBalance, accountNumber, branchId]
    // )

    // If RD, update paid installments count and mark selected installments as paid
    if (account.deposittype === "R" || account.deposittype === "RECURING" || account.deposittype === "RECURRING") {
      const installmentCount = selectedInstallments && selectedInstallments.length > 0
        ? selectedInstallments.length
        : 1

      await client.query(
        `UPDATE recurring_deposit_details
         SET numberofinstalmentspaid = COALESCE(numberofinstalmentspaid, 0) + $1,
             nextinstalmentdate = nextinstalmentdate + ($2 || ' months')::INTERVAL
         WHERE accountnumber = $3`,
        [installmentCount, String(installmentCount), accountNumber]
      )

      if (selectedInstallments && selectedInstallments.length > 0) {
        // Mark specific selected installments as paid with their penalties
        for (const inst of selectedInstallments) {
          await client.query(
            `UPDATE rd_installment_details
             SET installment_paid_date = $1,
                 installment_voucher_no = $2,
                 penalty_collected = $3,
                 updated_at = NOW()
             WHERE id = $4 AND branch_id = $5`,
            [businessDate, voucherNo, Number(inst.penalty) || 0, inst.id, branchId]
          )
        }
      } else {
        // Fallback: mark the next unpaid installment as paid
        const { rows: unpaidRows } = await client.query(
          `SELECT id, installment_number FROM rd_installment_details
           WHERE accountnumber = $1 AND branch_id = $2 AND installment_paid_date IS NULL
           ORDER BY installment_number ASC
           LIMIT 1`,
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

    return NextResponse.json({
      success: true,
      voucher_no: voucherNo,
      batch_id: batchId,
      newBalance,
      message: `Credit of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amt)} successful. Batch: ${batchId}, Voucher: ${voucherNo}. New balance: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(newBalance)}`,
    })
  } catch (err: any) {
    await client.query("ROLLBACK")
    console.error("Failed to process deposit transaction:", err)
    return NextResponse.json({ error: err.message || "Transaction failed" }, { status: 500 })
  } finally {
    client.release()
  }
}
