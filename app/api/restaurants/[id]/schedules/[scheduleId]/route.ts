import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('restaurant_schedules')
      .update(body)
      .eq('id', params.scheduleId)
      .eq('restaurant_id', params.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('restaurant_schedules')
      .delete()
      .eq('id', params.scheduleId)
      .eq('restaurant_id', params.id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
