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
    const { user } = await verifyAdminAuth(request)
    const supabase = createAdminClient()
    const restaurantId = parseInt(params.id)
    const areaId = parseInt(params.areaId)
    
    const body = await request.json()
    const validatedData = updateDeliveryAreaSchema.parse(body)
    
    // Check if this area exists in the legacy table first
    const { data: legacyArea } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('id')
      .eq('id', areaId)
      .eq('restaurant_id', restaurantId)
      .single()
    
    const useLegacyTable = !!legacyArea
    console.log('[DELIVERY AREAS API] PUT - Using table:', useLegacyTable ? 'areas (legacy)' : 'zones')
    
    let transformed: any
    
    if (useLegacyTable) {
      // Update in restaurant_delivery_areas (legacy)
      const updateData: any = {}
      if (validatedData.name !== undefined) {
        updateData.area_name = validatedData.name
        updateData.display_name = validatedData.name
      }
      if (validatedData.delivery_fee !== undefined) updateData.delivery_fee = validatedData.delivery_fee
      if (validatedData.min_order !== undefined) updateData.min_order_value = validatedData.min_order
      if (validatedData.polygon !== undefined) updateData.geometry = validatedData.polygon
      if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active
      if (validatedData.description !== undefined) updateData.notes = validatedData.description
      
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
        throw error
      }
      
      transformed = {
        id: data.id,
        restaurant_id: data.restaurant_id,
        name: data.display_name || data.area_name,
        description: data.notes,
        delivery_fee: data.delivery_fee || 0,
        min_order: data.min_order_value,
        polygon: data.geometry,
        is_active: data.is_active,
        created_at: data.created_at
      }
    } else {
      // Update in restaurant_delivery_zones
      const { data: existing, error: fetchError } = await supabase
        .schema('menuca_v3')
        .from('restaurant_delivery_zones')
        .select('*')
        .eq('id', areaId)
        .eq('restaurant_id', restaurantId)
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
        .from('restaurant_delivery_zones')
        .update(updateData)
        .eq('id', areaId)
        .eq('restaurant_id', restaurantId)
        .select()
        .single()
      
      if (error) {
        console.error('[DELIVERY AREAS API] PUT error:', error)
        throw error
      }
      
      transformed = {
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
    const { user } = await verifyAdminAuth(request)
    const supabase = createAdminClient()
    const restaurantId = parseInt(params.id)
    const areaId = parseInt(params.areaId)
    
    // Check if this area exists in the legacy table first
    const { data: legacyArea } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('id')
      .eq('id', areaId)
      .eq('restaurant_id', restaurantId)
      .single()
    
    const useLegacyTable = !!legacyArea
    console.log('[DELIVERY AREAS API] DELETE - Using table:', useLegacyTable ? 'areas (legacy)' : 'zones')
    
    if (useLegacyTable) {
      // Soft delete not available, do hard delete from restaurant_delivery_areas
      const { error } = await supabase
        .schema('menuca_v3')
        .from('restaurant_delivery_areas')
        .delete()
        .eq('id', areaId)
        .eq('restaurant_id', restaurantId)
      
      if (error) {
        console.error('[DELIVERY AREAS API] DELETE error:', error)
        throw error
      }
      
      return NextResponse.json({ success: true, message: 'Delivery area deleted' })
    } else {
      // Use the edge function for restaurant_delivery_zones (soft delete)
      let reason = 'Deleted by admin'
      try {
        const body = await request.json()
        if (body.reason) {
          reason = body.reason
        }
      } catch {
        // No body - use default reason
      }
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables')
      }
      
      const url = new URL(`${supabaseUrl}/functions/v1/delete-delivery-zone`)
      url.searchParams.set('zone_id', params.areaId)
      url.searchParams.set('reason', reason)
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete delivery zone' }))
        return NextResponse.json({ 
          error: error.message || 'Failed to delete delivery zone' 
        }, { status: response.status })
      }
      
      const data = await response.json()
      
      if (!data?.success) {
        return NextResponse.json({ 
          error: data?.message || 'Failed to delete delivery zone' 
        }, { status: 400 })
      }
      
      return NextResponse.json(data)
    }
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to delete delivery area' 
    }, { status: 500 })
  }
}
