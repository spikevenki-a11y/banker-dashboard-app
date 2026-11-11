import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/connection/db";
import { getSession } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await pool.query(
      `SELECT * FROM sundry_creditors WHERE id = $1 AND branch_id = $2`,
      [id, session.branch]
    );
    const data = result.rows[0];

    if (!data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Balances are deliberately not updatable here; they only change through GL vouchers.
    const body = await request.json();
    const { account_name, description, account_status } = body;

    const result = await pool.query(
      `UPDATE sundry_creditors
       SET account_name = $1, description = $2, account_status = $3
       WHERE id = $4 AND branch_id = $5
       RETURNING *`,
      [account_name, description, account_status, id, session.branch]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}
