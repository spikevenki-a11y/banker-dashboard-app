import { NextResponse } from "next/server";
import { getConnection } from "@/lib/connection/db";
import { getSession } from "@/lib/auth/session";

// GET - List all product codes from savings and deposit schemes
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = await getConnection();

    // Get savings schemes
    const savingsResult = await pool.query(`
      SELECT 
        scheme_id::text as product_code,
        scheme_name as product_name,
        'SAVINGS' as product_type
      FROM savings_schemes
      WHERE scheme_status = 'ACTIVE'
      ORDER BY scheme_name
    `);

    // Get deposit schemes
    const depositResult = await pool.query(`
      SELECT 
        scheme_id::text as product_code,
        scheme_name as product_name,
        deposit_type as product_type
      FROM deposit_schemes
      WHERE scheme_status = 'ACTIVE'
      ORDER BY scheme_name
    `);

    const products = [
      ...savingsResult.rows.map((r) => ({
        ...r,
        product_code: `SAV-${r.product_code}`,
      })),
      ...depositResult.rows.map((r) => ({
        ...r,
        product_code: `DEP-${r.product_code}`,
      })),
    ];

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
