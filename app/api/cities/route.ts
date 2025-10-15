import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get province_id from query params if provided
    const { searchParams } = new URL(request.url)
    const provinceId = searchParams.get('province_id')
    
    let query = supabase
      .from('cities')
      .select('*')
      .order('name', { ascending: true })
    
    if (provinceId) {
      query = query.eq('province_id', provinceId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
