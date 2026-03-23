import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import pool from "@/lib/connection/db"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      
      const c = (await cookies()).get("banker_session")
      if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      const session = JSON.parse(c.value)
      const branchId = session.branch
      const userId = session.userId

    
    const { id } = await params;
    const accountNumber = id
    console.log("Fetching details for account number:", accountNumber)


    // Fetch account details
    const account_details = await pool.query(
      `SELECT * FROM income_accounts 
        WHERE 
         branch_id = $1
         and account_number = $2`,
        [branchId, accountNumber]
    )
    const account_data = account_details.rows[0]
    console.log("Fetched account data:", account_data)
    if (!account_data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    
    // Fetch GL account details
    const gl_account_details = await pool.query(
      `SELECT * FROM chart_of_accounts 
        WHERE 
         branch_id = $1
         and accountcode = $2`,
        [branchId, account_data.gl_account_code]
    )
    const gl_account_data = gl_account_details.rows[0]

    return NextResponse.json({
      ...account_data,
      gl_account: gl_account_data || null,
    })

  } catch (error: any) {
    console.error('Error fetching income account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch income account' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const accountNumber = params.id
    const body = await request.json()

    const { data: updatedAccount, error } = await supabase
      .from('income_accounts')
      .update(body)
      .eq('account_number', accountNumber)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updatedAccount)
  } catch (error: any) {
    console.error('Error updating income account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update income account' },
      { status: 500 }
    )
  }
}
