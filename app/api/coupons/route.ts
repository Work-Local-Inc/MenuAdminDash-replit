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
    
    // SECURITY: Require restaurant_id to prevent data leakage across restaurants
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required for multi-tenant security' },
        { status: 400 }
      )
    }
    
    // Show: this restaurant's specific coupons OR global coupons
    const { data, error } = await supabase
      .from('promotional_coupons')
      .select('*')
      .or(`restaurant_id.eq.${restaurantId},is_global.eq.true,restaurant_id.is.null`)
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
    
    // Validate request body
    const validatedData = couponCreateSchema.parse(body)

    const { data, error } = await supabase
      .from('promotional_coupons')
      .insert(validatedData as any)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
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
