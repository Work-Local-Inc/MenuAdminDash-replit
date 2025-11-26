import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'

const PAYMENT_TYPES = [
  'credit_card',
  'cash',
  'interac',
  'credit_at_door',
  'debit_at_door',
  'credit_debit_at_door'
] as const

const APPLIES_TO = ['both', 'delivery', 'pickup'] as const

const paymentOptionSchema = z.object({
  payment_type: z.enum(PAYMENT_TYPES),
  enabled: z.boolean().default(false),
  applies_to: z.enum(APPLIES_TO).default('both'),
  label_en: z.string().nullable().optional(),
  label_fr: z.string().nullable().optional(),
  instructions_en: z.string().nullable().optional(),
  instructions_fr: z.string().nullable().optional(),
  display_order: z.number().default(0),
})

const bulkUpdateSchema = z.array(paymentOptionSchema)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('restaurant_payment_options')
      .select('*')
      .eq('restaurant_id', params.id)
      .order('display_order', { ascending: true })

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json([])
      }
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[Payment Options GET] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment options' },
      { status: 500 }
    )
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
    
    const validatedData = paymentOptionSchema.parse(body)

    const { data, error } = await supabase
      .from('restaurant_payment_options')
      .insert({
        restaurant_id: parseInt(params.id),
        ...validatedData,
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
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('[Payment Options POST] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment option' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()
    const body = await request.json()
    
    const validatedData = bulkUpdateSchema.parse(body)

    const restaurantId = parseInt(params.id)

    const upsertData = validatedData.map((option, index) => ({
      restaurant_id: restaurantId,
      payment_type: option.payment_type,
      enabled: option.enabled,
      applies_to: option.applies_to,
      label_en: option.label_en || null,
      label_fr: option.label_fr || null,
      instructions_en: option.instructions_en || null,
      instructions_fr: option.instructions_fr || null,
      display_order: option.display_order ?? index,
    }))

    const { data, error } = await supabase
      .from('restaurant_payment_options')
      .upsert(upsertData, {
        onConflict: 'restaurant_id,payment_type',
        ignoreDuplicates: false,
      })
      .select()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('[Payment Options PUT] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update payment options' },
      { status: 500 }
    )
  }
}
