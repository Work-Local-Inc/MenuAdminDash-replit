import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const paymentMethodSchema = z.object({
  payment_provider: z.enum(['stripe', 'square', 'paypal', 'cash', 'interac']),
  provider_account_id: z.string().optional(),
  is_active: z.boolean().default(true),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('restaurant_payment_methods')
      .select('*')
      .eq('restaurant_id', params.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch payment methods' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()
    const body = await request.json()
    
    // Validate request body
    const validatedData = paymentMethodSchema.parse(body)
    
    const { data, error } = await supabase
      .from('restaurant_payment_methods')
      .insert({
        ...validatedData,
        restaurant_id: parseInt(params.id),
      })
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
    return NextResponse.json({ error: error.message || 'Failed to create payment method' }, { status: 500 })
  }
}
