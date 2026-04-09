import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

const PROFIT_ON_SALE_GL = "31900000"  // Income: Profit on Asset Sale
const LOSS_ON_SALE_GL   = "43090000"  // Expense: Loss on Asset Disposal

// GET — list sale/disposal records
export async function GET(_request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session  = JSON.parse(c.value)
    const branchId = session.branch

    // Join via asset_id INT (type-level link in schema)
    const { rows } = await pool.query(
      `SELECT asd.*,
              aid.asset_name, aid.serial_number, aid.purchase_value,
              ac.category_name
       FROM asset_sales_details asd
       LEFT JOIN asset_items_details aid ON aid.asset_id = asd.asset_id
                                        AND aid.branch_id = asd.branch_id
       LEFT JOIN asset_categories ac ON ac.category_id = aid.category_id
       WHERE asd.branch_id = $1
       ORDER BY asd.sale_date DESC`,
      [branchId]
    )
    return NextResponse.json({ success: true, sales: rows })
  } catch (error: any) {
    console.error("Fixed Assets Sales GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — record asset sale or scrap disposal
export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const client = await pool.connect()

  try {
    const session      = JSON.parse(c.value)
    const branchId     = session.branch
    const userId       = session.userId
    const businessDate = session.businessDate

    const body = await request.json()
    const {
      asset_detail_id,   // asset_items_details.id (UUID) — to load asset + update status
      disposal_type,     // "SALE" | "SCRAP"
      sale_date,
      sale_amount,       // 0 for scrap
      buyer_name,
      remarks,
      voucher_type,
    } = body
    console.log("Received sale/disposal data:", body)

    if (!asset_detail_id || !disposal_type || !sale_date) {
      return NextResponse.json(
        { error: "Missing required fields: asset_detail_id, disposal_type, sale_date" },
        { status: 400 }
      )
    }

    // Load asset unit
    const { rows: [asset] } = await client.query(
      `SELECT aid.*, ac.gl_account_code, ac.depreciation_gl_account_code
       FROM asset_items_details aid
       LEFT JOIN asset_categories ac ON ac.category_id = aid.category_id
       WHERE aid.id = $1 AND aid.branch_id = $2`,
      [asset_detail_id, branchId]
    )
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    if (asset.status !== "active") {
      return NextResponse.json({ error: `Asset is already ${asset.status}` }, { status: 400 })
    }

    const bookValue  = parseFloat(asset.net_book_value)
    const saleAmount = parseFloat(sale_amount || 0)
    const profit     = saleAmount - bookValue
    const assetGl    = asset.gl_account_code || "24060000"
    const vType      = voucher_type || "CASH"
    const cashGl     = vType === "TRANSFER" ? "11100000" : "23100000"

    await client.query("BEGIN")

    // GL sequences
    const { rows: [batchRow] } = await client.query(
      `UPDATE gl_batch_sequences SET last_batch_id = last_batch_id + 1
       WHERE branch_id = $1 RETURNING last_batch_id`,
      [branchId]
    )
    const batchId = batchRow.last_batch_id

    const { rows: [voucherRow] } = await client.query(
      `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
       VALUES ($1, $2, 1)
       ON CONFLICT (branch_id, business_date)
       DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
       RETURNING last_voucher_no`,
      [branchId, businessDate]
    )
    const voucherNo = voucherRow.last_voucher_no

    await client.query(
      `INSERT INTO gl_batches
         (business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
      [sale_date, branchId, batchId, voucherNo, vType, userId]
    )

    const narration  = disposal_type === "SALE"
      ? `Asset Sale - ${asset.asset_name} (${asset.serial_number})`
      : `Asset Scrap/Disposal - ${asset.asset_name} (${asset.serial_number})`
    const assetRef   = asset.serial_number  // asset serial as ref_account_id (like account_number in other modules)

    if (disposal_type === "SALE" && saleAmount > 0) {
      // DR: Cash/Bank — ref_account_id = '0' (cash lines always use '0')
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1, $2, $3, $4, '0', $5, 0, $6, $7, $8)`,
        [branchId, batchId, sale_date, cashGl, saleAmount, voucherNo, narration, userId]
      )
      // CR: Asset GL — ref_account_id = serial_number
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)`,
        [branchId, batchId, sale_date, assetGl, assetRef, bookValue, voucherNo, narration, userId]
      )
      if (profit > 0) {
        // CR: Profit on Asset Sale — ref_account_id = serial_number
        await client.query(
          `INSERT INTO gl_batch_lines (
             branch_id, batch_id, business_date,
             accountcode, ref_account_id,
             debit_amount, credit_amount,
             voucher_id, narration, created_by
           ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)`,
          [branchId, batchId, sale_date, PROFIT_ON_SALE_GL, assetRef, profit, voucherNo, narration, userId]
        )
      } else if (profit < 0) {
        // DR: Loss on Asset Sale — ref_account_id = serial_number
        await client.query(
          `INSERT INTO gl_batch_lines (
             branch_id, batch_id, business_date,
             accountcode, ref_account_id,
             debit_amount, credit_amount,
             voucher_id, narration, created_by
           ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
          [branchId, batchId, sale_date, LOSS_ON_SALE_GL, assetRef, Math.abs(profit), voucherNo, narration, userId]
        )
      }
    } else {
      // SCRAP: DR Loss → CR Asset GL — ref_account_id = serial_number for both
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
        [branchId, batchId, sale_date, LOSS_ON_SALE_GL, assetRef, bookValue, voucherNo, narration, userId]
      )
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)`,
        [branchId, batchId, sale_date, assetGl, assetRef, bookValue, voucherNo, narration, userId]
      )
    }

    // Sequential sale_id per branch
    const { rows: [countRow] } = await client.query(
      `SELECT COUNT(*) AS count FROM asset_sales_details WHERE branch_id = $1`,
      [branchId]
    )
    const saleId = parseInt(countRow.count) + 1

    // asset_sales_details schema: asset_id INT, no disposal_type/book_value_at_sale/profit_loss
    // Store disposal_type and serial_number in remarks for reference
    const fullRemarks = [
      `[${disposal_type}]`,
      asset.serial_number ? `Serial: ${asset.serial_number}` : null,
      buyer_name ? `Buyer: ${buyer_name}` : null,
      remarks || null,
    ].filter(Boolean).join(" | ")

    const { rows: [saleRec] } = await client.query(
      `INSERT INTO asset_sales_details
         (branch_id, transaction_date, batch_id, voucher_no, sale_id,
          asset_id, sale_date, sale_amount, buyer_name, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        branchId, sale_date, batchId, String(voucherNo), saleId,
        asset.asset_id, sale_date, saleAmount, buyer_name || null, fullRemarks,
      ]
    )

    // Update the asset unit status
    const newStatus = disposal_type === "SALE" ? "sold" : "scrapped"
    await client.query(
      `UPDATE asset_items_details SET status = $1 WHERE id = $2`,
      [newStatus, asset_detail_id]
    )

    await client.query("COMMIT")
    return NextResponse.json({
      success: true,
      message: disposal_type === "SALE" ? "Asset sale recorded" : "Asset scrapped",
      sale: saleRec,
      profit_loss: profit,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Fixed Assets Sales POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
