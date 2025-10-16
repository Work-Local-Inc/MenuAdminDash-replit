import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = updateDeliveryAreaSchema.parse(body)
    
    // Fetch existing data to merge
    const { data: existing, error: fetchError } = await supabase
      .from('delivery_areas')
      .select('*')
      .eq('id', parseInt(params.areaId))
      .eq('restaurant_id', parseInt(params.id))
      .single()
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Delivery area not found' }, { status: 404 })
    }
    
    // Merge with existing data
    const updateData = {
      name: validatedData.name ?? existing.name,
      description: validatedData.description ?? existing.description,
      delivery_fee: validatedData.delivery_fee ?? existing.delivery_fee,
      min_order: validatedData.min_order ?? existing.min_order,
      polygon: validatedData.polygon ?? existing.polygon,
      is_active: validatedData.is_active ?? existing.is_active,
    }
    
    const { data, error } = await supabase
      .from('delivery_areas')
      .update(updateData)
      .eq('id', parseInt(params.areaId))
      .eq('restaurant_id', parseInt(params.id))
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
      error: error.message || 'Failed to update delivery area' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; areaId: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('delivery_areas')
      .delete()
      .eq('id', parseInt(params.areaId))
      .eq('restaurant_id', parseInt(params.id))
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to delete delivery area' 
    }, { status: 500 })
  }
}
