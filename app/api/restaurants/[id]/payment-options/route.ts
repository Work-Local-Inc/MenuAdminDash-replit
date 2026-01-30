import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'

const PAYMENT_TYPES = [
  'credit_card',
  'cash',
  'interac',
  'credit_at_door',
  'debit_at_door',
  'credit_or_debit_at_door'
] as const

const paymentOptionSchema = z.object({
  payment_type: z.enum(PAYMENT_TYPES),
  enabled: z.boolean().default(false),
  label_en: z.string().nullable().optional(),
  label_fr: z.string().nullable().optional(),
  display_order: z.number().default(0),
})

const bulkUpdateSchema = z.array(paymentOptionSchema)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    
    const restaurantId = parseInt(params.id)
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    
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

    const transformedData = (data || []).map((row: any) => ({
      id: row.id,
      restaurant_id: row.restaurant_id,
      payment_type: row.payment_method,
      enabled: row.is_enabled,
      label_en: row.english_label,
      label_fr: row.french_label,
      display_order: row.display_order,
    }))

    return NextResponse.json(transformedData)
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
    const { adminUser } = await verifyAdminAuth(request)
    
    const restaurantId = parseInt(params.id)
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    const body = await request.json()
    
    const validatedData = paymentOptionSchema.parse(body)

    const { data, error } = await supabase
      .from('restaurant_payment_options')
      .insert({
        restaurant_id: parseInt(params.id),
        payment_method: validatedData.payment_type,
        is_enabled: validatedData.enabled,
        english_label: validatedData.label_en || null,
        french_label: validatedData.label_fr || null,
        display_order: validatedData.display_order,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      id: data.id,
      restaurant_id: data.restaurant_id,
      payment_type: data.payment_method,
      enabled: data.is_enabled,
      label_en: data.english_label,
      label_fr: data.french_label,
      display_order: data.display_order,
    })
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
    const { adminUser } = await verifyAdminAuth(request)
    
    const restaurantId = parseInt(params.id)
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    const body = await request.json()
    
    const validatedData = bulkUpdateSchema.parse(body)

    const upsertData = validatedData.map((option, index) => ({
      restaurant_id: restaurantId,
      payment_method: option.payment_type,
      is_enabled: option.enabled,
      english_label: option.label_en || null,
      french_label: option.label_fr || null,
      display_order: option.display_order ?? index,
    }))

    const { data, error } = await supabase
      .from('restaurant_payment_options')
      .upsert(upsertData, {
        onConflict: 'restaurant_id,payment_method',
        ignoreDuplicates: false,
      })
      .select()

    if (error) throw error

    const transformedData = (data || []).map((row: any) => ({
      id: row.id,
      restaurant_id: row.restaurant_id,
      payment_type: row.payment_method,
      enabled: row.is_enabled,
      label_en: row.english_label,
      label_fr: row.french_label,
      display_order: row.display_order,
    }))

    return NextResponse.json(transformedData)
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
