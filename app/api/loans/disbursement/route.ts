import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

// POST: Disburse a sanctioned loan
export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const businessDate = session.businessDate
    const body = await request.json()

    const {
      loan_application_id,
      disbursement_amount,
      disbursement_mode, // 'CASH' or 'TRANSFER'
      narration,
    } = body

    if (!loan_application_id || !disbursement_amount || !disbursement_mode) {
      return NextResponse.json(
        { error: "Application ID, amount, and disbursement mode are required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Get application and sanction details
    const { rows: apps } = await client.query(
      `SELECT la.*, 
              ls.sanctioned_amount, ls.interest_rate, ls.loan_tenure_months, ls.payment_amount,
              lscheme.loan_gl_account, lscheme.interest_receivable_gl_account,
              m.membership_no as mem_no
       FROM loan_applications la
       JOIN loan_sanction_details ls ON la.loan_application_id = ls.loan_application_id
       JOIN loan_schemes lscheme ON la.scheme_id = lscheme.scheme_id
       JOIN memberships m ON la.membership_no = CAST(m.membership_no AS VARCHAR)
       WHERE la.loan_application_id = $1 AND la.branch_id = $2`,
      [loan_application_id, branchId]
    )

    if (apps.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const app = apps[0]

    if (app.application_status !== 'SANCTIONED') {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Loan must be sanctioned before disbursement" }, { status: 400 })
    }

    if (parseFloat(disbursement_amount) > parseFloat(app.sanctioned_amount)) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Disbursement amount cannot exceed sanctioned amount" }, { status: 400 })
    }

    // Generate loan account number
    // const loanAccountNo = `LN${branchId}${String(app.loan_application_id).padStart(8, '0')}`
    const loanAccountNo = app.loan_application_id

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
    `, [businessDate, branchId, batchId, voucherNo, disbursement_mode, session.userId])

    // GL entries: DR Loan Account, CR Cash/Bank
    // Debit Loan GL (Asset increases)
    await client.query(`
      INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
    `, [
      branchId, batchId, businessDate,
      app.loan_gl_account, loanAccountNo,
      disbursement_amount,
      voucherNo,
      narration || "Loan Disbursement",
      session.userId
    ])

    // Credit Cash/Bank (Asset decreases)
    const cashGlAccount = disbursement_mode === 'CASH' ? '23100000' : '11100000'
    await client.query(`
      INSERT INTO gl_batch_lines (
        branch_id, batch_id, business_date,
        accountcode, ref_account_id,
        debit_amount, credit_amount,
        voucher_id, narration, created_by
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)
    `, [
      branchId, batchId, businessDate,
      cashGlAccount, '0',
      disbursement_amount,
      voucherNo,
      narration || "Loan Disbursement",
      session.userId
    ])

    // Insert loan transaction
    await client.query(`
      INSERT INTO loan_transaction_details (
        transaction_date, branch_id, voucher_no, loan_account_no,
        transaction_type, debit_amount, credit_amount,
        balance_after_transaction, reference_no, remarks, created_at
      ) VALUES ($1, $2, $3, $4, 'DISBURSEMENT', $5, 0, $5, $6, $7, NOW())
    `, [
      businessDate, branchId, voucherNo, loanAccountNo,
      disbursement_amount, app.reference_no, narration || 'Loan Disbursement'
    ])

    // Generate repayment schedule
    const P = parseFloat(app.sanctioned_amount)
    const R = parseFloat(app.interest_rate) / 12 / 100
    const N = parseInt(app.loan_tenure_months)
    const emi = parseFloat(app.payment_amount)

    let balance = P
    const startDate = new Date(businessDate)
    
    for (let i = 1; i <= N; i++) {
      const interestAmt = balance * R
      const principalAmt = emi - interestAmt
      balance = balance - principalAmt
      if (balance < 0) balance = 0

      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      // Generate schedule ID
      const { rows: schedSeq } = await client.query(
        `SELECT COALESCE(MAX(schedule_id), 0) + 1 as next_id FROM loan_repayment_schedule_details`
      )

      await client.query(`
        INSERT INTO loan_repayment_schedule_details (
          schedule_id, loan_account_no, installment_no, due_date,
          principal_amount, interest_amount, total_installment,
          balance_principal, payment_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())
      `, [
        schedSeq[0].next_id, loanAccountNo, i, dueDate.toISOString().split('T')[0],
        Math.round(principalAmt * 100) / 100,
        Math.round(interestAmt * 100) / 100,
        Math.round(emi * 100) / 100,
        Math.round(balance * 100) / 100
      ])
    }

    //update loan application outstanding balance
    await client.query(`
      UPDATE loan_applications 
      SET loan_outstanding = loan_outstanding + $1, updated_at = NOW() 
      WHERE loan_application_id = $2
    `, [disbursement_amount, loan_application_id])

    // Update application status to ACTIVE
    await client.query(
      `UPDATE loan_applications SET application_status = 'ACTIVE', updated_at = NOW() 
       WHERE loan_application_id = $1`,
      [loan_application_id]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Loan disbursed successfully",
      loan_account_no: loanAccountNo,
      voucher_no: voucherNo,
      batch_id: batchId,
      emi_amount: emi,
      total_installments: N
    })

  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Failed to disburse loan:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
