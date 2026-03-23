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

    // Get all income ledger accounts (head code 30000000)
    // Income head is typically code 30000000, we'll fetch accounts under this head
    const { data: incomeAccounts, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('branch_id', parseInt(branch_id))
      .eq('isledger', 1)
      // Filter for Income accounts - they typically start with 30 or have parentaccountcode for income head
      .or(`accountcode.gte.30000000,accountcode.lt.40000000`)
      .order('accountname', { ascending: true })

    if (error) throw error

    return NextResponse.json(incomeAccounts)
  } catch (error: any) {
    console.error('Error fetching income ledger accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch income ledger accounts' },
      { status: 500 }
    )
  }
}
