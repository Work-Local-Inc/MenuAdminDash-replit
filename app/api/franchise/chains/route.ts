import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .schema('menuca_v3').from('v_franchise_chains')
      .select('*')
      .order('location_count', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch franchise chains' 
    }, { status: 500 })
  }
}
