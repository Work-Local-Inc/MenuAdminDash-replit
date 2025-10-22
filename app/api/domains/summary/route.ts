import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get verification summary from view
    const { data, error } = await supabase
      .from('v_domain_verification_summary')
      .select('*')
      .single()

    if (error) {
      console.error('[Domains Summary] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Domains Summary] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
