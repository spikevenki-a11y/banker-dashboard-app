import { NextResponse } from "next/server";
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GET - List all product codes from savings and deposit schemes
export async function GET() {
  try {
    
      const c = (await cookies()).get("banker_session")
      if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    

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
