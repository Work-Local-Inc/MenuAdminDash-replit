import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
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
    const { adminUser } = await verifyAdminAuth(request)
    const supabase = createAdminClient() as any
    const restaurantId = parseInt(params.id)
    const areaId = parseInt(params.areaId)
    
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const body = await request.json()
    const validatedData = updateDeliveryAreaSchema.parse(body)
    
    // Build update data for restaurant_delivery_areas table
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.area_name = validatedData.name
    if (validatedData.delivery_fee !== undefined) updateData.delivery_fee = validatedData.delivery_fee
    if (validatedData.min_order !== undefined) updateData.delivery_min_order = validatedData.min_order
    if (validatedData.polygon !== undefined) updateData.geometry = validatedData.polygon
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active
    
    console.log('[DELIVERY AREAS API] PUT - Updating area', areaId, 'for restaurant', restaurantId)
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .update(updateData)
      .eq('id', areaId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single()
    
    if (error) {
      console.error('[DELIVERY AREAS API] PUT error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Delivery area not found' }, { status: 404 })
      }
      throw error
    }
    
    const transformed = {
      id: data.id,
      restaurant_id: data.restaurant_id,
      name: data.area_name,
      description: null,
      delivery_fee: data.delivery_fee || 0,
      min_order: data.delivery_min_order,
      polygon: data.geometry,
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
    const { adminUser } = await verifyAdminAuth(request)
    const supabase = createAdminClient() as any
    const restaurantId = parseInt(params.id)
    const areaId = parseInt(params.areaId)
    
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    console.log('[DELIVERY AREAS API] DELETE - Removing area', areaId, 'for restaurant', restaurantId)
    
    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', areaId)
      .eq('restaurant_id', restaurantId)
    
    if (error) {
      console.error('[DELIVERY AREAS API] DELETE error:', error)
      throw error
    }
    
    return NextResponse.json({ success: true, message: 'Delivery area deleted' })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to delete delivery area' 
    }, { status: 500 })
  }
}
