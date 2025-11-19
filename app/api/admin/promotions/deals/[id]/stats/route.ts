import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantPermission } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/promotions/deals/[id]/stats
 * Get deal performance statistics (Feature 11)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const dealId = parseInt(params.id)
    const supabase = createAdminClient()

    // Verify admin has permission for this deal's restaurant
    const { data: deal } = await supabase
      .from('promotional_deals')
      .select('restaurant_id')
      .eq('id', dealId)
      .single()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const hasPermission = await verifyRestaurantPermission(adminUser.id, deal.restaurant_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get deal usage stats
    const { data: stats, error } = await supabase
      .rpc('get_deal_usage_stats', { p_deal_id: dealId })

    if (error) {
      throw error
    }

    return NextResponse.json({ stats: stats?.[0] || null })
  } catch (error) {
    console.error(`[GET /api/admin/promotions/deals/${params.id}/stats]`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch deal stats' },
      { status: 500 }
    )
  }
}
