import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = params.id
    
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    
    const { data, error } = await supabase
      .from('restaurant_twilio_config')
      .select('*')
      .eq('restaurant_id', params.id)
      .maybeSingle()
    
    if (error) throw error
    
    return NextResponse.json(data || { phone: null, enables_calls: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = params.id
    
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    const body = await request.json()
    
    const { data: existing } = await supabase
      .from('restaurant_twilio_config')
      .select('id')
      .eq('restaurant_id', parseInt(params.id))
      .maybeSingle()
    
    const configData = {
      restaurant_id: parseInt(params.id),
      phone: body.phone || null,
      enables_calls: body.enables_calls ?? true,
    }
    
    let result
    if (existing) {
      const { data, error } = await supabase
        .from('restaurant_twilio_config')
        .update({ phone: configData.phone, enables_calls: configData.enables_calls })
        .eq('restaurant_id', parseInt(params.id))
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('restaurant_twilio_config')
        .insert(configData)
        .select()
        .single()
      
      if (error) throw error
      result = data
    }
    
    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[TwilioConfig] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
