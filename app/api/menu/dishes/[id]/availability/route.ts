import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateAvailabilitySchema = z.object({
  hidden_days: z.array(z.number().int().min(0).max(6)),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAuth(request)
    const { id } = await params
    const supabase = createAdminClient() as any

    // First check if dish exists
    const { data: dish, error: dishError } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('id')
      .eq('id', parseInt(id))
      .single()

    if (dishError) {
      // If column doesn't exist error, return empty array (feature not yet in DB)
      if (dishError.code === '42703') {
        return NextResponse.json({
          success: true,
          hidden_days: [],
          note: 'Day availability feature not yet configured in database'
        })
      }
      throw dishError
    }

    if (!dish) {
      return NextResponse.json(
        { error: 'Dish not found' },
        { status: 404 }
      )
    }

    // Try to get hidden_days if column exists
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('id, hidden_days')
      .eq('id', parseInt(id))
      .single()

    if (error) {
      // If column doesn't exist, return empty array
      if (error.code === '42703') {
        return NextResponse.json({
          success: true,
          hidden_days: [],
          note: 'Day availability feature not yet configured in database'
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      hidden_days: data?.hidden_days || []
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error fetching dish availability:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAuth(request)
    const { id } = await params
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = updateAvailabilitySchema.parse(body)

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .update({
        hidden_days: validatedData.hidden_days,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select('id, hidden_days')
      .single()

    if (error) {
      // If column doesn't exist, return success but note feature not available
      if (error.code === '42703') {
        return NextResponse.json({
          success: true,
          hidden_days: validatedData.hidden_days,
          message: 'Day availability feature not yet configured in database - changes not persisted'
        })
      }
      throw error
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Dish not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      hidden_days: data.hidden_days || [],
      message: 'Availability updated successfully'
    })
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
    console.error('Error updating dish availability:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update availability' },
      { status: 500 }
    )
  }
}
