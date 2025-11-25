import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const deliveryAreaSchema = z.object({
  name: z.string().min(1, "Area name is required").max(100),
  description: z.string().optional(),
  delivery_fee: z.number().min(0, "Delivery fee must be positive"),
  min_order: z.number().min(0, "Minimum order must be positive").optional(),
  polygon: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
  is_active: z.boolean().optional().default(true),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()
    
    // Try restaurant_delivery_zones first
    const { data: zonesData, error: zonesError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_zones')
      .select('id, restaurant_id, zone_name, delivery_fee_cents, minimum_order_cents, estimated_delivery_minutes, zone_geometry, is_active, created_at')
      .eq('restaurant_id', parseInt(params.id))
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    
    console.log('[DELIVERY AREAS API] Restaurant ID:', params.id)
    console.log('[DELIVERY AREAS API] Zones table:', { count: zonesData?.length || 0, error: zonesError?.message })
    
    // Try restaurant_delivery_areas as fallback (no deleted_at column in this table)
    const { data: areasData, error: areasError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('*')
      .eq('restaurant_id', parseInt(params.id))
      .order('created_at', { ascending: false })
    
    console.log('[DELIVERY AREAS API] Areas table:', { count: areasData?.length || 0, error: areasError?.message })
    console.log('[DELIVERY AREAS API] Areas sample:', JSON.stringify(areasData?.[0], null, 2))
    console.log('[DELIVERY AREAS API] Areas columns:', areasData?.[0] ? Object.keys(areasData[0]) : 'no data')
    
    // Determine which table has data and which schema to use
    const useZonesTable = (zonesData?.length || 0) > 0
    const useAreasTable = !useZonesTable && (areasData?.length || 0) > 0
    
    console.log('[DELIVERY AREAS API] Using table:', useZonesTable ? 'zones' : useAreasTable ? 'areas' : 'none')
    
    if (zonesError && areasError) {
      throw new Error(`Both tables failed: zones=${zonesError.message}, areas=${areasError.message}`)
    }
    
    let transformed: any[] = []
    
    if (useZonesTable && zonesData) {
      // Transform from restaurant_delivery_zones schema
      transformed = zonesData.map(zone => ({
        id: zone.id,
        restaurant_id: zone.restaurant_id,
        name: zone.zone_name,
        description: null,
        delivery_fee: (zone.delivery_fee_cents || 0) / 100,
        min_order: zone.minimum_order_cents !== null ? zone.minimum_order_cents / 100 : null,
        polygon: zone.zone_geometry,
        is_active: zone.is_active ?? true,
        created_at: zone.created_at
      }))
    } else if (useAreasTable && areasData) {
      // Transform from restaurant_delivery_areas schema
      // Actual columns: id, uuid, restaurant_id, area_number, area_name, display_name, 
      // fee_type, delivery_fee, conditional_fee, conditional_threshold, min_order_value,
      // is_complex, coordinates, geometry, notes, is_active, created_at, etc.
      transformed = areasData.map((area: any) => ({
        id: area.id,
        restaurant_id: area.restaurant_id,
        name: area.display_name || area.area_name || `Delivery Zone ${area.area_number || area.id}`,
        description: area.notes || null,
        // delivery_fee is already in dollars (not cents)
        delivery_fee: area.delivery_fee || 0,
        min_order: area.min_order_value || null,
        // geometry column contains the polygon data
        polygon: area.geometry || null,
        is_active: area.is_active ?? true,
        created_at: area.created_at
      }))
    }
    
    return NextResponse.json(transformed)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch delivery areas' 
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()
    
    const body = await request.json()
    const validatedData = deliveryAreaSchema.parse(body)
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_zones')
      .insert({
        restaurant_id: parseInt(params.id),
        zone_name: validatedData.name,
        zone_geometry: validatedData.polygon,
        delivery_fee_cents: Math.round(validatedData.delivery_fee * 100),
        minimum_order_cents: validatedData.min_order !== undefined ? Math.round(validatedData.min_order * 100) : null,
        estimated_delivery_minutes: 30,
        is_active: validatedData.is_active ?? true,
      })
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
      error: error.message || 'Failed to create delivery area' 
    }, { status: 500 })
  }
}
