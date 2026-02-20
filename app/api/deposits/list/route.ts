import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

export async function GET(req: Request) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"
    const depositType = searchParams.get("type") || "all"

    // Build query joining deposit_account with memberships, customers,
    // term_deposit_details, recurring_deposit_details, pigmy_deposit_details, and deposit_schemes
    let query = `
      SELECT
        da.id,
        da.accountnumber,
        da.deposittype,
        da.membership_no,
        da.accountopendate,
        da.rateofinterest,
        da.clearbalance,
        da.accountstatus,
        da.accountclosedate,
        da.schemeid,
        ds.scheme_name,
        c.full_name AS member_name,
        -- Term Deposit fields
        td.depositamount AS td_deposit_amount,
        td.periodmonths AS td_period_months,
        td.perioddays AS td_period_days,
        td.maturitydate AS td_maturity_date,
        td.maturityamount AS td_maturity_amount,
        td.autorenewalflag AS td_auto_renewal,
        -- Recurring Deposit fields
        rd.installment_amount AS rd_installment_amount,
        rd.installment_frequency AS rd_frequency,
        rd.numberofinstallments AS rd_total_installments,
        rd.numberofinstalmentspaid AS rd_paid_installments,
        rd.maturitydate AS rd_maturity_date,
        rd.maturityamount AS rd_maturity_amount,
        -- Pigmy Deposit fields
        pd.minimum_daily_amount AS pd_daily_amount,
        pd.collection_frequency AS pd_frequency
      FROM deposit_account da
      LEFT JOIN memberships m ON m.membership_no = da.membership_no AND m.branch_id = da.branch_id
      LEFT JOIN customers c ON c.customer_code = m.customer_code
      LEFT JOIN deposit_schemes ds ON ds.scheme_id = da.schemeid AND ds.branch_id = da.branch_id
      LEFT JOIN term_deposit_details td ON td.accountnumber = da.accountnumber
      LEFT JOIN recurring_deposit_details rd ON rd.accountnumber = da.accountnumber
      LEFT JOIN pigmy_deposit_details pd ON pd.accountnumber = da.accountnumber
      WHERE da.branch_id = $1
    `

    const params: any[] = [branchId]
    let paramIndex = 2

    // Filter by status: 1=active, 2=matured, 3=closed, 4=premature closed
    if (status && status !== "all") {
      if (status === "active") {
        query += ` AND da.accountstatus = 1`
      } else if (status === "matured") {
        query += ` AND da.accountstatus = 2`
      } else if (status === "closed") {
        query += ` AND da.accountstatus = 3`
      } else if (status === "premature") {
        query += ` AND da.accountstatus = 4`
      }
    }

    // Filter by deposit type
    if (depositType && depositType !== "all") {
      query += ` AND da.deposittype = $${paramIndex}`
      params.push(depositType)
      paramIndex++
    }

    // Search filter
    if (search && search.trim() !== "") {
      query += ` AND (
        CAST(da.accountnumber AS TEXT) ILIKE $${paramIndex}
        OR CAST(da.membership_no AS TEXT) ILIKE $${paramIndex}
        OR COALESCE(c.full_name, '') ILIKE $${paramIndex}
        OR COALESCE(ds.scheme_name, '') ILIKE $${paramIndex}
      )`
      params.push(`%${search.trim()}%`)
      paramIndex++
    }

    query += ` ORDER BY da.createddate DESC, da.accountnumber DESC LIMIT 100`

    const result = await pool.query(query, params)

    // Map DB rows to a clean response
    const deposits = result.rows.map((row) => {
      const statusMap: Record<number, string> = {
        1: "active",
        2: "matured",
        3: "closed",
        4: "premature",
      }

      const typeMap: Record<string, string> = {
        T: "Term Deposit",
        R: "Recurring Deposit",
        P: "Pigmy Deposit",
      }

      return {
        id: row.id,
        accountNumber: String(row.accountnumber),
        depositType: row.deposittype,
        depositTypeLabel: typeMap[row.deposittype] || row.deposittype,
        membershipNo: String(row.membership_no),
        memberName: row.member_name || "N/A",
        openDate: row.accountopendate,
        interestRate: Number(row.rateofinterest),
        balance: Number(row.clearbalance),
        status: statusMap[row.accountstatus] || "active",
        accountStatus: row.accountstatus,
        closeDate: row.accountclosedate,
        schemeId: row.schemeid,
        schemeName: row.scheme_name || "N/A",
        // Term Deposit
        depositAmount: row.td_deposit_amount ? Number(row.td_deposit_amount) : null,
        periodMonths: row.td_period_months,
        periodDays: row.td_period_days,
        maturityDate: row.td_maturity_date || row.rd_maturity_date || null,
        maturityAmount: row.td_maturity_amount ? Number(row.td_maturity_amount) : (row.rd_maturity_amount ? Number(row.rd_maturity_amount) : null),
        autoRenewal: row.td_auto_renewal === "Y",
        // Recurring Deposit
        installmentAmount: row.rd_installment_amount ? Number(row.rd_installment_amount) : null,
        installmentFrequency: row.rd_frequency,
        totalInstallments: row.rd_total_installments,
        paidInstallments: row.rd_paid_installments,
        // Pigmy Deposit
        dailyAmount: row.pd_daily_amount ? Number(row.pd_daily_amount) : null,
        collectionFrequency: row.pd_frequency,
      }
    })

    // Also compute summary stats
    const allDeposits = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE accountstatus = 1) as active_count,
        COUNT(*) FILTER (WHERE accountstatus = 2) as matured_count,
        COALESCE(SUM(clearbalance) FILTER (WHERE accountstatus = 1), 0) as total_balance
      FROM deposit_account WHERE branch_id = $1`,
      [branchId]
    )

    const stats = allDeposits.rows[0]

    return NextResponse.json({
      deposits,
      stats: {
        total: Number(stats.total),
        activeCount: Number(stats.active_count),
        maturedCount: Number(stats.matured_count),
        totalBalance: Number(stats.total_balance),
      },
    })
  } catch (error: any) {
    console.error("Error listing deposits:", error)
    return NextResponse.json({ error: "Failed to fetch deposits: " + error.message }, { status: 500 })
  }
}
