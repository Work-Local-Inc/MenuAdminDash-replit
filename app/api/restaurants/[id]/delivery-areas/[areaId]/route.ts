import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'

const updateDeliveryAreaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  delivery_fee: z.number().min(0).optional(),
  min_order: z.number().min(0).optional(),
  polygon: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }).optional(),
  is_active: z.boolean().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; areaId: string } }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    
    const body = await request.json()
    const validatedData = updateDeliveryAreaSchema.parse(body)
    
    const { data: existing, error: fetchError } = await supabase
      .schema('menuca_v3')
      .schema('menuca_v3').from('restaurant_delivery_zones')
      .select('*')
      .eq('id', parseInt(params.areaId))
      .eq('restaurant_id', parseInt(params.id))
      .is('deleted_at', null)
      .single()
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Delivery area not found' }, { status: 404 })
    }
    
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.zone_name = validatedData.name
    if (validatedData.delivery_fee !== undefined) updateData.delivery_fee_cents = Math.round(validatedData.delivery_fee * 100)
    if (validatedData.min_order !== undefined) updateData.minimum_order_cents = Math.round(validatedData.min_order * 100)
    if (validatedData.polygon !== undefined) updateData.zone_geometry = validatedData.polygon
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .schema('menuca_v3').from('restaurant_delivery_zones')
      .update(updateData)
      .eq('id', parseInt(params.areaId))
      .eq('restaurant_id', parseInt(params.id))
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    const transformed = {
      id: data.id,
      restaurant_id: data.restaurant_id,
      name: data.zone_name,
      description: null,
      delivery_fee: data.delivery_fee_cents / 100,
      min_order: data.minimum_order_cents !== null ? data.minimum_order_cents / 100 : null,
      polygon: data.zone_geometry,
      is_active: data.is_active,
      created_at: data.created_at
    }
    
    return NextResponse.json(transformed)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to update delivery area' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; areaId: string } }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .schema('menuca_v3')
      .schema('menuca_v3').from('restaurant_delivery_zones')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parseInt(params.areaId))
      .eq('restaurant_id', parseInt(params.id))
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to delete delivery area' 
    }, { status: 500 })
  }
}
