import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
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
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = parseInt(params.id)

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const supabase = createAdminClient() as any
    
    // Query restaurant_delivery_areas table (the only delivery zones table per entity docs)
    // Columns: id, uuid, restaurant_id, area_number, area_name, delivery_fee, 
    // delivery_min_order, geometry, is_active, created_at, etc.
    const { data: areasData, error: areasError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('*')
      .eq('restaurant_id', parseInt(params.id))
      .is('deleted_at', null)
      .order('area_number', { ascending: true })
    
    console.log('[DELIVERY AREAS API] Restaurant ID:', params.id)
    console.log('[DELIVERY AREAS API] Areas found:', areasData?.length || 0)
    
    if (areasError) {
      console.error('[DELIVERY AREAS API] Query error:', areasError)
      throw new Error(areasError.message)
    }
    
    // Transform from restaurant_delivery_areas schema to frontend format
    const transformed = (areasData || []).map((area: any) => ({
      id: area.id,
      restaurant_id: area.restaurant_id,
      name: area.area_name || `Delivery Zone ${area.area_number || area.id}`,
      description: area.notes || null,
      delivery_fee: area.delivery_fee || 0,
      min_order: area.delivery_min_order || null,
      polygon: area.geometry || null,
      is_active: area.is_active ?? true,
      created_at: area.created_at
    }))
    
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
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = parseInt(params.id)

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const supabase = createAdminClient() as any
    
    const body = await request.json()
    const validatedData = deliveryAreaSchema.parse(body)
    
    // Get max area_number for this restaurant to assign next sequence
    const { data: maxArea } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('area_number')
      .eq('restaurant_id', restaurantId)
      .order('area_number', { ascending: false })
      .limit(1)
    
    const nextAreaNumber = (maxArea?.[0]?.area_number || 0) + 1
    console.log('[DELIVERY AREAS API] POST - Creating area #', nextAreaNumber, 'for restaurant', restaurantId)
    
    // Insert into restaurant_delivery_areas (per entity docs, this is the delivery zones table)
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .insert({
        restaurant_id: restaurantId,
        area_number: nextAreaNumber,
        area_name: validatedData.name,
        geometry: validatedData.polygon,
        delivery_fee: validatedData.delivery_fee,
        delivery_min_order: validatedData.min_order || null,
        is_active: validatedData.is_active ?? true,
      })
      .select()
      .single()
    
    if (error) {
      console.error('[DELIVERY AREAS API] POST error:', error)
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
    console.error('[DELIVERY AREAS API] POST failed:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create delivery area' 
    }, { status: 500 })
  }
}
