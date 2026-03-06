import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/connection/db";
import { getSession } from "@/lib/auth/session";

// GET - List all interest policies with their conditions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get("product_code");

    const pool = await getConnection();

    let query = `
      SELECT 
        ip.policy_id,
        ip.product_code,
        ip.base_rate,
        ip.effective_from,
        ip.effective_to,
        ip.status,
        COALESCE(
          json_agg(
            json_build_object(
              'condition_id', ic.condition_id,
              'field_name', ic.field_name,
              'operator', ic.operator,
              'value_from', ic.value_from,
              'value_to', ic.value_to,
              'interest_rate', ic.interest_rate,
              'penal_rate', ic.penal_rate
            )
          ) FILTER (WHERE ic.condition_id IS NOT NULL),
          '[]'
        ) as conditions
      FROM interest_policy ip
      LEFT JOIN interest_condition ic ON ip.policy_id = ic.policy_id
    `;

    const params: string[] = [];
    if (productCode) {
      query += ` WHERE ip.product_code = $1`;
      params.push(productCode);
    }

    query += ` GROUP BY ip.policy_id, ip.product_code, ip.base_rate, ip.effective_from, ip.effective_to, ip.status
               ORDER BY ip.effective_from DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({ policies: result.rows });
  } catch (error) {
    console.error("Error fetching interest policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch interest policies" },
      { status: 500 }
    );
  }
}

// POST - Create a new interest policy with conditions
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      product_code,
      base_rate,
      effective_from,
      effective_to,
      conditions = [],
    } = body;

    // Validate required fields
    if (!product_code || base_rate === undefined || !effective_from) {
      return NextResponse.json(
        { error: "Missing required fields: product_code, base_rate, effective_from" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Start transaction
    await pool.query("BEGIN");

    try {
      // Get next policy_id
      const seqResult = await pool.query(
        `SELECT COALESCE(MAX(policy_id), 0) + 1 as next_id FROM interest_policy`
      );
      const policyId = seqResult.rows[0].next_id;

      // Insert the policy
      await pool.query(
        `INSERT INTO interest_policy (policy_id, product_code, base_rate, effective_from, effective_to, status)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE')`,
        [policyId, product_code, base_rate, effective_from, effective_to || null]
      );

      // Insert conditions if any
      if (conditions.length > 0) {
        for (let i = 0; i < conditions.length; i++) {
          const cond = conditions[i];
          const conditionId = i + 1;

          await pool.query(
            `INSERT INTO interest_condition 
             (condition_id, policy_id, field_name, operator, value_from, value_to, interest_rate, penal_rate, parent_condition_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              conditionId,
              policyId,
              cond.field_name,
              cond.operator,
              cond.value_from,
              cond.value_to || null,
              cond.interest_rate,
              cond.penal_rate || null,
              cond.parent_condition_id || null,
            ]
          );
        }
      }

      await pool.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Interest policy created successfully",
        policy_id: policyId,
      });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (error) {
    console.error("Error creating interest policy:", error);
    return NextResponse.json(
      { error: "Failed to create interest policy" },
      { status: 500 }
    );
  }
}
