import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id");

  try {
    let query = supabase
      .from("sundry_creditors")
      .select("*")
      .order("created_at", { ascending: false });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const {
      account_number,
      account_name,
      parent_account_number,
      opening_balance,
      description,
      branch_id,
    } = body;

    if (
      !account_number ||
      !account_name ||
      !parent_account_number ||
      !branch_id
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("sundry_creditors")
      .insert({
        account_number,
        account_name,
        parent_account_number,
        opening_balance: opening_balance || 0,
        current_balance: opening_balance || 0,
        description,
        branch_id,
        account_status: "ACTIVE",
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
