import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { getAdminAuthorizedRestaurants } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/promotions/stats
 * Get promotion statistics for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    const supabase = createAdminClient()
    const authorizedIds = await getAdminAuthorizedRestaurants(adminUser.id)

    if (authorizedIds.length === 0) {
      return NextResponse.json({
        activeCoupons: 0,
        activeDeals: 0,
        activeUpsells: 0,
        totalRedemptions: 0,
        revenueImpact: 0,
      })
    }

    // Verify restaurant access if specified
    const targetRestaurants = restaurantId 
      ? [parseInt(restaurantId)]
      : authorizedIds

    if (restaurantId && !authorizedIds.includes(parseInt(restaurantId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Count active coupons
    const { count: activeCoupons } = await supabase
      .from('promotional_coupons')
      .select('*', { count: 'exact', head: true })
      .in('restaurant_id', targetRestaurants)
      .is('deleted_at', null)
      .or(`valid_until_at.is.null,valid_until_at.gte.${new Date().toISOString()}`)

    // Count active deals
    const { count: activeDeals } = await supabase
      .from('promotional_deals')
      .select('*', { count: 'exact', head: true })
      .in('restaurant_id', targetRestaurants)
      .eq('is_enabled', true)
      .or(`date_stop.is.null,date_stop.gte.${new Date().toISOString().split('T')[0]}`)

    // Count active upsell rules
    const { count: activeUpsells } = await supabase
      .from('upsell_rules')
      .select('*', { count: 'exact', head: true })
      .in('restaurant_id', targetRestaurants)
      .eq('is_active', true)

    // Get redemption stats from coupon_usage_log
    const { data: redemptionData } = await supabase
      .from('coupon_usage_log')
      .select('discount_amount')
      .in('restaurant_id', targetRestaurants)

    const totalRedemptions = redemptionData?.length || 0
    const revenueImpact = redemptionData?.reduce((sum, r) => sum + (parseFloat(r.discount_amount) || 0), 0) || 0

    // Get upsell acceptance stats
    const { data: upsellStats } = await supabase
      .from('upsell_rules')
      .select('acceptance_count, impressions_count')
      .in('restaurant_id', targetRestaurants)
      .eq('is_active', true)

    const totalUpsellAcceptances = upsellStats?.reduce((sum, u) => sum + (u.acceptance_count || 0), 0) || 0
    const totalUpsellImpressions = upsellStats?.reduce((sum, u) => sum + (u.impressions_count || 0), 0) || 0

    return NextResponse.json({
      activeCoupons: activeCoupons || 0,
      activeDeals: activeDeals || 0,
      activeUpsells: activeUpsells || 0,
      totalRedemptions: totalRedemptions + totalUpsellAcceptances,
      revenueImpact,
      upsellConversionRate: totalUpsellImpressions > 0 
        ? Math.round((totalUpsellAcceptances / totalUpsellImpressions) * 100) 
        : 0,
    })
  } catch (error) {
    console.error('[GET /api/admin/promotions/stats]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

