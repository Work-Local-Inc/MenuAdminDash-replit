import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantPermission } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/promotions/deals/[id]/clone
 * Clone an existing promotional deal (Feature 13)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const dealId = parseInt(params.id)
    const supabase = createAdminClient()

    // Get the original deal
    const { data: originalDeal, error: fetchError } = await supabase
      .from('promotional_deals')
      .select('*')
      .eq('id', dealId)
      .single()

    if (fetchError || !originalDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Verify admin has permission for this restaurant
    const hasPermission = await verifyRestaurantPermission(adminUser.id, originalDeal.restaurant_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Create clone with "(Copy)" suffix
    const { id, created_at, updated_at, disabled_at, ...cloneData } = originalDeal
    const { data: clonedDeal, error: cloneError } = await supabase
      .from('promotional_deals')
      .insert({
        ...cloneData,
        name: `${originalDeal.name} (Copy)`,
        is_enabled: false, // Clones start disabled
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (cloneError) {
      console.error('[Clone Deal] Database error:', cloneError)
      throw cloneError
    }

    return NextResponse.json({ deal: clonedDeal }, { status: 201 })
  } catch (error) {
    console.error(`[POST /api/admin/promotions/deals/${params.id}/clone]`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clone deal' },
      { status: 500 }
    )
  }
}
