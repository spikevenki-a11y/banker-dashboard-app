import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const branch_id = request.nextUrl.searchParams.get('branch_id')

    if (!branch_id) {
      return NextResponse.json(
        { error: 'branch_id is required' },
        { status: 400 }
      )
    }

    const { data: accounts, error } = await supabase
      .from('income_accounts')
      .select('*')
      .eq('branch_id', parseInt(branch_id))
      .eq('account_status', 'ACTIVE')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('Error fetching income accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch income accounts' },
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
      account_name,
      gl_account_code,
      opening_balance,
      description,
      branch_id,
    } = body

    if (!account_number || !account_name || !gl_account_code || !branch_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if account number already exists
    const { data: existingAccount } = await supabase
      .from('income_accounts')
      .select('id')
      .eq('account_number', account_number)
      .single()

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account number already exists' },
        { status: 400 }
      )
    }

    const { data: newAccount, error } = await supabase
      .from('income_accounts')
      .insert([
        {
          account_number,
          account_name,
          gl_account_code,
          opening_balance: opening_balance || 0,
          current_balance: opening_balance || 0,
          description,
          branch_id,
          account_status: 'ACTIVE',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(newAccount, { status: 201 })
  } catch (error: any) {
    console.error('Error creating income account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create income account' },
      { status: 500 }
    )
  }
}
