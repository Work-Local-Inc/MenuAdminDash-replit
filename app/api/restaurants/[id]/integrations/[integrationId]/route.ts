import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; integrationId: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('restaurant_integrations')
      .update(body)
      .eq('id', parseInt(params.integrationId))
      .eq('restaurant_id', parseInt(params.id))
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update integration' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; integrationId: string } }
) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('restaurant_integrations')
      .delete()
      .eq('id', parseInt(params.integrationId))
      .eq('restaurant_id', parseInt(params.id))
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete integration' }, { status: 500 })
  }
}
