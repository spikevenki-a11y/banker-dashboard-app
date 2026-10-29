import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { checkDayEndRestriction } from "@/lib/dayend-check"
import { creditAppraiserAccount, lockAppraiserAccount, type AppraiserAccount } from "@/lib/appraiser-account"

// CASH          — DR Loan, CR Cash; balanced voucher.
// TRANSFER      — DR Loan only, posted into a selected open batch (or a new one). The batch
//                 stays open until the contra entry is posted, same as other transfer vouchers.
// DEFAULT_TRANSFER — DR Loan, CR member's savings account; balanced voucher. The savings
//                 balance is updated when the voucher is verified, like other savings credits.
const DISBURSEMENT_MODES = ['CASH', 'TRANSFER', 'DEFAULT_TRANSFER']
const CASH_GL_ACCOUNT = '23100000'

// GET: Appraiser recorded on the loan's gold security (?loan_application_id=)
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const loanApplicationId = Number(request.nextUrl.searchParams.get("loan_application_id"))
  if (!loanApplicationId) return NextResponse.json({ error: "loan_application_id is required" }, { status: 400 })

  try {
    const { rows } = await pool.query(
      `SELECT am.appraiser_id
       FROM loan_securities ls
       JOIN security_gold_details g ON g.security_id = ls.id
       JOIN appraiser_master am ON am.branch_id = ls.branch_id
                               AND am.appraiser_name = g.appraiser_name
                               AND COALESCE(am.license_no, '') = COALESCE(g.appraiser_license_no, '')
       WHERE ls.loan_application_id = $1 AND ls.branch_id = $2
       ORDER BY ls.is_primary_security DESC, ls.id
       LIMIT 1`,
      [loanApplicationId, session.branch]
    )

    return NextResponse.json({ success: true, appraiser_id: rows[0]?.appraiser_id ?? null })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch loan appraiser: " + error.message }, { status: 500 })
  }
}

