import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { rows } = await pool.query(
      `SELECT * FROM sundry_debitors 
       WHERE account_number = $1 AND branch_id = $2`,
      [id, branchId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    console.error("Error fetching sundry debtor account:", error)
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const body = await request.json();
    const { account_name, ledger_balance, account_description, account_status } = body;

    const { rows } = await pool.query(
      `UPDATE sundry_debitors
       SET account_name = COALESCE($1, account_name),
           ledger_balance = COALESCE($2, ledger_balance),
           account_description = COALESCE($3, account_description),
           account_status = COALESCE($4, account_status)
       WHERE account_number = $5 AND branch_id = $6
       RETURNING *`,
      [account_name, ledger_balance, account_description, account_status, id, branchId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    console.error("Error updating sundry debtor account:", error)
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}
