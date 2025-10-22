import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const linkChildrenSchema = z.object({
  parent_restaurant_id: z.number().int().positive(),
  restaurant_id: z.number().int().positive().optional(),
  child_restaurant_ids: z.array(z.number().int().positive()).optional(),
}).refine(
  (data) => data.restaurant_id !== undefined || data.child_restaurant_ids !== undefined,
  { message: "Either restaurant_id or child_restaurant_ids must be provided" }
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = linkChildrenSchema.parse(body)
    
    const requestBody: any = {
      parent_restaurant_id: validatedData.parent_restaurant_id,
      updated_by: user.id
    }
    
    if (validatedData.restaurant_id) {
      requestBody.restaurant_id = validatedData.restaurant_id
    } else if (validatedData.child_restaurant_ids) {
      requestBody.child_restaurant_ids = validatedData.child_restaurant_ids
    }
    
    const { data, error } = await supabase.functions.invoke('convert-restaurant-to-franchise', {
      body: requestBody
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
      error: error.message || 'Failed to link restaurants to franchise' 
    }, { status: 500 })
  }
}
