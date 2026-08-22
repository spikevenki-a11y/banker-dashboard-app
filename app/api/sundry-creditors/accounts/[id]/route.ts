import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/connection/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await pool.query(
      `SELECT * FROM sundry_creditors WHERE id = $1`,
      [id]
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
  const { id } = await params;

  try {
    const body = await request.json();
    const { account_name, current_balance, description, account_status } =
      body;

    const result = await pool.query(
      `UPDATE sundry_creditors
       SET account_name = $1, current_balance = $2, description = $3, account_status = $4
       WHERE id = $5
       RETURNING *`,
      [account_name, current_balance, description, account_status, id]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}
