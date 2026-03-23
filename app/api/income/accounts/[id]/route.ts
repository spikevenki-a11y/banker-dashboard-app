import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const accountNumber = params.id

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('income_accounts')
      .select('*')
      .eq('account_number', accountNumber)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get GL account details
    const { data: glAccount, error: glError } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('accountcode', account.gl_account_code)
      .single()

    if (glError) console.warn('GL account details not available:', glError)

    return NextResponse.json({
      ...account,
      gl_account: glAccount || null,
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
