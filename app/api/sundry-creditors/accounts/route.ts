import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET() {

  try {
    
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const userId = session.userId

    
    // Fetch transactions for a specific account
    const list_of_accounts = await pool.query(
      `SELECT * FROM sundry_creditors 
        WHERE 
         branch_id = $1
        ORDER BY account_number DESC`,
        [branchId]
    )

    return NextResponse.json({ 
      success: true, 
      data: list_of_accounts.rows 
    })

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {

  try {
    
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch
    const userId = session.userId
    const businessDate = session.businessDate

    const body = await request.json();
    const {
      account_name,
      parent_account_number,
      opening_balance,
      description
    } = body;

    if (!account_name || !parent_account_number) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate account number using sequence
    const { rows: [seq] } = await pool.query(
      `UPDATE nextnumber
       SET nextvalue = nextvalue + 1
       WHERE branch_id = $1 AND accounttype = 61
       RETURNING nextvalue`,
      [branchId]
    )

    let runningNo: string
    if (seq) {
      runningNo = String(seq["nextvalue"]).padStart(7, "0")
    } else {
      await pool.query(
        `INSERT INTO nextnumber (branch_id, accounttype, nextvalue) VALUES ($1, 61, 1)
         ON CONFLICT (branch_id, accounttype) DO UPDATE SET nextvalue = nextnumber.nextvalue + 1`,
        [branchId]
      )
      runningNo = "0000001"
    }

    const nextAccountNumber = `${branchId}${runningNo}`

    const result = await pool.query(
        `INSERT INTO sundry_creditors (
            branch_id,
            parent_account_number,
            account_number,
            account_name,
            account_description,
            account_opened_date,
            ledger_balance,
            clear_balance,
            unclear_balance,
            account_status,
            account_closed_date,
            created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,0.00,0.00,'ACTIVE',NULL,$8)
        RETURNING *`,
        [branchId, parent_account_number, nextAccountNumber, account_name, description, businessDate, opening_balance || 0, userId]
    )

        const data = result.rows

    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
