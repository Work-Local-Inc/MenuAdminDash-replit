import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bulkFeatureSchema = z.object({
  parent_restaurant_id: z.number().int().positive(),
  feature_key: z.enum([
    'online_ordering',
    'delivery',
    'pickup',
    'loyalty_program',
    'reservations',
    'gift_cards',
    'catering',
    'table_booking'
  ]),
  is_enabled: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = bulkFeatureSchema.parse(body)
    
    const { data, error } = await supabase.functions.invoke('bulk-update-franchise-feature', {
      body: {
        parent_restaurant_id: validatedData.parent_restaurant_id,
        feature_key: validatedData.feature_key,
        is_enabled: validatedData.is_enabled,
        updated_by: user.id
      }
    })
    
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
      error: error.message || 'Failed to update franchise feature' 
    }, { status: 500 })
  }
}
