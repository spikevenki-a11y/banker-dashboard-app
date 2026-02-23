import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import pool from "@/lib/connection/db"

function getSession() {
  return cookies().then((c) => {
    const raw = c.get("banker_session")
    if (!raw) return null
    try {
      return JSON.parse(raw.value)
    } catch {
      return null
    }
  })
}

// GET: Fetch all chart of accounts for the branch
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const branchId = session.branch

  try {
    const { rows } = await pool.query(
      `SELECT branch_id, accountcode, accountname, accounttypecode,
              isledger, parentaccountcode, accountbalance, isactive,
              createddate, modifieddate
       FROM chart_of_accounts
       WHERE branch_id = $1
       ORDER BY accountcode ASC`,
      [branchId]
    )

    // Map account type codes to labels
    const typeLabels: Record<number, string> = {
      1: "Liabilities",
      2: "Assets",
      3: "Income",
      4: "Expenses",
      5: "Profit & Loss",
    }

    const accounts = rows.map((r: any) => ({
      branchId: r.branch_id,
      accountCode: Number(r.accountcode),
      accountName: r.accountname,
      accountTypeCode: r.accounttypecode,
      accountTypeLabel: typeLabels[r.accounttypecode] || `Type ${r.accounttypecode}`,
      isLedger: r.isledger?.[0] === 1 || r.isledger === true || r.isledger === "1",
      parentAccountCode: Number(r.parentaccountcode),
      accountBalance: Number(r.accountbalance),
      isActive: r.isactive?.[0] === 1 || r.isactive === true || r.isactive === "1",
      createdDate: r.createddate,
      modifiedDate: r.modifieddate,
    }))

    return NextResponse.json({ success: true, accounts })
  } catch (error: any) {
    console.error("Error fetching chart of accounts:", error)
    return NextResponse.json({ error: "Failed to fetch chart of accounts" }, { status: 500 })
  }
}

// POST: Create a new account
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const branchId = session.branch

  try {
    const body = await req.json()
    const { accountCode, accountName, accountTypeCode, isLedger, parentAccountCode } = body

    if (!accountCode || !accountName || !accountTypeCode) {
      return NextResponse.json({ error: "Account code, name, and type are required" }, { status: 400 })
    }

    // Check for duplicate
    const existing = await pool.query(
      `SELECT accountcode FROM chart_of_accounts WHERE branch_id = $1 AND accountcode = $2`,
      [branchId, accountCode]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Account code already exists for this branch" }, { status: 409 })
    }

    const { rows } = await pool.query(
      `INSERT INTO chart_of_accounts
        (branch_id, accountcode, accountname, accounttypecode, isledger, parentaccountcode, accountbalance, isactive, createddate, modifieddate)
       VALUES ($1, $2, $3, $4, $5, $6, 0, b'1', now(), now())
       RETURNING *`,
      [
        branchId,
        accountCode,
        accountName,
        accountTypeCode,
        isLedger ? "1" : "0",
        parentAccountCode || 0,
      ]
    )

    return NextResponse.json({ success: true, account: rows[0] })
  } catch (error: any) {
    console.error("Error creating account:", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}

// PUT: Update an existing account
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const branchId = session.branch

  try {
    const body = await req.json()
    const { accountCode, accountName, accountTypeCode, isLedger, parentAccountCode, isActive } = body

    if (!accountCode) {
      return NextResponse.json({ error: "Account code is required" }, { status: 400 })
    }

    const setClauses: string[] = []
    const values: any[] = []
    let paramIdx = 1

    if (accountName !== undefined) {
      setClauses.push(`accountname = $${paramIdx}`)
      values.push(accountName)
      paramIdx++
    }
    if (accountTypeCode !== undefined) {
      setClauses.push(`accounttypecode = $${paramIdx}`)
      values.push(accountTypeCode)
      paramIdx++
    }
    if (isLedger !== undefined) {
      setClauses.push(`isledger = $${paramIdx}`)
      values.push(isLedger ? "1" : "0")
      paramIdx++
    }
    if (parentAccountCode !== undefined) {
      setClauses.push(`parentaccountcode = $${paramIdx}`)
      values.push(parentAccountCode)
      paramIdx++
    }
    if (isActive !== undefined) {
      setClauses.push(`isactive = $${paramIdx}`)
      values.push(isActive ? "1" : "0")
      paramIdx++
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    setClauses.push(`modifieddate = now()`)
    values.push(accountCode, branchId)

    const query = `UPDATE chart_of_accounts SET ${setClauses.join(", ")} WHERE accountcode = $${paramIdx} AND branch_id = $${paramIdx + 1} RETURNING *`
    const { rows } = await pool.query(query, values)

    if (rows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, account: rows[0] })
  } catch (error: any) {
    console.error("Error updating account:", error)
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
  }
}
