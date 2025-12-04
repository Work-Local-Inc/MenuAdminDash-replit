import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient() as any
    const body = await request.json()
    
    // Only include columns that exist in the database
    // Note: 'notes' column does NOT exist in production DB
    const updateData: Record<string, any> = {}
    
    const allowedColumns = [
      'type',
      'day_start',
      'day_stop', 
      'time_start',
      'time_stop',
      'is_enabled'
    ]
    
    for (const column of allowedColumns) {
      if (column in body) {
        updateData[column] = body[column]
      }
    }
    
    console.log('[Schedules PATCH] Updating schedule:', updateData)
    
    const { data, error } = await supabase
      .from('restaurant_schedules')
      .update(updateData)
      .eq('id', params.scheduleId)
      .eq('restaurant_id', params.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient() as any
    
    const { error } = await supabase
      .from('restaurant_schedules')
      .delete()
      .eq('id', params.scheduleId)
      .eq('restaurant_id', params.id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
