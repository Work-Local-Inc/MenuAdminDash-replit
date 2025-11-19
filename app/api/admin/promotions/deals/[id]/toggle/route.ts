import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantPermission } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'
import { toggleDealStatusSchema } from '@/lib/validation/promotions'
import { z } from 'zod'

/**
 * PATCH /api/admin/promotions/deals/[id]/toggle
 * Toggle deal status (Feature 10)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const dealId = parseInt(params.id)
    const body = await request.json()

    // Validate request body with Zod
    const validated = toggleDealStatusSchema.parse(body)

    const supabase = createAdminClient()

    // Verify admin has permission for this deal's restaurant
    const { data: existingDeal } = await supabase
      .from('promotional_deals')
      .select('restaurant_id')
      .eq('id', dealId)
      .single()

    if (!existingDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const hasPermission = await verifyRestaurantPermission(adminUser.id, existingDeal.restaurant_id)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to toggle this deal' },
        { status: 403 }
      )
    }

    // Call toggle function with validated data
    const { data, error } = await supabase
      .rpc('toggle_deal_status', {
        p_deal_id: dealId,
        p_is_enabled: validated.is_enabled
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error(`[PATCH /api/admin/promotions/deals/${params.id}/toggle]`, error)

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
      { error: error instanceof Error ? error.message : 'Failed to toggle deal status' },
      { status: 500 }
    )
  }
}
