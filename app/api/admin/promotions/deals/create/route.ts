import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantPermission } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createDealSchema, type CreateDealInput } from '@/lib/validation/promotions'
import type { Database } from '@/types/supabase-database'
import { z } from 'zod'

type PromotionalDealInsert = Database['menuca_v3']['Tables']['promotional_deals']['Insert']

/**
 * POST /api/admin/promotions/deals/create
 * Create a new promotional deal (Feature 9)
 */
export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const body = await request.json()

    // Validate request body with Zod
    const validated = createDealSchema.parse(body)

    // Verify admin has permission for this restaurant
    const hasPermission = await verifyRestaurantPermission(adminUser.id, validated.restaurant_id)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to create deals for this restaurant' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // Create the deal with validated data
    // Note: created_at and updated_at are handled by database defaults
    // Type assertion needed due to Zod schema vs Database type mismatch
    const { data: deal, error } = await supabase
      .from('promotional_deals')
      .insert(validated as any)
      .select()
      .single()

    if (error) {
      console.error('[Create Deal] Database error:', error)
      throw error
    }

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/promotions/deals/create]', error)

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create deal' },
      { status: 500 }
    )
  }
}
