import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function POST(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const userId = session.userId

    const {
      membership_no,
      scheme_id,
      deposit_type,
      deposit_amount,
      period_months,
      period_days,
      account_open_date,
      rate_of_interest,
      auto_renewal,
      renewal_period_months,
      renewal_period_days,
      renewal_with_interest,
      interest_payout_frequency,
      interest_calc_method,
      premature_penal_rate,
      tds_applicable,
      nominee_name,
      nominee_relation,
      // RD specific
      installment_amount,
      installment_frequency,
      number_of_installments,
      penal_rate,
    } = await req.json()

    if (!membership_no || !scheme_id || !deposit_type || !account_open_date) {
      return NextResponse.json(
        { error: "Membership number, scheme, deposit type, and opening date are required" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    // Get scheme details
    const schemeResult = await client.query(
      `SELECT * FROM deposit_schemes WHERE scheme_id = $1 AND branch_id = $2 AND scheme_status = 'ACTIVE'`,
      [scheme_id, branchId]
    )

    if (schemeResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Invalid or inactive scheme" }, { status: 400 })
    }

    const scheme = schemeResult.rows[0]

    // Generate account number: branch(3) + scheme(2) + seq(6) = 14 digits padded
    // Map deposit type to a code: T=10, R=20, P=30
    const typeCode = deposit_type === "T" ? "02" : deposit_type === "R" ? "02" : "02"
    const seqResult = await client.query(
      `SELECT COALESCE(MAX(accountnumber), 0) + 1 as next_num
       FROM deposit_account WHERE branch_id = $1`,
      [branchId]
    )
    const branchStr = String(branchId).padStart(3, "0")
    let seqNum = 1
    if(seqResult){
       seqNum = seqResult.rows[0].next_num > 0 ? seqResult.rows[0].next_num : 1
    }
   
    const accountNumber = Number(String(seqNum))
    // const accountNumber = Number(`${branchStr}${typeCode}${String(seqNum).padStart(6, "0")}`)
    console.log("accountnumber is : ",accountNumber)
    console.log("THE deposit_type is : ",deposit_type)

    // Calculate maturity
    let maturityDate = null
    let maturityAmount = null
    const amt = Number(deposit_amount) || 0
    const months = Number(period_months) || 0
    const days = Number(period_days) || 0
    const interest = Number(rate_of_interest) || Number(scheme.interest_rate) || 0

    if (deposit_type === "TERM" && amt > 0) {
      // Simple interest maturity calculation
      const totalDays = months * 30 + days
      const interestEarned = (amt * interest * totalDays) / (365 * 100)
      maturityAmount = Math.round((amt + interestEarned) * 100) / 100

      const openDate = new Date(account_open_date)
      openDate.setMonth(openDate.getMonth() + months)
      openDate.setDate(openDate.getDate() + days)
      maturityDate = openDate.toISOString().split("T")[0]
    }
    console.log("the data is : ",branchId,
        scheme_id,
        deposit_type,
        accountNumber,
        membership_no,
        account_open_date,
        amt,
        interest,
        tds_applicable === true ? "Y" : (scheme.tds_applicable ? "Y" : "N"),
        userId,)

    // Insert deposit_account
    const accountResult = await client.query(
      `INSERT INTO deposit_account (
        branch_id, schemeid, deposittype, accountnumber, membership_no,
        valuedate, accountopendate, clearbalance, unclearbalance,
        rateofinterest, tdsapplicable, accountstatus,
        createdby, createddate
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $6, $7, 0,
        $8, $9, 1,
        $10, CURRENT_DATE
      ) RETURNING accountnumber`,
      [
        branchId,
        scheme_id,
        deposit_type,
        accountNumber,
        membership_no,
        account_open_date,
        amt,
        interest,
        tds_applicable === true ? "Y" : (scheme.tds_applicable ? "Y" : "N"),
        userId,
      ]
    )

    // const accountId = accountResult.rows[0].id
    const acctNum  = accountResult.rows[0].accountnumber
    console.log("acctNum is ,",acctNum)

    // Insert type-specific details
    if (deposit_type === "TERM") {
      await client.query(
        `INSERT INTO term_deposit_details (
          id, accountnumber, depositamount, periodmonths, perioddays,
          maturitydate, maturityamount, autorenewalflag,
          periodmonthsforautorenewal, perioddaysforautorenewal,
          renewalwithinterest, penalrate
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          acctNum,
          amt,
          months,
          days,
          maturityDate,
          maturityAmount,
          auto_renewal === true ? "Y" : "N",
          Number(renewal_period_months) || 0,
          Number(renewal_period_days) || 0,
          renewal_with_interest === true ? "Y" : "N",
          Number(premature_penal_rate) || 0,
        ]
      )
    } else if (deposit_type === "RECURING") {
      const rdInstAmt = Number(installment_amount) || 0
      const rdInstNum = Number(number_of_installments) || months

      const openDate = new Date(account_open_date)
      openDate.setMonth(openDate.getMonth() + months)
      openDate.setDate(openDate.getDate() + days)
      maturityDate = openDate.toISOString().split("T")[0]

      await client.query(
        `INSERT INTO recurring_deposit_details (
          id, accountnumber, installment_amount, installment_frequency,
          numberofinstallments, numberofinstalmentspaid,
          nextinstalmentdate, maturitydate, penalrate
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, $5, $6, $7)`,
        [
          acctNum,
          rdInstAmt,
          installment_frequency || "MONTHLY",
          rdInstNum,
          account_open_date,
          maturityDate,
          Number(penal_rate) || 0,
        ]
      )
    } else if (deposit_type === "PIGMY") {
      await client.query(
        `INSERT INTO pigmy_deposit_details (
          id, accountnumber, collection_frequency, minimum_daily_amount
        ) VALUES (gen_random_uuid(), $1, 'DAILY', $2)`,
        [acctNum, amt]
      )
    }

    // Insert opening transaction
    // await client.query(
    //   `INSERT INTO deposit_transactions (
    //     account_id, transaction_date, value_date, branch_id,
    //     transaction_type, narration,
    //     credit_amount, debit_amount, running_balance,
    //     status, created_by
    //   ) VALUES ($1, $2, $2, $3, 'OPENING', 'Deposit account opened', $4, 0, $4, 'ACTIVE', $5)`,
    //   [accountId, account_open_date, branchId, amt, userId]
    // )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      account_number: acctNum,
      account_id: acctNum,
      maturity_date: maturityDate,
      maturity_amount: maturityAmount,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error opening deposit account:", error)
    return NextResponse.json({ error: "Failed to open deposit account: " + error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
