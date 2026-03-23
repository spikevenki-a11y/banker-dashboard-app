import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const accountNumber = request.nextUrl.searchParams.get('account_number')

    if (!accountNumber) {
      return NextResponse.json(
        { error: 'account_number is required' },
        { status: 400 }
      )
    }

    const { data: transactions, error } = await supabase
      .from('income_transactions')
      .select('*')
      .eq('account_number', accountNumber)
      .order('transaction_date', { ascending: false })

    if (error) throw error

    return NextResponse.json(transactions)
  } catch (error: any) {
    console.error('Error fetching income transactions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch income transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      account_number,
      transaction_date,
      voucher_type,
      description,
      debit_amount,
      credit_amount,
      reference_no,
      branch_id,
    } = body

    if (!account_number || !transaction_date || !voucher_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get current account balance
    const { data: account, error: accountError } = await supabase
      .from('income_accounts')
      .select('current_balance')
      .eq('account_number', account_number)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Calculate new running balance
    const currentBalance = account.current_balance || 0
    let newBalance = currentBalance

    if (voucher_type === 'CREDIT') {
      newBalance = currentBalance + (credit_amount || 0)
    } else if (voucher_type === 'DEBIT') {
      newBalance = currentBalance - (debit_amount || 0)
    }

    // Create transaction
    const { data: transaction, error: transError } = await supabase
      .from('income_transactions')
      .insert([
        {
          account_number,
          transaction_date,
          voucher_type,
          description,
          debit_amount: debit_amount || 0,
          credit_amount: credit_amount || 0,
          running_balance: newBalance,
          reference_no,
          branch_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select()
      .single()

    if (transError) throw transError

    // Update account balance
    const { error: updateError } = await supabase
      .from('income_accounts')
      .update({ current_balance: newBalance })
      .eq('account_number', account_number)

    if (updateError) throw updateError

    return NextResponse.json(transaction, { status: 201 })
  } catch (error: any) {
    console.error('Error creating income transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create income transaction' },
      { status: 500 }
    )
  }
}
