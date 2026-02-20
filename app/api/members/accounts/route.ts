import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(req.url)
    const membershipNo = searchParams.get("membership_no")

    if (!membershipNo) {
      return NextResponse.json({ error: "Membership number is required" }, { status: 400 })
    }

    // 1. Savings Accounts (Assets)
    const savingsResult = await pool.query(
      `SELECT 
        sa.account_number,
        sa.available_balance,
        sa.clear_balance,
        sa.account_status,
        sa.opening_date,
        sa.interest_rate,
        ss.scheme_name
       FROM savings_accounts sa
       LEFT JOIN savings_schemes ss ON sa.scheme_id = ss.scheme_id AND sa.branch_id = ss.branch_id
       WHERE sa.membership_no = $1 AND sa.branch_id = $2
       ORDER BY sa.opening_date DESC`,
      [membershipNo, branchId]
    )

    // 2. Deposit Accounts (Assets) - TD, RD, Pigmy
    const depositsResult = await pool.query(
      `SELECT 
        da.accountnumber,
        da.deposittype,
        da.clearbalance,
        da.accountstatus,
        da.accountopendate,
        da.rateofinterest,
        da.accountclosedate,
        ds.scheme_name,
        td.depositamount AS td_deposit_amount,
        td.maturitydate AS td_maturity_date,
        td.maturityamount AS td_maturity_amount,
        rd.installment_amount AS rd_installment_amount,
        rd.maturitydate AS rd_maturity_date,
        rd.maturityamount AS rd_maturity_amount,
        rd.numberofinstallments AS rd_total_installments,
        rd.numberofinstalmentspaid AS rd_paid_installments,
        pd.minimum_daily_amount AS pd_daily_amount
       FROM deposit_account da
       LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
       LEFT JOIN term_deposit_details td ON td.accountnumber = da.accountnumber
       LEFT JOIN recurring_deposit_details rd ON rd.accountnumber = da.accountnumber
       LEFT JOIN pigmy_deposit_details pd ON pd.accountnumber = da.accountnumber
       WHERE da.membership_no = $1 AND da.branch_id = $2
       ORDER BY da.createddate DESC`,
      [membershipNo, branchId]
    )

    // 3. Share Account (Assets)
    const sharesResult = await pool.query(
      `SELECT 
        ms.membership_no,
        ms.share_balance,
        ms.status,
        ms.share_opened_date,
        ms.closing_date
       FROM member_shares ms
       WHERE ms.membership_no = $1 AND ms.branch_id = $2`,
      [membershipNo, branchId]
    )

    // Map deposit type codes
    const depositTypeMap: Record<string, string> = {
      T: "Term Deposit",
      R: "Recurring Deposit",
      P: "Pigmy Deposit",
    }

    const depositStatusMap: Record<number, string> = {
      1: "ACTIVE",
      2: "MATURED",
      3: "CLOSED",
      4: "PREMATURE CLOSED",
    }

    // Build Assets
    const assets: any[] = []

    // Savings
    savingsResult.rows.forEach((row) => {
      assets.push({
        account_type: "Savings",
        account_number: row.account_number,
        scheme_name: row.scheme_name || "Savings Account",
        balance: Number(row.available_balance || 0),
        status: row.account_status || "ACTIVE",
        opening_date: row.opening_date,
        interest_rate: Number(row.interest_rate || 0),
        extra: null,
      })
    })

    // Deposits
    depositsResult.rows.forEach((row) => {
      const type = depositTypeMap[row.deposittype] || row.deposittype
      let extra = null
      if (row.deposittype === "T") {
        extra = {
          deposit_amount: Number(row.td_deposit_amount || 0),
          maturity_date: row.td_maturity_date,
          maturity_amount: Number(row.td_maturity_amount || 0),
        }
      } else if (row.deposittype === "R") {
        extra = {
          installment_amount: Number(row.rd_installment_amount || 0),
          maturity_date: row.rd_maturity_date,
          maturity_amount: Number(row.rd_maturity_amount || 0),
          total_installments: row.rd_total_installments,
          paid_installments: row.rd_paid_installments,
        }
      } else if (row.deposittype === "P") {
        extra = {
          daily_amount: Number(row.pd_daily_amount || 0),
        }
      }

      assets.push({
        account_type: type,
        account_number: String(row.accountnumber),
        scheme_name: row.scheme_name || type,
        balance: Number(row.clearbalance || 0),
        status: depositStatusMap[row.accountstatus] || "ACTIVE",
        opening_date: row.accountopendate,
        interest_rate: Number(row.rateofinterest || 0),
        close_date: row.accountclosedate,
        extra,
      })
    })

    // Shares
    sharesResult.rows.forEach((row) => {
      assets.push({
        account_type: "Share Capital",
        account_number: `SH-${row.membership_no}`,
        scheme_name: "Member Shares",
        balance: Number(row.share_balance || 0),
        status: row.status || "ACTIVE",
        opening_date: row.share_opened_date,
        interest_rate: 0,
        extra: null,
      })
    })

    // Liabilities - Currently loans are not fully implemented, but structure is ready
    const liabilities: any[] = []

    // Summary totals
    const totalAssets = assets
      .filter((a) => a.status === "ACTIVE")
      .reduce((sum, a) => sum + a.balance, 0)
    const totalLiabilities = liabilities
      .filter((l) => l.status === "ACTIVE")
      .reduce((sum, l) => sum + l.balance, 0)

    return NextResponse.json({
      success: true,
      assets,
      liabilities,
      summary: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: totalAssets - totalLiabilities,
        total_accounts: assets.length + liabilities.length,
      },
    })
  } catch (error: any) {
    console.error("Error fetching member accounts:", error)
    return NextResponse.json({ error: "Failed to fetch member accounts" }, { status: 500 })
  }
}
