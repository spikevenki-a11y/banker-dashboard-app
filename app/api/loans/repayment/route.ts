import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { checkDayEndRestriction } from "@/lib/dayend-check"

// GET: Get repayment schedule and details
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const branchId = session.branch
    const { searchParams } = new URL(request.url)
    const loanAccountNo = searchParams.get("loanAccountNo")

    if (!loanAccountNo) {
      return NextResponse.json({ error: "Loan account number is required" }, { status: 400 })
    }

    // Get repayment schedule
    const { rows: schedule } = await pool.query(
      `SELECT * FROM loan_repayment_schedule_details 
       WHERE loan_account_no = $1 
       ORDER BY installment_no ASC`,
      [loanAccountNo]
    )

    // Get loan transactions
    const { rows: transactions } = await pool.query(
      `SELECT * FROM loan_transaction_details 
       WHERE loan_account_no = $1 AND branch_id = $2
       ORDER BY transaction_date DESC, created_at DESC`,
      [loanAccountNo, branchId]
    )

    // Get loan summary
    const { rows: summary } = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE payment_status = 'PAID') as paid_installments,
         COUNT(*) FILTER (WHERE payment_status = 'PENDING') as pending_installments,
         COUNT(*) FILTER (WHERE payment_status = 'OVERDUE') as overdue_installments,
         SUM(CASE WHEN payment_status = 'PAID' THEN principal_amount ELSE 0 END) as total_principal_paid,
         SUM(CASE WHEN payment_status = 'PAID' THEN interest_amount ELSE 0 END) as total_interest_paid,
         SUM(CASE WHEN payment_status = 'PENDING' OR payment_status = 'OVERDUE' THEN balance_principal ELSE 0 END) as outstanding_principal,
         MIN(CASE WHEN payment_status = 'PENDING' THEN due_date END) as next_due_date,
         MIN(CASE WHEN payment_status = 'PENDING' THEN total_installment END) as next_emi_amount
       FROM loan_repayment_schedule_details
       WHERE loan_account_no = $1`,
      [loanAccountNo]
    )

    return NextResponse.json({
      schedule,
      transactions,
      summary: summary[0] || {}
    })
  } catch (error: any) {
    console.error("Failed to fetch repayment details:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Record loan repayment
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const businessDate = session.businessDate
    const body = await request.json()

    const {
      loan_account_no,
      payment_amount,
      payment_mode, // 'CASH' or 'TRANSFER'
      installment_numbers, // Array of installment numbers to pay
      narration,
      principal_amount, // Optional: explicit principal breakup from UI
      interest_amount,  // Optional: explicit interest breakup from UI
    } = body

    if (!loan_account_no || !payment_amount || !payment_mode) {
      return NextResponse.json(
        { error: "Loan account, amount, and payment mode are required" },
        { status: 400 }
      )
    }

    if (!["CASH", "TRANSFER"].includes(payment_mode)) {
      return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 })
    }

    const payAmt = Math.round(parseFloat(payment_amount) * 100) / 100
    if (!Number.isFinite(payAmt) || payAmt <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 })
    }

    // Validate explicit breakup if provided
    if (principal_amount !== undefined && interest_amount !== undefined) {
      const p = parseFloat(principal_amount)
      const i = parseFloat(interest_amount)
      if (!Number.isFinite(p) || !Number.isFinite(i) || p < 0 || i < 0) {
        return NextResponse.json({ error: "Principal and Interest cannot be negative" }, { status: 400 })
      }
      const sum = p + i
      if (Math.abs(sum - payAmt) > 0.01) {
        return NextResponse.json(
          { error: "Principal + Interest must equal total payment amount" },
          { status: 400 }
        )
      }
    }

    const dayendErr = await checkDayEndRestriction(branchId, businessDate)
    if (dayendErr) return dayendErr

    await client.query("BEGIN")

    // Get loan application details
    const { rows: loans } = await client.query(
      `SELECT la.*, ls.loan_gl_account, ls.interest_income_gl_account
       FROM loan_applications la
       JOIN loan_schemes ls ON la.scheme_id = ls.scheme_id
       WHERE la.reference_no = SUBSTRING($1 FROM 1 FOR 2) || SUBSTRING($1 FROM 3 FOR 8)
         OR EXISTS (
           SELECT 1 FROM loan_transaction_details ltd 
           WHERE ltd.loan_account_no = $1 AND ltd.branch_id = $2
         )`,
      [loan_account_no, branchId]
    )

    // Get scheme details via transaction
    const { rows: loanInfo } = await client.query(
      `SELECT DISTINCT la.loan_application_id,ls.loan_gl_account, ls.interest_income_gl_account
       FROM loan_transaction_details ltd
       JOIN loan_applications la ON ltd.reference_no = la.reference_no
       JOIN loan_schemes ls ON la.scheme_id = ls.scheme_id
       WHERE ltd.loan_account_no = $1 AND ltd.branch_id = $2
       LIMIT 1`,
      [loan_account_no, branchId]
    )

    if (loanInfo.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Loan account not found" }, { status: 404 })
    }

    const loanGL = loanInfo[0].loan_gl_account
    const interestGL = loanInfo[0].interest_income_gl_account
    const loanApplicationId = loanInfo[0].loan_application_id

    // Lock the loan so concurrent collections on the same account are serialised
    const { rows: [loanRow] } = await client.query(
      `SELECT application_status FROM loan_applications
       WHERE loan_application_id = $1 AND branch_id = $2
       FOR UPDATE`,
      [loanApplicationId, branchId]
    )
    if (!loanRow) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Loan account not found" }, { status: 404 })
    }
    if (!["ACTIVE", "OVERDUE"].includes(String(loanRow.application_status).toUpperCase())) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: `Collection is not allowed on a ${String(loanRow.application_status).toLowerCase()} loan` },
        { status: 400 }
      )
    }

    // Get pending installments
    let installmentsToProcess = []
    if (installment_numbers && installment_numbers.length > 0) {
      const { rows } = await client.query(
        `SELECT * FROM loan_repayment_schedule_details
         WHERE loan_account_no = $1 AND installment_no = ANY($2) AND payment_status IN ('PENDING', 'OVERDUE')
         ORDER BY installment_no ASC
         FOR UPDATE`,
        [loan_account_no, installment_numbers]
      )
      installmentsToProcess = rows
    } else {
      // Auto-select pending installments
      const { rows } = await client.query(
        `SELECT * FROM loan_repayment_schedule_details
         WHERE loan_account_no = $1 AND payment_status IN ('PENDING', 'OVERDUE')
         ORDER BY installment_no ASC
         FOR UPDATE`,
        [loan_account_no]
      )
      installmentsToProcess = rows
    }

    if (installmentsToProcess.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "No pending installments found" }, { status: 400 })
    }

    // The payment cannot exceed the dues it is allocated against, otherwise the cash
    // debit would be larger than the principal + interest credits
    const totalDue = installmentsToProcess.reduce((s: number, r: any) => s + (parseFloat(r.total_installment) || 0), 0)
    if (payAmt > totalDue + 0.01) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: `Payment amount exceeds the pending dues (₹${totalDue.toFixed(2)})` },
        { status: 400 }
      )
    }

    // Create batch for GL entries
    const { rows: [batch] } = await client.query(`
      UPDATE gl_batch_sequences
      SET last_batch_id = last_batch_id + 1
      WHERE branch_id = $1
      RETURNING last_batch_id
    `, [branchId])
    const batchId = batch.last_batch_id

    // Generate voucher number
    const { rows: [voucher] } = await client.query(`
      INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
      VALUES ($1, $2, 1)
      ON CONFLICT (branch_id, business_date)
      DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
      RETURNING last_voucher_no
    `, [branchId, businessDate])
    const voucherNo = voucher.last_voucher_no

    // Create GL batch
    await client.query(`
      INSERT INTO gl_batches (
        business_date, branch_id, batch_id, voucher_id,
        voucher_type, maker_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
    `, [businessDate, branchId, batchId, voucherNo, payment_mode, session.userId])

    // Process payment across installments
    let remainingAmount = payAmt
    let totalPrincipalPaid = 0
    let totalInterestPaid = 0
    const paidInstallments = []

    for (const inst of installmentsToProcess) {
      if (remainingAmount <= 0) break

      const installmentAmount = parseFloat(inst.total_installment)
      const principalAmount = parseFloat(inst.principal_amount)
      const interestAmount = parseFloat(inst.interest_amount)

      if (remainingAmount >= installmentAmount) {
        // Full payment of this installment
        totalPrincipalPaid += principalAmount
        totalInterestPaid += interestAmount
        remainingAmount -= installmentAmount

        await client.query(
          `UPDATE loan_repayment_schedule_details 
           SET payment_status = 'PAID'
           WHERE loan_account_no = $1 AND installment_no = $2`,
          [loan_account_no, inst.installment_no]
        )
        paidInstallments.push(inst.installment_no)
      } else {
        // Partial payment - allocate to interest first, then principal
        const interestPortion = Math.min(remainingAmount, interestAmount)
        const principalPortion = remainingAmount - interestPortion
        totalInterestPaid += interestPortion
        totalPrincipalPaid += principalPortion
        remainingAmount = 0
        // Keep as pending (partial payment)
      }
    }

    // Use UI-provided breakup if supplied and valid, otherwise use schedule-derived totals
    const finalPrincipalPaid = Math.round(
      (principal_amount !== undefined ? parseFloat(principal_amount) : totalPrincipalPaid) * 100
    ) / 100
    const finalInterestPaid = Math.round(
      (interest_amount !== undefined ? parseFloat(interest_amount) : totalInterestPaid) * 100
    ) / 100

    // Ledger consistency: DR Cash/Bank must equal CR Principal + CR Interest
    if (Math.abs(finalPrincipalPaid + finalInterestPaid - payAmt) > 0.01) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: "Principal + Interest must equal total payment amount" },
        { status: 400 }
      )
    }

    // GL Entries
    // Debit Cash/Bank (Asset increases)
    const cashGlAccount = payment_mode === 'CASH' ? '23100000' : '11100000'
    await client.query(`
      INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
    `, [
      branchId, batchId, businessDate,
      cashGlAccount, '0',
      payAmt,
      voucherNo,
      narration || "Loan Repayment",
      session.userId
    ])

    // Credit Loan GL (principal - Asset decreases)
    if (finalPrincipalPaid > 0) {
      await client.query(`
        INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)
      `, [
        branchId, batchId, businessDate,
        loanGL, loan_account_no,
        finalPrincipalPaid,
        voucherNo,
        "Principal Repayment",
        session.userId
      ])
    }

    // Credit Interest Income GL
    if (finalInterestPaid > 0) {
      await client.query(`
        INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)
      `, [
        branchId, batchId, businessDate,
        interestGL, loan_account_no,
        finalInterestPaid,
        voucherNo,
        "Interest Receipt",
        session.userId
      ])
    }

    // Get current balance (tracks remaining principal only)
    const { rows: balanceRows } = await client.query(
      `SELECT COALESCE(balance_after_transaction, 0) as balance
       FROM loan_transaction_details
       WHERE loan_account_no = $1
       ORDER BY created_at DESC LIMIT 1`,
      [loan_account_no]
    )
    const currentBalance = parseFloat(balanceRows[0]?.balance || '0')
    if (finalPrincipalPaid > currentBalance + 0.01) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        { error: `Principal (₹${finalPrincipalPaid.toFixed(2)}) exceeds the outstanding balance (₹${currentBalance.toFixed(2)})` },
        { status: 400 }
      )
    }
    const newBalance = Math.round((currentBalance - finalPrincipalPaid) * 100) / 100

    // Insert loan transaction with split principal and interest
    await client.query(`
      INSERT INTO loan_transaction_details (
        transaction_date, branch_id, voucher_no, loan_account_no,
        transaction_type, debit_amount, credit_principal_amount, credit_interest_amount,
        balance_after_transaction, remarks, created_at
      ) VALUES ($1, $2, $3, $4, 'REPAYMENT', 0, $5, $6, $7, $8, NOW())
    `, [
      businessDate, branchId, voucherNo, loan_account_no,
      finalPrincipalPaid, finalInterestPaid,
      newBalance, narration || `Repayment - EMI ${paidInstallments.join(',')}`
    ])

    // Update loan outstanding balance (principal only — interest is income, not principal reduction)
    await client.query(`
      UPDATE loan_applications
      SET loan_outstanding = loan_outstanding - $1, updated_at = NOW()
      WHERE loan_application_id = $2
    `, [finalPrincipalPaid, loanApplicationId])

    // Check if loan is fully paid
    const { rows: pendingCheck } = await client.query(
      `SELECT COUNT(*) as pending FROM loan_repayment_schedule_details 
       WHERE loan_account_no = $1 AND payment_status IN ('PENDING', 'OVERDUE')`,
      [loan_account_no]
    )

    if (parseInt(pendingCheck[0].pending) === 0) {
      // Update loan application to CLOSED
      await client.query(
        `UPDATE loan_applications 
         SET application_status = 'CLOSED', updated_at = NOW()
         WHERE reference_no = (
           SELECT DISTINCT reference_no FROM loan_transaction_details WHERE loan_account_no = $1
         )`,
        [loan_account_no]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Repayment recorded successfully",
      voucher_no: voucherNo,
      batch_id: batchId,
      principal_paid: finalPrincipalPaid,
      interest_paid: finalInterestPaid,
      installments_paid: paidInstallments,
      outstanding_balance: newBalance,
      loan_status: parseInt(pendingCheck[0].pending) === 0 ? 'CLOSED' : 'ACTIVE'
    })

  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Failed to record repayment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
