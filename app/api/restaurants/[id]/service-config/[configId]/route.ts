import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; configId: string } }
) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('restaurant_service_configs')
      .update(body)
      .eq('id', parseInt(params.configId))
      .eq('restaurant_id', parseInt(params.id))
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
  { params }: { params: { id: string; configId: string } }
) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('restaurant_service_configs')
      .delete()
      .eq('id', parseInt(params.configId))
      .eq('restaurant_id', parseInt(params.id))
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
