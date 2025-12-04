import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; configId: string } }
) {
  try {
    const supabase = createAdminClient() as any
    const body = await request.json()
    
    // Only include columns that exist in the database
    // Note: closing_warning_min does NOT exist in production DB
    const updateData: Record<string, any> = {}
    const allowedColumns = [
      'has_delivery_enabled',
      'pickup_enabled', 
      'distance_based_delivery_fee',
      'takeout_time_minutes',
      'twilio_call',
      'accepts_tips'
    ]
    
    for (const column of allowedColumns) {
      if (column in body) {
        updateData[column] = body[column]
      }
    }
    
    console.log('[ServiceConfig PATCH] Updating config:', updateData)
    
    const { data, error } = await supabase
      .from('delivery_and_pickup_configs')
      .update(updateData)
      .eq('id', parseInt(params.configId))
      .eq('restaurant_id', parseInt(params.id))
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
  { params }: { params: { id: string; configId: string } }
) {
  try {
    const supabase = createAdminClient() as any
    
    const { error } = await supabase
      .from('delivery_and_pickup_configs')
      .delete()
      .eq('id', parseInt(params.configId))
      .eq('restaurant_id', parseInt(params.id))
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
