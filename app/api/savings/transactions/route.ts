import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/connection/db"
import { getSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountNumber = searchParams.get("account")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!accountNumber) {
      return NextResponse.json({ error: "Account number is required" }, { status: 400 })
    }

    const { rows: transactions } = await pool.query(
      `SELECT * FROM savings_transactions 
       WHERE account_number = $1 
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountNumber, limit, offset]
    )

    const { rows: countResult } = await pool.query(
      `SELECT COUNT(*) as total FROM savings_transactions WHERE account_number = $1`,
      [accountNumber]
    )

    return NextResponse.json({
      transactions,
      total: parseInt(countResult[0]?.total || "0"),
    })
  } catch (error) {
    console.error("Failed to fetch transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { accountNumber, transactionType, amount, description, referenceNumber } = body

    if (!accountNumber || !transactionType || !amount) {
      return NextResponse.json(
        { error: "Account number, transaction type, and amount are required" },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      // Get current account details
      const { rows: accounts } = await client.query(
        `SELECT * FROM savings_accounts WHERE account_number = $1`,
        [accountNumber]
      )

      if (accounts.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }

      const account = accounts[0]

      if (account.status !== "active") {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Account is not active" }, { status: 400 })
      }

      let newBalance: number
      const currentBalance = parseFloat(account.current_balance)

      if (transactionType === "deposit") {
        newBalance = currentBalance + parseFloat(amount)
      } else if (transactionType === "withdrawal") {
        if (currentBalance < parseFloat(amount)) {
          await client.query("ROLLBACK")
          return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
        }
        newBalance = currentBalance - parseFloat(amount)
      } else {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Invalid transaction type. Use 'deposit' or 'withdrawal'" }, { status: 400 })
      }

      // Insert transaction record
      const { rows: txn } = await client.query(
        `INSERT INTO savings_transactions 
         (account_number, transaction_type, amount, balance_after, description, reference_number, performed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          accountNumber,
          transactionType,
          amount,
          newBalance,
          description || (transactionType === "deposit" ? "Cash Deposit" : "Cash Withdrawal"),
          referenceNumber || null,
          session.username || "system",
        ]
      )

      // Update the account balance
      await client.query(
        `UPDATE savings_accounts 
         SET current_balance = $1, last_transaction_date = NOW(), updated_at = NOW()
         WHERE account_number = $2`,
        [newBalance, accountNumber]
      )

      await client.query("COMMIT")

      return NextResponse.json({
        transaction: txn[0],
        newBalance,
        message: `${transactionType === "deposit" ? "Deposit" : "Withdrawal"} of ${amount} successful`,
      })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Failed to process transaction:", error)
    return NextResponse.json({ error: "Failed to process transaction" }, { status: 500 })
  }
}
