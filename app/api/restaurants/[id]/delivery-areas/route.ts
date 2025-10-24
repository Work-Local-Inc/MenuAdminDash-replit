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
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .schema('menuca_v3').from('restaurant_delivery_zones')
      .select('id, restaurant_id, zone_name, delivery_fee_cents, minimum_order_cents, estimated_delivery_minutes, zone_geometry, is_active, created_at')
      .eq('restaurant_id', parseInt(params.id))
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    const transformed = (data || []).map(zone => ({
      id: zone.id,
      restaurant_id: zone.restaurant_id,
      name: zone.zone_name,
      description: null,
      delivery_fee: zone.delivery_fee_cents / 100,
      min_order: zone.minimum_order_cents !== null ? zone.minimum_order_cents / 100 : null,
      polygon: zone.zone_geometry,
      is_active: zone.is_active,
      created_at: zone.created_at
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
    const supabase = createAdminClient()
    
    const body = await request.json()
    const validatedData = deliveryAreaSchema.parse(body)
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .schema('menuca_v3').from('restaurant_delivery_zones')
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
