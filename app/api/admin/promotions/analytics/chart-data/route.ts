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
    const { adminUser } = await verifyAdminAuth(request) as { adminUser: any }
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    const supabase = createAdminClient() as any

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
      // Generate empty monthly trends for consistent chart display
      const now = new Date()
      const emptyMonthlyTrends = []
      const emptyRedemptionTrends = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStr = monthStart.toLocaleDateString('en-US', { month: 'short' })
        emptyMonthlyTrends.push({ month: monthStr, coupons: 0, deals: 0 })
        emptyRedemptionTrends.push({ month: monthStr, redemptions: 0, discountGiven: 0 })
      }
      
      return NextResponse.json({
        overview: { coupons: 0, deals: 0, upsells: 0, activeCoupons: 0, activeDeals: 0, activeUpsells: 0 },
        couponTypeBreakdown: [],
        dealTypeBreakdown: [],
        topCoupons: [],
        topDeals: [],
        monthlyTrends: emptyMonthlyTrends,
        redemptionTrends: emptyRedemptionTrends,
        topUsedCoupons: [],
        totalRedemptions: 0,
        totalDiscountGiven: 0,
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
      activeCoupons: coupons.filter((c: any) => !c.deleted_at).length,
      deals: deals.length,
      activeDeals: deals.filter((d: any) => d.is_enabled).length,
      upsells: upsells.length,
      activeUpsells: upsells.filter((u: any) => u.is_active).length,
    }

    // 2. Coupon type breakdown for pie chart
    const { data: couponTypes } = await supabase
      .from('promotional_coupons')
      .select('discount_type')
      .in('restaurant_id', targetRestaurantIds)
      .is('deleted_at', null)

    const couponTypeBreakdown = (couponTypes || []).reduce((acc: any[], coupon: any) => {
      const type = coupon.discount_type || 'unknown'
      const existing = acc.find((a: any) => a.name === type)
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

    const dealTypeBreakdown = (dealTypes || []).reduce((acc: any[], deal: any) => {
      const type = deal.deal_type || 'unknown'
      const existing = acc.find((a: any) => a.type === type)
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

    // 6. Monthly creation trends (last 6 months - using REAL data from created_at)
    const now = new Date()
    const monthlyTrends = []
    
    // Fetch coupons and deals with created_at for trend analysis
    const [couponsWithDates, dealsWithDates] = await Promise.all([
      supabase
        .from('promotional_coupons')
        .select('id, created_at')
        .in('restaurant_id', targetRestaurantIds)
        .is('deleted_at', null),
      supabase
        .from('promotional_deals')
        .select('id, created_at')
        .in('restaurant_id', targetRestaurantIds)
    ])
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthStr = monthStart.toLocaleDateString('en-US', { month: 'short' })
      
      // Count coupons created in this month
      const couponsInMonth = (couponsWithDates.data || []).filter((c: any) => {
        const createdAt = new Date(c.created_at)
        return createdAt >= monthStart && createdAt <= monthEnd
      }).length
      
      // Count deals created in this month
      const dealsInMonth = (dealsWithDates.data || []).filter((d: any) => {
        const createdAt = new Date(d.created_at)
        return createdAt >= monthStart && createdAt <= monthEnd
      }).length
      
      monthlyTrends.push({
        month: monthStr,
        coupons: couponsInMonth,
        deals: dealsInMonth,
      })
    }

    // 7. Coupon usage data - filter by restaurant through coupon relationship
    // First get coupon IDs for target restaurants
    const { data: restaurantCouponIds } = await supabase
      .from('promotional_coupons')
      .select('id')
      .in('restaurant_id', targetRestaurantIds)
    
    const couponIds = (restaurantCouponIds || []).map((c: any) => c.id)
    
    let usageData: any[] = []
    if (couponIds.length > 0) {
      const { data } = await supabase
        .from('coupon_usage_log')
        .select('id, coupon_id, order_id, discount_applied, used_at')
        .in('coupon_id', couponIds)
        .order('used_at', { ascending: false })
        .limit(500)
      usageData = data || []
    }
    
    // 8. Redemptions over time (last 6 months)
    const redemptionTrends = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthStr = monthStart.toLocaleDateString('en-US', { month: 'short' })
      
      const redemptionsInMonth = usageData.filter((u: any) => {
        const usedAt = new Date(u.used_at)
        return usedAt >= monthStart && usedAt <= monthEnd
      })
      
      const totalDiscount = redemptionsInMonth.reduce((sum: number, u: any) => 
        sum + (parseFloat(u.discount_applied) || 0), 0
      )
      
      redemptionTrends.push({
        month: monthStr,
        redemptions: redemptionsInMonth.length,
        discountGiven: Math.round(totalDiscount * 100) / 100,
      })
    }
    
    // 9. Top coupons by actual usage (enhanced version with redemption counts)
    const couponUsageCount: Record<number, { count: number; totalDiscount: number }> = {}
    usageData.forEach((u: any) => {
      if (!couponUsageCount[u.coupon_id]) {
        couponUsageCount[u.coupon_id] = { count: 0, totalDiscount: 0 }
      }
      couponUsageCount[u.coupon_id].count++
      couponUsageCount[u.coupon_id].totalDiscount += parseFloat(u.discount_applied) || 0
    })
    
    // Fetch coupon details for top used coupons
    const topUsedCouponIds = Object.entries(couponUsageCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id]) => parseInt(id))
    
    let topUsedCoupons: any[] = []
    if (topUsedCouponIds.length > 0) {
      const { data: couponsData } = await supabase
        .from('promotional_coupons')
        .select('id, name, code, discount_type, redeem_value_limit')
        .in('id', topUsedCouponIds)
      
      topUsedCoupons = (couponsData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        type: c.discount_type,
        value: c.redeem_value_limit,
        redemptions: couponUsageCount[c.id]?.count || 0,
        totalDiscount: Math.round((couponUsageCount[c.id]?.totalDiscount || 0) * 100) / 100,
      })).sort((a: any, b: any) => b.redemptions - a.redemptions)
    }

    return NextResponse.json({
      overview,
      couponTypeBreakdown,
      dealTypeBreakdown,
      topCoupons: (topCoupons || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        type: c.discount_type,
        value: c.redeem_value_limit,
        minPurchase: c.minimum_purchase,
      })),
      topDeals: (topDeals || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.deal_type,
        value: d.discount_percent || d.discount_amount,
        code: d.promo_code,
      })),
      monthlyTrends,
      redemptionTrends,
      topUsedCoupons,
      totalRedemptions: usageData.length,
      totalDiscountGiven: Math.round(usageData.reduce((sum: number, u: any) => 
        sum + (parseFloat(u.discount_applied) || 0), 0
      ) * 100) / 100,
    })
  } catch (error) {
    console.error('[GET /api/admin/promotions/analytics/chart-data]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}

