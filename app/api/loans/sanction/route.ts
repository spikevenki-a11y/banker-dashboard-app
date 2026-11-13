import { getSession } from "@/lib/auth/session"
import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import {
  buildRepaymentSchedule,
  effectiveFrequency,
  firstRegularInstallment,
  getScheduleFitError,
  isMoratoriumInterestApplicable,
  isFixedPrincipalFrequency,
  isRepaymentMethod,
  maturityDate,
} from "@/lib/loan-repayment-schedule"
import { formatAmount } from "@/lib/number-format"
import { getMoratoriumError, getTenureError, getTenureLimits } from "@/lib/loan-tenure"

// POST: Approve or Reject a loan application
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const branchId = session.branch
    const body = await request.json()
    const businessDate = session.businessDate

    const {
      loan_application_id,
      action, // 'APPROVE' or 'REJECT'
      sanctioned_amount,
      interest_rate,
      loan_tenure_months,
      moratorium_period,
      remarks,
      repayment_method,   // Repayment Type: ON_MATURITY | FIXED_PRINCIPAL
      repayment_type,     // Repayment Frequency: MONTHLY ... CLOSING_TIME
      installment_start_date,
      moratorium_interest_payable, // Interest Payable During Moratorium: true / false
    } = body

    if (!loan_application_id || !action) {
      return NextResponse.json(
        { error: "Application ID and action are required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Verify application exists and is pending
    const { rows: apps } = await client.query(
      `SELECT la.*, ls.scheme_name, ls.interest_rate as scheme_rate, ls.loan_gl_account,
              ls.minimum_period_months AS scheme_min_tenure, ls.maximum_period_months AS scheme_max_tenure
       FROM loan_applications la
       JOIN loan_schemes ls ON la.scheme_id = ls.scheme_id
       WHERE la.loan_application_id = $1 AND la.branch_id = $2`,
      [loan_application_id, branchId]
    )

    if (apps.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const app = apps[0]

    if (app.application_status !== 'PENDING') {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Application is not pending" }, { status: 400 })
    }

    if (action === 'APPROVE') {
      if (!sanctioned_amount || !interest_rate || !loan_tenure_months) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "Sanctioned amount, interest rate, and tenure are required for approval" },
          { status: 400 }
        )
      }

      // Sanctioned tenure (entered at sanction) must be within the scheme's tenure limits.
      // It is what the repayment schedule, instalments and interest are calculated on.
      const tenureError = getTenureError(
        loan_tenure_months,
        getTenureLimits(app.scheme_min_tenure, app.scheme_max_tenure)
      )
      if (tenureError) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: tenureError }, { status: 400 })
      }
      const sanctionedTenure = Number(loan_tenure_months)

      // Gestation (moratorium) period must be less than the sanctioned tenure
      const moratoriumError = getMoratoriumError(moratorium_period, sanctionedTenure)
      if (moratoriumError) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: moratoriumError }, { status: 400 })
      }

      const requestedAmount = parseFloat(sanctioned_amount)
      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Sanctioned amount must be greater than zero" }, { status: 400 })
      }
      if (requestedAmount > parseFloat(app.applied_loan_amount)) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Sanction Amount cannot be greater than Loan Amount Applied." }, { status: 400 })
      }

      // Gold security: cannot exceed the Maximum Sanction Amount stored with the
      // application (Guidelines Value per Gram × Net Weight)
      const { rows: goldCap } = await client.query(
        `SELECT SUM(gd.max_sanction_amount)::float8 AS max_sanction_amount
           FROM loan_securities sec
           JOIN security_gold_details gd ON gd.security_id = sec.id
          WHERE sec.loan_application_id = $1 AND sec.branch_id = $2`,
        [loan_application_id, branchId]
      )
      const goldMaxSanction = goldCap[0]?.max_sanction_amount
      if (goldMaxSanction != null && requestedAmount > Number(goldMaxSanction)) {
        await client.query("ROLLBACK")
        const cap = formatAmount(goldMaxSanction)
        return NextResponse.json(
          { error: `Sanctioned amount cannot exceed the gold Maximum Sanction Amount (₹${cap})` },
          { status: 400 }
        )
      }

      // Repayment Type + Frequency (On Maturity always repays at Closing Time)
      if (!isRepaymentMethod(repayment_method)) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Please select a valid repayment type" }, { status: 400 })
      }
      // Fixed Principal: Monthly, Quarterly, Half Yearly or Yearly (never Closing Time)
      if (repayment_method === "FIXED_PRINCIPAL" && !isFixedPrincipalFrequency(repayment_type)) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "Please select a repayment frequency: Monthly, Quarterly, Half Yearly or Yearly" },
          { status: 400 }
        )
      }
      const repaymentFrequency = effectiveFrequency(repayment_method, repayment_type)
      const moratoriumMonths = parseInt(moratorium_period) || 0

      // Repayment Period = Tenure − Moratorium; the schedule must fit inside the tenure
      const fitError = getScheduleFitError({
        tenureMonths: sanctionedTenure,
        moratoriumMonths,
        method: repayment_method,
        frequency: repaymentFrequency,
      })
      if (fitError) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: fitError }, { status: 400 })
      }

      // Interest Payable During Moratorium: Fixed Principal only, paid at the Repayment
      // Frequency (there is no separate interest frequency). Meaningless without a moratorium.
      const wantsMoratoriumInterest =
        moratorium_interest_payable === true || moratorium_interest_payable === "true" || moratorium_interest_payable === "YES"
      if (wantsMoratoriumInterest && repayment_method !== "FIXED_PRINCIPAL") {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "Interest Payable During Moratorium is available only for the Fixed Principal repayment type" },
          { status: 400 }
        )
      }
      const moratoriumInterestPayable =
        wantsMoratoriumInterest && isMoratoriumInterestApplicable(repayment_method, moratoriumMonths)

      // Same schedule the disbursement will save; its first regular instalment is stored
      // as payment_amount (On Maturity: the maturity amount)
      const schedule = buildRepaymentSchedule({
        principal: parseFloat(sanctioned_amount),
        annualRate: parseFloat(interest_rate),
        tenureMonths: sanctionedTenure,
        moratoriumMonths,
        moratoriumInterestPayable,
        method: repayment_method,
        frequency: repaymentFrequency,
        startDate: businessDate,
      })
      if (schedule.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Could not build the repayment schedule — check amount, rate and tenure" }, { status: 400 })
      }
      // No repayment date may fall after the maturity date (sanction date + tenure)
      const maturity = maturityDate(businessDate, sanctionedTenure)
      if (schedule[schedule.length - 1].due_date > maturity) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "The repayment schedule does not fit within the sanctioned tenure" },
          { status: 400 }
        )
      }
      // A First Installment Date entered by the officer must be after the gestation
      // period and on or before maturity
      if (installment_start_date) {
        const firstDate = String(installment_start_date).slice(0, 10)
        const moratoriumEnd = maturityDate(businessDate, moratoriumMonths)
        if (firstDate <= moratoriumEnd || firstDate > maturity) {
          await client.query("ROLLBACK")
          return NextResponse.json(
            { error: `First installment date must be after the gestation period end (${moratoriumEnd}) and on or before the maturity date (${maturity})` },
            { status: 400 }
          )
        }
      }
      // EMI / start date = first principal instalment (moratorium-interest rows come before it)
      const firstRegular = firstRegularInstallment(schedule)
      const emiAmount = firstRegular.total
      const number_of_installments = schedule.length
      // Generate sanction ID
      const { rows: seqResult } = await client.query(
        `SELECT COALESCE(MAX(sanction_id), 0) + 1 as next_id FROM loan_sanction_details`
      )
      const sanctionId = seqResult[0].next_id

      // Insert sanction details
      console.log("Inserting sanction details ")
      await client.query(
        `INSERT INTO loan_sanction_details (
          sanction_id, loan_application_id, sanctioned_amount, sanction_date,
          interest_rate, loan_tenure_months, payment_amount, moratorium_period,
          sanction_status, approved_by, remarks, created_at,repayment_type,number_of_installments,installment_start_date,branch_id,
          repayment_method, moratorium_interest_payable
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SANCTIONED', $9, $10, NOW(), $11, $12, $13, $14, $15, $16)`,
        [
          sanctionId, loan_application_id, sanctioned_amount, businessDate,
          interest_rate, sanctionedTenure, emiAmount, moratorium_period || 0, session.userId, remarks || '', repaymentFrequency, number_of_installments,
          installment_start_date || firstRegular.due_date, session.branch,
          repayment_method, moratoriumInterestPayable
        ]
      )

      // Update application status
      await client.query(
        `UPDATE loan_applications SET application_status = 'SANCTIONED', updated_at = NOW() 
         WHERE loan_application_id = $1`,
        [loan_application_id]
      )

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Loan application approved successfully",
        sanction_id: sanctionId,
        emi_amount: emiAmount
      })

    } else if (action === 'REJECT') {
      if (!remarks) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Remarks are required for rejection" }, { status: 400 })
      }

      // Generate sanction ID for rejection record
      const { rows: seqResult } = await client.query(
        `SELECT COALESCE(MAX(sanction_id), 0) + 1 as next_id FROM loan_sanction_details`
      )
      const sanctionId = seqResult[0].next_id

      // Insert rejection record
      await client.query(
        `INSERT INTO loan_sanction_details (
          sanction_id, loan_application_id, sanction_date,
          sanction_status, approved_by, remarks, created_at,branch_id
        ) VALUES ($1, $2, CURRENT_DATE, 'REJECTED', $3, $4, NOW(), $5)`,
        [sanctionId, loan_application_id, session.userId, remarks, session.branch]
      )

      // Update application status
      await client.query(
        `UPDATE loan_applications SET application_status = 'REJECTED', updated_at = NOW() 
         WHERE loan_application_id = $1`,
        [loan_application_id]
      )

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Loan application rejected"
      })

    } else {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Failed to process sanction:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
