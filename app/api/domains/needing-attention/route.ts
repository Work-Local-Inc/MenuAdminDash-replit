import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const supabase = createAdminClient()

    // Get domains needing attention from view (priority-sorted)
    const { data, error } = await supabase
      .schema('menuca_v3').from('v_domains_needing_attention')
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[Domains Needing Attention] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
