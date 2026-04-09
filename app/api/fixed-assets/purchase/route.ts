import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

// GET — list purchases (or a single purchase with its line items)
export async function GET(request: NextRequest) {
  try {
    const c = (await cookies()).get("banker_session")
    if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = JSON.parse(c.value)
    const branchId = session.branch

    const { searchParams } = new URL(request.url)
    const purchaseId = searchParams.get("purchase_id")

    if (purchaseId) {
      const { rows: [purchase] } = await pool.query(
        `SELECT * FROM asset_purchase_details WHERE purchase_id = $1 AND branch_id = $2`,
        [parseInt(purchaseId), branchId]
      )
      if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 })

      const { rows: items } = await pool.query(
        `SELECT api.*, ai.asset_name AS item_name, ac.category_name,
                ac.gl_account_code, ac.depreciation_gl_account_code
         FROM asset_purchase_items api
         LEFT JOIN asset_items ai ON ai.asset_id = api.asset_id AND ai.branch_id = $2
         LEFT JOIN asset_categories ac ON ac.category_id = ai.category_id
         WHERE api.purchase_id = $1`,
        [parseInt(purchaseId), branchId]
      )
      return NextResponse.json({ success: true, purchase, items })
    }

    const { rows } = await pool.query(
      `SELECT * FROM asset_purchase_details WHERE branch_id = $1 ORDER BY purchase_date DESC`,
      [branchId]
    )
    return NextResponse.json({ success: true, purchases: rows })
  } catch (error: any) {
    console.error("Fixed Assets Purchase GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — create new purchase record (no GL; confirmed via PATCH)
export async function POST(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const client = await pool.connect()

  try {
    const session  = JSON.parse(c.value)
    const branchId = session.branch

    const body = await request.json()
    const {
      vendor_name, vendor_gstin, vendor_contact, vendor_address,
      invoice_no, purchase_date, remarks,
      items,   // [{ asset_id, asset_name, quantity, unit_cost, sgst, cgst }]
    } = body

    if (!purchase_date || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields: purchase_date, items" },
        { status: 400 }
      )
    }

    await client.query("BEGIN")

    const { rows: [countRow] } = await client.query(
      `SELECT COUNT(*) AS count FROM asset_purchase_details WHERE branch_id = $1`,
      [branchId]
    )
    const purchaseId = parseInt(countRow.count) + 1

    const total_amount = items.reduce((sum: number, it: any) => {
      const base = parseFloat(it.unit_cost) * parseInt(it.quantity)
      return sum + base + base * (parseFloat(it.sgst || 0) / 100) + base * (parseFloat(it.cgst || 0) / 100)
    }, 0)

    const { rows: [purchase] } = await client.query(
      `INSERT INTO asset_purchase_details
         (branch_id, transaction_date, purchase_id, invoice_no,
          vendor_name, vendor_gstin, vendor_contact, vendor_address,
          purchase_date, total_amount, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        branchId, purchase_date, purchaseId, invoice_no || null,
        vendor_name || null, vendor_gstin || null, vendor_contact || null, vendor_address || null,
        purchase_date, total_amount, remarks || null,
      ]
    )

    let itemSeq = 1
    for (const it of items) {
      const base    = parseFloat(it.unit_cost) * parseInt(it.quantity)
      const sgstAmt = base * (parseFloat(it.sgst || 0) / 100)
      const cgstAmt = base * (parseFloat(it.cgst || 0) / 100)

      await client.query(
        `INSERT INTO asset_purchase_items
           (branch_id, purchase_id, purchase_item_id, asset_id, asset_name,
            quantity, unit_cost, sgst, cgst, total_cost)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          branchId, purchaseId, itemSeq++,
          it.asset_id || null, it.asset_name,
          parseInt(it.quantity), parseFloat(it.unit_cost),
          parseFloat(it.sgst || 0), parseFloat(it.cgst || 0), base + sgstAmt + cgstAmt,
        ]
      )
    }

    await client.query("COMMIT")
    return NextResponse.json({
      success: true,
      message: "Purchase recorded. Click Confirm to generate asset records.",
      purchase,
      purchase_id: purchaseId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Fixed Assets Purchase POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}

// DELETE — cancel a pending purchase (only allowed before confirmation)
export async function DELETE(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const client = await pool.connect()

  try {
    const session  = JSON.parse(c.value)
    const branchId = session.branch

    const { purchase_id } = await request.json()
    if (!purchase_id) {
      return NextResponse.json({ error: "purchase_id is required" }, { status: 400 })
    }

    await client.query("BEGIN")

    const { rows: [purchase] } = await client.query(
      `SELECT * FROM asset_purchase_details WHERE purchase_id = $1 AND branch_id = $2`,
      [purchase_id, branchId]
    )
    if (!purchase) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }
    if (purchase.batch_id) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Cannot cancel a confirmed purchase" }, { status: 400 })
    }
    if (purchase.status === "CANCELLED") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Purchase is already cancelled" }, { status: 400 })
    }

    await client.query(
      `UPDATE asset_purchase_details SET status = 'CANCELLED' WHERE purchase_id = $1 AND branch_id = $2`,
      [purchase_id, branchId]
    )

    await client.query("COMMIT")
    return NextResponse.json({ success: true, message: "Purchase cancelled successfully" })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Fixed Assets Purchase DELETE error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}

