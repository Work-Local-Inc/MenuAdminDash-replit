import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantPermission } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateDealSchema } from '@/lib/validation/promotions'
import { z } from 'zod'

/**
 * GET /api/admin/promotions/deals/[id]
 * Get a specific promotional deal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const dealId = parseInt(params.id)
    const supabase = createAdminClient()

    const { data: deal, error } = await supabase
      .from('promotional_deals')
      .select(`
        *,
        restaurants:restaurant_id (
          id,
          name,
          slug
        )
      `)
      .eq('id', dealId)
      .single()

    if (error || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Verify admin has permission for this restaurant
    const hasPermission = await verifyRestaurantPermission(adminUser.id, deal.restaurant_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ deal })
  } catch (error) {
    console.error(`[GET /api/admin/promotions/deals/${params.id}]`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch deal' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/promotions/deals/[id]
 * Update a promotional deal
 * 
 * SECURITY: Does NOT allow restaurant_id changes to prevent privilege escalation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const dealId = parseInt(params.id)
    const body = await request.json()

    // Validate request body with Zod (strict mode prevents restaurant_id injection)
    const validated = updateDealSchema.parse(body)

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
        { error: 'You do not have permission to update this deal' },
        { status: 403 }
      )
    }

    // SECURITY: Double-check that restaurant_id cannot be modified
    // Filter ensures UPDATE only affects deals owned by this restaurant
    const { data: deal, error } = await supabase
      .from('promotional_deals')
      .update(validated as any)
      .eq('id', dealId)
      .eq('restaurant_id', existingDeal.restaurant_id)  // CRITICAL: Prevents cross-restaurant updates
      .select()
      .single()

    if (error) {
      throw error
    }

    // Final verification: ensure restaurant_id wasn't changed
    if (deal && deal.restaurant_id !== existingDeal.restaurant_id) {
      console.error('[SECURITY] Restaurant ID modification detected!', {
        dealId,
        original: existingDeal.restaurant_id,
        modified: deal.restaurant_id
      })
      throw new Error('Security violation: restaurant_id modification not allowed')
    }

    return NextResponse.json({ deal })
  } catch (error) {
    console.error(`[PATCH /api/admin/promotions/deals/${params.id}]`, error)

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
      { error: error instanceof Error ? error.message : 'Failed to update deal' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/promotions/deals/[id]
 * Soft delete a promotional deal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const dealId = parseInt(params.id)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Call soft delete function
    const { data, error } = await supabase
      .rpc('soft_delete_deal', {
        p_deal_id: dealId,
        p_user_id: adminUser.id
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error(`[DELETE /api/admin/promotions/deals/${params.id}]`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete deal' },
      { status: 500 }
    )
  }
}
