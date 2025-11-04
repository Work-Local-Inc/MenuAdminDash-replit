import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantPermission } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/promotions/deals/create
 * Create a new promotional deal (Feature 9)
 */
export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const body = await request.json()
    const { restaurant_id, ...dealData } = body

    // Verify admin has permission for this restaurant
    const hasPermission = await verifyRestaurantPermission(adminUser.id, restaurant_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Unauthorized - no permission for this restaurant' }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Create the deal
    const { data: deal, error } = await supabase
      .from('promotional_deals')
      .insert({
        restaurant_id,
        ...dealData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Create Deal] Database error:', error)
      throw error
    }

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/promotions/deals/create]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create deal' },
      { status: 500 }
    )
  }
}