// PATCH — confirm purchase: create individual asset records + GL entries
export async function PATCH(request: NextRequest) {
  const c = (await cookies()).get("banker_session")
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const client = await pool.connect()

  try {
    const session      = JSON.parse(c.value)
    const branchId     = session.branch
    const userId       = session.userId
    const businessDate = session.businessDate

    const body = await request.json()
    const { purchase_id, voucher_type } = body

    if (!purchase_id) {
      return NextResponse.json({ error: "purchase_id is required" }, { status: 400 })
    }

    await client.query("BEGIN")

    // Load purchase header
    const { rows: [purchase] } = await client.query(
      `SELECT * FROM asset_purchase_details WHERE purchase_id = $1 AND branch_id = $2`,
      [purchase_id, branchId]
    )
    if (!purchase) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }
    if (purchase.batch_id) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Purchase already confirmed" }, { status: 400 })
    }

    // Load purchase line items with category GL codes
    const { rows: purchaseItems } = await client.query(
      `SELECT api.*, ai.category_id, ac.gl_account_code, ac.depreciation_gl_account_code
       FROM asset_purchase_items api
       LEFT JOIN asset_items ai ON ai.asset_id = api.asset_id AND ai.branch_id = $2
       LEFT JOIN asset_categories ac ON ac.category_id = ai.category_id
       WHERE api.purchase_id = $1`,
      [purchase_id, branchId]
    )

    // Generate batch ID
    const { rows: [batchRow] } = await client.query(
      `UPDATE gl_batch_sequences
       SET last_batch_id = last_batch_id + 1
       WHERE branch_id = $1
       RETURNING last_batch_id`,
      [branchId]
    )
    const batchId = batchRow.last_batch_id

    // Generate voucher number
    const { rows: [voucherRow] } = await client.query(
      `INSERT INTO voucher_sequences (branch_id, business_date, last_voucher_no)
       VALUES ($1, $2, 1)
       ON CONFLICT (branch_id, business_date)
       DO UPDATE SET last_voucher_no = voucher_sequences.last_voucher_no + 1
       RETURNING last_voucher_no`,
      [branchId, businessDate]
    )
    const voucherNo = voucherRow.last_voucher_no
    const vType     = voucher_type || "CASH"
    const cashGl    = vType === "TRANSFER" ? "11100000" : "23100000"
    const txnDate   = purchase.purchase_date
    const purchaseRef = String(purchase_id)  // reference id for GL lines (like account_number in borrowings)

    // Create GL batch header
    await client.query(
      `INSERT INTO gl_batches (
         business_date, branch_id, batch_id, voucher_id, voucher_type, maker_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
      [txnDate, branchId, batchId, voucherNo, vType, userId]
    )

    let assetsCreated = 0
   
    for (const item of purchaseItems) {
      const glCode    = item.gl_account_code || "24060000"
      const qty       = parseInt(item.quantity)
      const totalCost = parseFloat(item.total_cost)          // incl. SGST + CGST
      const costPerUnit = totalCost / qty                    // book value per unit (incl. tax)

      // DR: Asset GL — one line per purchase item, amount = total_cost (incl. tax)
      // This ensures SUM(DR) = purchase.total_amount = CR(Cash), keeping the batch balanced
      const itemNarration = `Asset Purchase - ${item.asset_name} x${qty}${purchase.invoice_no ? " | Inv " + purchase.invoice_no : ""}`
      console.log("Inserting GL line for item:", { glCode, purchaseRef, totalCost, itemNarration })
      await client.query(
        `INSERT INTO gl_batch_lines (
           branch_id, batch_id, business_date,
           accountcode, ref_account_id,
           debit_amount, credit_amount,
           voucher_id, narration, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
        [branchId, batchId, txnDate, glCode, purchaseRef, totalCost, voucherNo, itemNarration, userId]
      )

      // Create individual asset unit records
      const { rows: [snRow] } = await client.query(
        `SELECT COUNT(*) AS count FROM asset_items_details WHERE branch_id = $1`,
        [branchId]
      )
      let snBase = parseInt(snRow.count) + 1

      for (let i = 0; i < qty; i++) {
        // const serialNo = `FA${String(branchId).slice(-4)}${new Date(txnDate).getFullYear()}${String(snBase++).padStart(5, "0")}`
        const serialNo = `${String(branchId)}${new Date(txnDate).getFullYear()}${String(snBase++).padStart(5, "0")}`
        await client.query(
          `INSERT INTO asset_items_details
             (branch_id, asset_id, asset_name, category_id,
              serial_number, purchase_id, purchase_date, purchase_value,
              net_book_value, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,'active')`,
          [
            branchId,
            (snBase++) || null,
            item.asset_name,
            item.category_id || null,
            serialNo,
            purchase_id,
            txnDate,
            costPerUnit,
          ]
        )
        assetsCreated++
      }
    }

    // CR: Cash / Bank — single line for total amount, ref_account_id = '0'
    const cashNarration = `Asset Purchase - ${purchase.invoice_no ? "Invoice " + purchase.invoice_no : "Ref #" + purchaseRef}`
    await client.query(
      `INSERT INTO gl_batch_lines (
         branch_id, batch_id, business_date,
         accountcode, ref_account_id,
         debit_amount, credit_amount,
         voucher_id, narration, created_by
       ) VALUES ($1, $2, $3, $4, '0', 0, $5, $6, $7, $8)`,
      [branchId, batchId, txnDate, cashGl, purchase.total_amount, voucherNo, cashNarration, userId]
    )

    // Mark purchase as confirmed (batch_id set = confirmed)
    await client.query(
      `UPDATE asset_purchase_details
       SET batch_id = $1, voucher_no = $2
       WHERE purchase_id = $3 AND branch_id = $4`,
      [batchId, String(voucherNo), purchase_id, branchId]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Purchase confirmed. Individual asset records created.",
      assets_created: assetsCreated,
      voucher_no: voucherNo,
      batch_id: batchId,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Fixed Assets Purchase PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
