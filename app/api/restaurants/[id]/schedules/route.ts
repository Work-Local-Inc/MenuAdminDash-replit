import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('restaurant_schedules')
      .select('*')
      .eq('restaurant_id', params.id)
      .order('type', { ascending: true })
      .order('day_start', { ascending: true })
    
    if (error) throw error
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Remove restaurant_id from body if present, use params.id instead
    const { restaurant_id, ...scheduleData } = body
    
    const { data, error } = await supabase
      .from('restaurant_schedules')
      .insert({
        ...scheduleData,
        restaurant_id: parseInt(params.id),
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
