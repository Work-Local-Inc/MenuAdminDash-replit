import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('v_franchise_chains')
      .select('*')
      .order('location_count', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch franchise chains' 
    }, { status: 500 })
  }
}
