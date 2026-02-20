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
        rd.nextinstalmentdate,
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
        dailyAmount: account.minimum_daily_amount ? Number(account.minimum_daily_amount) : null,
        collectionFrequency: account.collection_frequency,
      },
      transactions,
      total: parseInt(countResult[0]?.total || "0"),
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
    const { accountNumber, amount, narration, voucherType, selectedBatch } = body

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

    // DR Cash/Bank (if CASH)
    if (voucherType === "CASH") {
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
    await client.query(
      `UPDATE deposit_account
       SET clearbalance = $1
       WHERE accountnumber = $2 AND branch_id = $3`,
      [newBalance, accountNumber, branchId]
    )

    // If RD, update paid installments count
    if (account.deposittype === "R") {
      await client.query(
        `UPDATE recurring_deposit_details
         SET numberofinstalmentspaid = COALESCE(numberofinstalmentspaid, 0) + 1
         WHERE accountnumber = $1`,
        [accountNumber]
      )
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
