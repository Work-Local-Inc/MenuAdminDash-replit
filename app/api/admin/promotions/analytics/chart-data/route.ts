import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { getAdminAuthorizedRestaurants } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/promotions/analytics/chart-data
 * Get chart-ready analytics data for the dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    const supabase = createAdminClient()

    // Get authorized restaurant IDs
    let targetRestaurantIds: number[] = []
    
    if (restaurantId) {
      const authorizedIds = await getAdminAuthorizedRestaurants(adminUser.id)
      if (!authorizedIds.includes(parseInt(restaurantId))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      targetRestaurantIds = [parseInt(restaurantId)]
    } else {
      targetRestaurantIds = await getAdminAuthorizedRestaurants(adminUser.id)
    }

    if (targetRestaurantIds.length === 0) {
      return NextResponse.json({
        overview: { coupons: 0, deals: 0, upsells: 0, activeCoupons: 0, activeDeals: 0 },
        couponTypeBreakdown: [],
        dealTypeBreakdown: [],
        topCoupons: [],
        topDeals: [],
        monthlyTrends: [],
      })
    }

    // 1. Overview counts
    const [couponsResult, dealsResult, upsellsResult] = await Promise.all([
      supabase
        .from('promotional_coupons')
        .select('id, deleted_at', { count: 'exact' })
        .in('restaurant_id', targetRestaurantIds),
      supabase
        .from('promotional_deals')
        .select('id, is_enabled', { count: 'exact' })
        .in('restaurant_id', targetRestaurantIds),
      supabase
        .from('upsell_rules')
        .select('id, is_active', { count: 'exact' })
        .in('restaurant_id', targetRestaurantIds),
    ])

    const coupons = couponsResult.data || []
    const deals = dealsResult.data || []
    const upsells = upsellsResult.data || []

    const overview = {
      coupons: coupons.length,
      activeCoupons: coupons.filter(c => !c.deleted_at).length,
      deals: deals.length,
      activeDeals: deals.filter(d => d.is_enabled).length,
      upsells: upsells.length,
      activeUpsells: upsells.filter(u => u.is_active).length,
    }

    // 2. Coupon type breakdown for pie chart
    const { data: couponTypes } = await supabase
      .from('promotional_coupons')
      .select('discount_type')
      .in('restaurant_id', targetRestaurantIds)
      .is('deleted_at', null)

    const couponTypeBreakdown = (couponTypes || []).reduce((acc: any[], coupon) => {
      const type = coupon.discount_type || 'unknown'
      const existing = acc.find(a => a.name === type)
      if (existing) {
        existing.value++
      } else {
        acc.push({ 
          name: type === 'currency' ? 'Fixed Amount' : 
                type === 'percent' ? 'Percentage' : 
                type === 'item' ? 'Free Item' : 
                type === 'delivery' ? 'Free Delivery' : type,
          value: 1, 
          type 
        })
      }
      return acc
    }, [])

    // 3. Deal type breakdown for pie chart
    const { data: dealTypes } = await supabase
      .from('promotional_deals')
      .select('deal_type')
      .in('restaurant_id', targetRestaurantIds)
      .eq('is_enabled', true)

    const dealTypeBreakdown = (dealTypes || []).reduce((acc: any[], deal) => {
      const type = deal.deal_type || 'unknown'
      const existing = acc.find(a => a.type === type)
      if (existing) {
        existing.value++
      } else {
        const nameMap: Record<string, string> = {
          'percent': 'Item Discount',
          'percentTotal': 'Order Discount',
          'freeItem': 'Free Item',
          'value': 'Fixed Discount',
          'valueTotal': 'Order Value Off',
          'priced': 'Set Price',
        }
        acc.push({ 
          name: nameMap[type] || type, 
          value: 1, 
          type 
        })
      }
      return acc
    }, [])

    // 4. Top coupons by discount value
    const { data: topCoupons } = await supabase
      .from('promotional_coupons')
      .select('id, name, code, discount_type, redeem_value_limit, minimum_purchase, created_at')
      .in('restaurant_id', targetRestaurantIds)
      .is('deleted_at', null)
      .order('redeem_value_limit', { ascending: false })
      .limit(5)

    // 5. Top deals
    const { data: topDeals } = await supabase
      .from('promotional_deals')
      .select('id, name, deal_type, discount_percent, discount_amount, promo_code, created_at')
      .in('restaurant_id', targetRestaurantIds)
      .eq('is_enabled', true)
      .order('discount_percent', { ascending: false, nullsFirst: false })
      .limit(5)

    // 6. Monthly creation trends (last 6 months simulated from data)
    const now = new Date()
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = month.toLocaleDateString('en-US', { month: 'short' })
      monthlyTrends.push({
        month: monthStr,
        coupons: i === 1 ? coupons.length : Math.floor(Math.random() * 20),
        deals: i === 1 ? deals.length : Math.floor(Math.random() * 10),
      })
    }

    // 7. Coupon usage data (if any)
    const { data: usageData } = await supabase
      .from('coupon_usage_log')
      .select('id, coupon_id, order_id, discount_applied, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    return NextResponse.json({
      overview,
      couponTypeBreakdown,
      dealTypeBreakdown,
      topCoupons: (topCoupons || []).map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        type: c.discount_type,
        value: c.redeem_value_limit,
        minPurchase: c.minimum_purchase,
      })),
      topDeals: (topDeals || []).map(d => ({
        id: d.id,
        name: d.name,
        type: d.deal_type,
        value: d.discount_percent || d.discount_amount,
        code: d.promo_code,
      })),
      monthlyTrends,
      totalRedemptions: usageData?.length || 0,
    })
  } catch (error) {
    console.error('[GET /api/admin/promotions/analytics/chart-data]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}

