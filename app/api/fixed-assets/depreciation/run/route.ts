import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// POST — run depreciation for selected assets
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
      depreciation_date,
      asset_detail_ids,  // array of asset_items_details.id (UUID)
    } = body

    if (!depreciation_date || !asset_detail_ids?.length) {
      return NextResponse.json(
        { error: "Missing required fields: depreciation_date, asset_detail_ids" },
        { status: 400 }
      )
    }

    // Load assets joined with dep config via serial_number
    const { rows: assets } = await client.query(
      `SELECT aid.id, aid.asset_id, aid.asset_name, aid.serial_number,
              aid.purchase_value, aid.net_book_value,
              aid.last_depreciation_date, aid.category_id,
              ac.gl_account_code, ac.depreciation_gl_account_code,
              adm.method, adm.depreciation_rate
       FROM asset_items_details aid
       JOIN asset_depreciation_master adm ON adm.serial_number = aid.serial_number
                                         AND adm.branch_id = aid.branch_id
       LEFT JOIN asset_categories ac ON ac.category_id = aid.category_id
       WHERE aid.id = ANY($1)
         AND aid.branch_id = $2
         AND aid.status = 'active'`,
      [asset_detail_ids, branchId]
    )

    if (assets.length === 0) {
      return NextResponse.json(
        { error: "No active assets with depreciation config found" },
        { status: 400 }
      )
    }

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
       VALUES ($1,$2,$3,$4,'JOURNAL',$5,'PENDING')`,
      [depreciation_date, branchId, batchId, voucherNo, userId]
    )

    const results: Array<{
      id: string; asset_name: string; serial_number: string
      dep_amount: number; new_book_value: number
    }> = []

    for (const asset of assets) {
      const purchaseValue = parseFloat(asset.purchase_value)
      const bookValue     = parseFloat(asset.net_book_value)
      const rate          = parseFloat(asset.depreciation_rate)

      // Annual depreciation
      const annualDep = asset.method === "SLM"
        ? (purchaseValue * rate) / 100
        : (bookValue * rate) / 100

      const depAmount = Math.min(parseFloat(annualDep.toFixed(2)), bookValue)
      if (depAmount <= 0) continue

      // Accumulated depreciation for this asset type (asset_id INT)
      const { rows: [accRow] } = await client.query(
        `SELECT COALESCE(SUM(depreciation_amount), 0) AS accumulated
         FROM asset_depreciation_details
         WHERE asset_id = $1 AND branch_id = $2`,
        [asset.asset_id, branchId]
      )
      const accumulated  = parseFloat(accRow.accumulated) + depAmount
      const newBookValue = parseFloat((bookValue - depAmount).toFixed(2))
      const depExpGl     = asset.depreciation_gl_account_code || "43080600"
      const assetGl      = asset.gl_account_code || "24060000"
      const narration    = `Depreciation - ${asset.asset_name} (${asset.serial_number})`
      const assetRef     = asset.serial_number  // asset serial as ref_account_id (like account_number in other modules)

      // DR: Depreciation Expense GL — ref_account_id = serial_number
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
        [branchId, batchId, depreciation_date, depExpGl, assetRef, depAmount, voucherNo, narration, userId]
      )
      // CR: Asset GL — ref_account_id = serial_number
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)`,
        [branchId, batchId, depreciation_date, assetGl, assetRef, depAmount, voucherNo, narration, userId]
      )

      // Sequential dep_detail_id per branch
      const { rows: [dCountRow] } = await client.query(
        `SELECT COUNT(*) AS count FROM asset_depreciation_details WHERE branch_id = $1`,
        [branchId]
      )
      const depDetailId = parseInt(dCountRow.count) + 1

      // asset_depreciation_details: uses asset_id INT, no batch_id/voucher_no columns
      await client.query(
        `INSERT INTO asset_depreciation_details
           (branch_id, dep_detail_id, asset_id, depreciation_date,
            depreciation_amount, accumulated_depreciation, book_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [branchId, depDetailId, asset.asset_id, depreciation_date, depAmount, accumulated, newBookValue]
      )

      // Update asset unit record
      await client.query(
        `UPDATE asset_items_details
         SET net_book_value = $1, last_depreciation_date = $2
         WHERE id = $3`,
        [newBookValue, depreciation_date, asset.id]
      )

      results.push({
        id: asset.id,
        asset_name: asset.asset_name,
        serial_number: asset.serial_number,
        dep_amount: depAmount,
        new_book_value: newBookValue,
      })
    }

    await client.query("COMMIT")
    return NextResponse.json({
      success: true,
      message: `Depreciation run for ${results.length} asset(s)`,
      voucher_no: voucherNo,
      batch_id: batchId,
      results,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Fixed Assets Depreciation Run error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
