import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get domains needing attention from view (priority-sorted)
    const { data, error } = await supabase
      .from('v_domains_needing_attention')
      .select('*')
      .order('priority_score', { ascending: false })
      .order('days_until_ssl_expires', { ascending: true })
      .limit(50)

    if (error) {
      console.error('[Domains Needing Attention] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[Domains Needing Attention] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
