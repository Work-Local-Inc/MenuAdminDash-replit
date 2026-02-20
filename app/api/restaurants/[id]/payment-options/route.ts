import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'
export const dynamic = 'force-dynamic'

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
      .schema('menuca_v3')
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
      payment_type: row.payment_type,
      enabled: row.enabled,
      applies_to: row.applies_to,
      label_en: row.label_en,
      label_fr: row.label_fr,
      instructions_en: row.instructions_en,
      instructions_fr: row.instructions_fr,
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
      .schema('menuca_v3')
      .from('restaurant_payment_options')
      .insert({
        restaurant_id: parseInt(params.id),
        payment_type: validatedData.payment_type,
        enabled: validatedData.enabled,
        label_en: validatedData.label_en || null,
        label_fr: validatedData.label_fr || null,
        display_order: validatedData.display_order,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      id: data.id,
      restaurant_id: data.restaurant_id,
      payment_type: data.payment_type,
      enabled: data.enabled,
      label_en: data.label_en,
      label_fr: data.label_fr,
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
      payment_type: option.payment_type,
      enabled: option.enabled,
      label_en: option.label_en || null,
      label_fr: option.label_fr || null,
      display_order: option.display_order ?? index,
    }))

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_payment_options')
      .upsert(upsertData, {
        onConflict: 'restaurant_id,payment_type',
        ignoreDuplicates: false,
      })
      .select()

    if (error) throw error

    const transformedData = (data || []).map((row: any) => ({
      id: row.id,
      restaurant_id: row.restaurant_id,
      payment_type: row.payment_type,
      enabled: row.enabled,
      applies_to: row.applies_to,
      label_en: row.label_en,
      label_fr: row.label_fr,
      instructions_en: row.instructions_en,
      instructions_fr: row.instructions_fr,
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
