import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { getCoupons } from '@/lib/supabase/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { couponCreateSchema } from '@/lib/validations/coupon'
import { z } from 'zod'

export async function GET() {
  try {
    const coupons = await getCoupons()
    return NextResponse.json(coupons)
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
    const supabase = createAdminClient()
    
    // Check authentication

    const body = await request.json()
    
    // Validate request body
    const validatedData = couponCreateSchema.parse(body)

    const { data, error } = await supabase
      .from('menuca_v3.promotional_coupons')
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
