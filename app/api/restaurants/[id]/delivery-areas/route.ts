import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Query delivery areas with PostGIS geometry converted to GeoJSON
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('id, restaurant_id, name, description, delivery_fee, min_order, is_active, created_at, polygon')
      .eq('restaurant_id', parseInt(params.id))
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
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
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = deliveryAreaSchema.parse(body)
    
    // Insert with PostGIS geometry
    const { data, error } = await supabase
      .from('delivery_areas')
      .insert({
        restaurant_id: parseInt(params.id),
        name: validatedData.name,
        description: validatedData.description || null,
        delivery_fee: validatedData.delivery_fee,
        min_order: validatedData.min_order || null,
        polygon: validatedData.polygon,
        is_active: validatedData.is_active ?? true,
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
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
