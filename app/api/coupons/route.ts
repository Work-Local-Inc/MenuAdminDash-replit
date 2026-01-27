import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { couponCreateSchema } from '@/lib/validations/coupon'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient() as any
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant')
    
    // SECURITY: Require restaurant_id - coupons are ALWAYS location-specific
    // No global coupons exist - each of 190 locations manages their own promotions
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required for multi-tenant security' },
        { status: 400 }
      )
    }
    
    // Only fetch coupons for THIS specific restaurant
    // IMPORTANT: promotional_coupons is in menuca_v3 schema
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('promotional_coupons')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupons' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient() as any
    
    // Check authentication

    const body = await request.json()
    console.log('[Coupons API] Received body:', JSON.stringify(body, null, 2))
    
    // Validate request body
    const validatedData = couponCreateSchema.parse(body)
    console.log('[Coupons API] Validated data:', JSON.stringify(validatedData, null, 2))

    // Map validation schema to database columns
    // Database uses name_en/name_fr for bilingual support - NOT 'name' or 'description'
    // Remove fields that don't exist in the database
    const { 
      name, 
      name_fr,
      description, 
      description_fr, 
      ...restData 
    } = validatedData
    
    const dbData = {
      ...restData,
      name_en: name, // Map form 'name' to DB 'name_en'
      name_fr: name_fr || null, // French translation
    }
    console.log('[Coupons API] DB data to insert:', JSON.stringify(dbData, null, 2))

    // IMPORTANT: promotional_coupons is in menuca_v3 schema
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('promotional_coupons')
      .insert(dbData as any)
      .select()
      .single()

    if (error) {
      console.error('[Coupons API] DB error:', error)
      throw error
    }

    console.log('[Coupons API] Created coupon:', data)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Coupons API] Error:', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create coupon' },
      { status: 500 }
    )
  }
}