// POST: Disburse a sanctioned loan
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const businessDate = session.businessDate
    const body = await request.json()

    const {
      loan_application_id,
      disbursement_amount,
      disbursement_mode, // 'CASH', 'TRANSFER' or 'DEFAULT_TRANSFER'
      narration,
      appraiser_charge,
      savings_account_no, // required for DEFAULT_TRANSFER
      selectedBatch,      // TRANSFER only: open GL batch to post into (0/empty = new batch)
    } = body

    if (!loan_application_id || !disbursement_amount || !disbursement_mode) {
      return NextResponse.json(
        { error: "Application ID, amount, and disbursement mode are required" },
        { status: 400 }
      )
    }

    if (!DISBURSEMENT_MODES.includes(disbursement_mode)) {
      return NextResponse.json({ error: "Invalid disbursement mode" }, { status: 400 })
    }

    const disbursementAmt = Number(disbursement_amount)
    if (!Number.isFinite(disbursementAmt) || disbursementAmt <= 0) {
      return NextResponse.json({ error: "Disbursement amount must be greater than zero" }, { status: 400 })
    }

    const isDefaultTransfer = disbursement_mode === 'DEFAULT_TRANSFER'
    const isTransfer = disbursement_mode === 'TRANSFER'
    const existingBatchId = isTransfer && Number(selectedBatch) > 0 ? Number(selectedBatch) : 0
    if (isTransfer && selectedBatch && !(Number.isInteger(Number(selectedBatch)) && Number(selectedBatch) >= 0)) {
      return NextResponse.json({ error: "Invalid GL batch" }, { status: 400 })
    }
    if (isDefaultTransfer && !savings_account_no) {
      return NextResponse.json(
        { error: "Savings account is required for Default Transfer" },
        { status: 400 }
      )
    }

    const dayendErr = await checkDayEndRestriction(branchId, businessDate)
    if (dayendErr) return dayendErr

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

    if (disbursementAmt > parseFloat(app.sanctioned_amount)) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Disbursement amount cannot exceed sanctioned amount" }, { status: 400 })
    }

    // Default Transfer: lock and validate the member's destination savings account
    let savingsAccount: any = null
    if (isDefaultTransfer) {
      const { rows: savingsRows } = await client.query(
        `SELECT sa.*, ss.savings_gl_account
         FROM savings_accounts sa
         JOIN savings_schemes ss ON ss.scheme_id = sa.scheme_id AND ss.branch_id = sa.branch_id
         WHERE sa.account_number = $1 AND sa.branch_id = $2
           AND CAST(sa.membership_no AS VARCHAR) = $3
         FOR UPDATE`,
        [savings_account_no, branchId, String(app.membership_no)]
      )

      if (savingsRows.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: `Savings account ${savings_account_no} not found for this member` }, { status: 404 })
      }

      savingsAccount = savingsRows[0]

      if (String(savingsAccount.account_status).toUpperCase() !== 'ACTIVE') {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: `Savings account ${savings_account_no} is not active` }, { status: 400 })
      }

      if (!savingsAccount.savings_gl_account) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Savings GL account is not configured for the savings scheme" }, { status: 400 })
      }
    }

    // Appraiser charge adjusted with loan reduces the amount credited to savings
    const adjustedChargeAmt =
      appraiser_charge && appraiser_charge.charge_amount > 0 && appraiser_charge.payment_mode !== 'CASH'
        ? parseFloat(appraiser_charge.charge_amount)
        : 0
    const savingsCreditAmt = disbursementAmt - adjustedChargeAmt

    if ((isDefaultTransfer || isTransfer) && savingsCreditAmt <= 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Appraiser charge cannot be equal to or exceed the disbursement amount" }, { status: 400 })
    }

    // Transfer into an existing batch: it must be an open transfer batch of this branch and business date
    let existingVoucherNo: number | null = null
    if (existingBatchId) {
      const { rows: batchRows } = await client.query(
        `SELECT voucher_id, voucher_type, status, business_date::text AS business_date
         FROM gl_batches
         WHERE branch_id = $1 AND batch_id = $2
         FOR UPDATE`,
        [branchId, existingBatchId]
      )
      const b = batchRows[0]
      let batchError = ""
      if (!b) batchError = `GL batch ${existingBatchId} not found`
      else if (b.status !== 'PENDING') batchError = `GL batch ${existingBatchId} is already ${String(b.status).toLowerCase()}`
      else if (b.voucher_type !== 'TRANSFER') batchError = `GL batch ${existingBatchId} is not a transfer batch`
      else if (b.business_date !== String(businessDate).slice(0, 10)) batchError = `GL batch ${existingBatchId} belongs to another business date`
      if (batchError) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: batchError }, { status: 400 })
      }
      existingVoucherNo = b.voucher_id
    }

    // Appraiser charge: resolve and lock the appraiser's designated account before posting anything
    const hasAppraiserCharge = !!appraiser_charge && parseFloat(appraiser_charge.charge_amount) > 0
    let appraiserAccount: AppraiserAccount | null = null
    if (hasAppraiserCharge) {
      if (!appraiser_charge.appraiser_id) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Select the appraiser to receive the appraiser charge" }, { status: 400 })
      }
      const resolved = await lockAppraiserAccount(client, branchId, Number(appraiser_charge.appraiser_id))
      if (resolved.error) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: resolved.error }, { status: 400 })
      }
      appraiserAccount = resolved.account!
    }

    // Generate loan account number
    // const loanAccountNo = `LN${branchId}${String(app.loan_application_id).padStart(8, '0')}`
    const loanAccountNo = app.loan_application_id

    const voucherType = disbursement_mode === 'CASH' ? 'CASH' : 'TRANSFER'
    const disbNarration = narration || "Loan Disbursement"

    // GL batch + voucher: reuse the selected open batch (Transfer), otherwise open a new one
    let batchId: number
    let voucherNo: number
    if (existingBatchId && existingVoucherNo !== null) {
      batchId = existingBatchId
      voucherNo = existingVoucherNo
    } else {
      const { rows: [batch] } = await client.query(`
        UPDATE gl_batch_sequences
        SET last_batch_id = last_batch_id + 1
        WHERE branch_id = $1
        RETURNING last_batch_id
      `, [branchId])
      batchId = batch.last_batch_id

      const { rows: [voucher] } = await client.query(`
        INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
        VALUES ($1, $2, 1)
        ON CONFLICT (branch_id, business_date)
        DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
        RETURNING last_voucher_no
      `, [branchId, businessDate])
      voucherNo = voucher.last_voucher_no

      await client.query(`
        INSERT INTO gl_batches (
          business_date, branch_id, batch_id, voucher_id,
          voucher_type, maker_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      `, [businessDate, branchId, batchId, voucherNo, voucherType, session.userId])
    }

    // DR Loan GL (asset increases) — all modes
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
      disbursementAmt,
      voucherNo,
      disbNarration,
      session.userId
    ])

    if (isDefaultTransfer) {
      // CR Savings GL (liability increases) - credit member's savings account
      const savingsNarration = `Loan disbursement - Ref ${app.reference_no}`
      const newSavingsBalance = parseFloat(savingsAccount.available_balance) + savingsCreditAmt

      await client.query(`
        INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)
      `, [
        branchId, batchId, businessDate,
        savingsAccount.savings_gl_account, String(savings_account_no),
        savingsCreditAmt,
        voucherNo,
        savingsNarration,
        session.userId
      ])

      // Pending savings credit. The account balance is set from running_balance when the
      // voucher is verified (FAS → Verify Voucher), so it is not updated here.
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
        branchId, savings_account_no,
        businessDate,
        savingsCreditAmt, newSavingsBalance,
        savingsNarration,
        voucherNo, batchId,
        session.userId
      ])
    } else if (!isTransfer) {
      // CASH: CR Cash (asset decreases)
      await client.query(`
        INSERT INTO gl_batch_lines (
          branch_id, batch_id, business_date,
          accountcode, ref_account_id,
          debit_amount, credit_amount,
          voucher_id, narration, created_by
        ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)
      `, [
        branchId, batchId, businessDate,
        CASH_GL_ACCOUNT, '0',
        disbursementAmt,
        voucherNo,
        disbNarration,
        session.userId
      ])
    }
    // TRANSFER: no contra line here — the batch stays open for the credit side to be posted

    // Appraiser charge: transfer to the appraiser's designated account
    if (hasAppraiserCharge && appraiserAccount) {
      const chargeAmt = parseFloat(appraiser_charge.charge_amount)

      if (appraiser_charge.payment_mode === 'CASH') {
        // Separate cash voucher: DR Cash, CR Appraiser Account
        const { rows: [chargeBatch] } = await client.query(`
          UPDATE gl_batch_sequences SET last_batch_id = last_batch_id + 1
          WHERE branch_id = $1 RETURNING last_batch_id
        `, [branchId])
        const chargeBatchId = chargeBatch.last_batch_id

        const { rows: [chargeVoucher] } = await client.query(`
          INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
          VALUES ($1, $2, 1)
          ON CONFLICT (branch_id, business_date)
          DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
          RETURNING last_voucher_no
        `, [branchId, businessDate])
        const chargeVoucherNo = chargeVoucher.last_voucher_no

        await client.query(`
          INSERT INTO gl_batches (business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status)
          VALUES ($1, $2, $3, $4, 'CASH', $5, 'PENDING')
        `, [businessDate, branchId, chargeBatchId, chargeVoucherNo, session.userId])

        // DR Cash (income)
        await client.query(`
          INSERT INTO gl_batch_lines (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
          VALUES ($1, $2, $3, '23100000', '0', $4, 0, $5, $6, $7)
        `, [branchId, chargeBatchId, businessDate, chargeAmt, chargeVoucherNo, `Appraiser charge - ${app.reference_no}`, session.userId])

        // CR Appraiser Account
        await creditAppraiserAccount(client, {
          account: appraiserAccount, branchId, batchId: chargeBatchId, voucherNo: chargeVoucherNo, businessDate,
          voucherType: 'CASH', amount: chargeAmt,
          narration: `Appraiser charge - ${app.reference_no}`, userId: session.userId,
        })

      } else {
        // ADJUST_WITH_LOAN: add CR Appraiser Account to existing batch (reduces cash paid to member)
        await creditAppraiserAccount(client, {
          account: appraiserAccount, branchId, batchId, voucherNo, businessDate,
          voucherType: 'TRANSFER', amount: chargeAmt,
          narration: `Appraiser charge adjusted - ${app.reference_no}`, userId: session.userId,
        })

        // CASH: DR Cash by the charge so the net cash paid to the member is amount − charge.
        // Default Transfer already credits the net amount to savings; Transfer leaves the
        // net amount (amount − charge) for the contra entry that completes the batch.
        if (disbursement_mode === 'CASH') {
          await client.query(`
            INSERT INTO gl_batch_lines (branch_id, batch_id, business_date, accountcode, ref_account_id, debit_amount, credit_amount, voucher_id, narration, created_by)
            VALUES ($1, $2, $3, $4, '0', $5, 0, $6, $7, $8)
          `, [branchId, batchId, businessDate, CASH_GL_ACCOUNT, chargeAmt, voucherNo, `Appraiser charge offset - ${app.reference_no}`, session.userId])
        }
      }
    }

    // Insert loan transaction (disbursement has no credit — only debit)
    await client.query(`
      INSERT INTO loan_transaction_details (
        transaction_date, branch_id, voucher_no, loan_account_no,
        transaction_type, debit_amount, credit_principal_amount, credit_interest_amount,
        balance_after_transaction, reference_no, remarks, created_at
      ) VALUES ($1, $2, $3, $4, 'DISBURSEMENT', $5, 0, 0, $5, $6, $7, NOW())
    `, [
      businessDate, branchId, voucherNo, loanAccountNo,
      disbursementAmt, app.reference_no, narration || 'Loan Disbursement'
    ])

    // Generate repayment schedule
    const P = parseFloat(app.sanctioned_amount)
    const R = parseFloat(app.interest_rate) / 12 / 100
    const N = parseInt(app.loan_tenure_months)
    const emi = parseFloat(app.payment_amount)

    let balance = P
    const startDate = new Date(businessDate)
    const { rows: schedSeq } = await client.query(
        `SELECT COALESCE(MAX(schedule_id), 0) + 1 as next_id FROM loan_repayment_schedule_details`
      )
    let nextScheduleId = schedSeq[0].next_id
    
    for (let i = 1; i <= N; i++) {
      const interestAmt = balance * R
      const principalAmt = emi - interestAmt
      balance = balance - principalAmt
      if (balance < 0) balance = 0

      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      await client.query(`
        INSERT INTO loan_repayment_schedule_details (
          schedule_id, loan_account_no, installment_no, due_date,
          principal_amount, interest_amount, total_installment,
          balance_principal, payment_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())
      `, [
        nextScheduleId,
        loanAccountNo, i, dueDate.toISOString().split('T')[0],
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
    `, [disbursementAmt, loan_application_id])

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
      disbursement_mode,
      batch_open: isTransfer, // Transfer batch still needs its contra entry
      savings_account_no: isDefaultTransfer ? savings_account_no : null,
      appraiser_account_no: appraiserAccount?.account_number ?? null,
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
