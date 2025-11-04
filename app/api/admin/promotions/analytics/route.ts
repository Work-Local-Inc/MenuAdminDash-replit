import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { getAdminAuthorizedRestaurants } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/promotions/analytics
 * Get promotional analytics for admin's authorized restaurants (Feature 12)
 */
export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const supabase = createAdminClient()

    // If specific restaurant requested, verify permission
    if (restaurantId) {
      const authorizedIds = await getAdminAuthorizedRestaurants(adminUser.id)
      if (!authorizedIds.includes(parseInt(restaurantId))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Get restaurant-specific analytics
      const { data: dealAnalytics, error: dealError } = await supabase
        .rpc('get_restaurant_deal_analytics', {
          p_restaurant_id: parseInt(restaurantId),
          p_start_date: startDate || null,
          p_end_date: endDate || null
        })

      const { data: couponAnalytics, error: couponError } = await supabase
        .rpc('get_restaurant_coupon_analytics', {
          p_restaurant_id: parseInt(restaurantId),
          p_start_date: startDate || null,
          p_end_date: endDate || null
        })

      const { data: topDeals, error: topError } = await supabase
        .rpc('get_top_performing_deals', {
          p_restaurant_id: parseInt(restaurantId),
          p_limit: 10
        })

      if (dealError || couponError || topError) {
        throw dealError || couponError || topError
      }

      return NextResponse.json({
        dealAnalytics: dealAnalytics?.[0] || null,
        couponAnalytics: couponAnalytics?.[0] || null,
        topDeals: topDeals || []
      })
    }

    // Get aggregated analytics for all authorized restaurants
    const authorizedIds = await getAdminAuthorizedRestaurants(adminUser.id)
    
    if (authorizedIds.length === 0) {
      return NextResponse.json({
        dealAnalytics: null,
        couponAnalytics: null,
        topDeals: []
      })
    }

    // Aggregate stats across all authorized restaurants
    const analyticsPromises = authorizedIds.map(async (id) => {
      const { data: dealData } = await supabase
        .rpc('get_restaurant_deal_analytics', {
          p_restaurant_id: id,
          p_start_date: startDate || null,
          p_end_date: endDate || null
        })
      const { data: couponData } = await supabase
        .rpc('get_restaurant_coupon_analytics', {
          p_restaurant_id: id,
          p_start_date: startDate || null,
          p_end_date: endDate || null
        })
      return { dealData: dealData?.[0], couponData: couponData?.[0] }
    })

    const results = await Promise.all(analyticsPromises)

    // Aggregate the results
    const aggregated = results.reduce((acc, curr) => {
      if (curr.dealData) {
        acc.totalDeals += curr.dealData.total_deals || 0
        acc.activeDeals += curr.dealData.active_deals || 0
        acc.totalRedemptions += curr.dealData.total_redemptions || 0
        acc.totalDiscountGiven += parseFloat(curr.dealData.total_discount_given || '0')
        acc.totalRevenue += parseFloat(curr.dealData.total_revenue || '0')
      }
      if (curr.couponData) {
        acc.totalCoupons += curr.couponData.total_coupons || 0
        acc.activeCoupons += curr.couponData.active_coupons || 0
        acc.couponRedemptions += curr.couponData.total_redemptions || 0
        acc.couponDiscountGiven += parseFloat(curr.couponData.total_discount_given || '0')
        acc.couponRevenue += parseFloat(curr.couponData.total_revenue || '0')
      }
      return acc
    }, {
      totalDeals: 0,
      activeDeals: 0,
      totalRedemptions: 0,
      totalDiscountGiven: 0,
      totalRevenue: 0,
      totalCoupons: 0,
      activeCoupons: 0,
      couponRedemptions: 0,
      couponDiscountGiven: 0,
      couponRevenue: 0
    })

    return NextResponse.json({
      dealAnalytics: {
        total_deals: aggregated.totalDeals,
        active_deals: aggregated.activeDeals,
        total_redemptions: aggregated.totalRedemptions,
        total_discount_given: aggregated.totalDiscountGiven,
        total_revenue: aggregated.totalRevenue,
        avg_order_value: aggregated.totalRedemptions > 0 
          ? aggregated.totalRevenue / aggregated.totalRedemptions 
          : 0
      },
      couponAnalytics: {
        total_coupons: aggregated.totalCoupons,
        active_coupons: aggregated.activeCoupons,
        total_redemptions: aggregated.couponRedemptions,
        total_discount_given: aggregated.couponDiscountGiven,
        total_revenue: aggregated.couponRevenue
      },
      topDeals: []
    })
  } catch (error) {
    console.error('[GET /api/admin/promotions/analytics]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
