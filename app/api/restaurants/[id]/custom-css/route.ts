import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'

const customCssSchema = z.object({
  css_code: z.string().max(10000, "CSS code must be under 10,000 characters"),
  is_enabled: z.boolean().optional(),
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
      .schema('menuca_v3').from('restaurant_custom_css')
      .select('*')
      .eq('restaurant_id', parseInt(params.id))
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }
    
    // Return empty object if no custom CSS exists yet
    return NextResponse.json(data || { 
      restaurant_id: parseInt(params.id),
      css_code: '',
      is_enabled: false,
      updated_at: null
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch custom CSS' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    
    const body = await request.json()
    const validatedData = customCssSchema.parse(body)
    
    // Check if record exists
    const { data: existing } = await supabase
      .schema('menuca_v3').from('restaurant_custom_css')
      .select('id')
      .eq('restaurant_id', parseInt(params.id))
      .single()
    
    let result
    
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .schema('menuca_v3').from('restaurant_custom_css')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('restaurant_id', parseInt(params.id))
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // Insert new record
      const { data, error } = await supabase
        .schema('menuca_v3').from('restaurant_custom_css')
        .insert({
          restaurant_id: parseInt(params.id),
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (error) throw error
      result = data
    }
    
    return NextResponse.json(result)
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
      error: error.message || 'Failed to save custom CSS' 
    }, { status: 500 })
  }
}
