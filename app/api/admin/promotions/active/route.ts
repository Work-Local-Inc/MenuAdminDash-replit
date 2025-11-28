import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { getAdminAuthorizedRestaurants } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/promotions/active
 * Get all currently active promotions (coupons, deals, upsells) for dashboard display
 */
export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request) as { adminUser: any }
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    const supabase = createAdminClient() as any
    const authorizedIds = await getAdminAuthorizedRestaurants(adminUser.id)

    if (authorizedIds.length === 0) {
      return NextResponse.json({ promotions: [] })
    }

    const targetRestaurants = restaurantId 
      ? [parseInt(restaurantId)]
      : authorizedIds

    if (restaurantId && !authorizedIds.includes(parseInt(restaurantId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const today = new Date().toISOString().split('T')[0]
    const promotions: any[] = []

    // Fetch active coupons
    const { data: coupons } = await supabase
      .from('promotional_coupons')
      .select('id, name, code, discount_type, discount_amount, redeem_value_limit, valid_until_at')
      .in('restaurant_id', targetRestaurants)
      .is('deleted_at', null)
      .or(`valid_until_at.is.null,valid_until_at.gte.${new Date().toISOString()}`)
      .limit(10)
      .order('created_at', { ascending: false })

    coupons?.forEach((coupon: any) => {
      const discountText = coupon.discount_type === 'percent' 
        ? `${coupon.redeem_value_limit || coupon.discount_amount}% off`
        : coupon.discount_type === 'currency'
        ? `$${coupon.redeem_value_limit || coupon.discount_amount} off`
        : coupon.discount_type === 'item'
        ? 'Free item'
        : `${coupon.redeem_value_limit || coupon.discount_amount} off`

      promotions.push({
        id: `coupon-${coupon.id}`,
        name: coupon.name,
        code: coupon.code,
        type: 'coupon',
        discount: discountText,
        expiresAt: coupon.valid_until_at 
          ? new Date(coupon.valid_until_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : null,
        isActive: true,
      })
    })

    // Fetch active deals
    const { data: deals } = await supabase
      .from('promotional_deals')
      .select('id, name, deal_type, discount_percent, discount_amount, date_stop, promo_code')
      .in('restaurant_id', targetRestaurants)
      .eq('is_enabled', true)
      .or(`date_stop.is.null,date_stop.gte.${today}`)
      .limit(10)
      .order('created_at', { ascending: false })

    deals?.forEach((deal: any) => {
      let discountText = 'Special offer'
      if (deal.deal_type === 'percent' || deal.deal_type === 'percentTotal') {
        discountText = `${deal.discount_percent}% off`
      } else if (deal.deal_type === 'value' || deal.deal_type === 'valueTotal') {
        discountText = `$${deal.discount_amount} off`
      } else if (deal.deal_type === 'freeItem') {
        discountText = 'Free item'
      } else if (deal.deal_type === 'priced') {
        discountText = 'Special price'
      }

      promotions.push({
        id: `deal-${deal.id}`,
        name: deal.name,
        code: deal.promo_code || deal.name.substring(0, 10).toUpperCase().replace(/\s/g, ''),
        type: 'deal',
        discount: discountText,
        expiresAt: deal.date_stop 
          ? new Date(deal.date_stop).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : null,
        isActive: true,
      })
    })

    // Fetch active upsells
    const { data: upsells } = await supabase
      .from('upsell_rules')
      .select('id, name, headline, discount_percent, discount_amount, acceptance_count')
      .in('restaurant_id', targetRestaurants)
      .eq('is_active', true)
      .limit(10)
      .order('display_priority', { ascending: true })

    upsells?.forEach((upsell: any) => {
      let discountText = 'Add-on suggestion'
      if (upsell.discount_percent) {
        discountText = `${upsell.discount_percent}% off`
      } else if (upsell.discount_amount) {
        discountText = `$${upsell.discount_amount} off`
      }

      promotions.push({
        id: `upsell-${upsell.id}`,
        name: upsell.name,
        code: upsell.headline || 'UPSELL',
        type: 'upsell',
        discount: discountText,
        usageCount: upsell.acceptance_count || 0,
        isActive: true,
      })
    })

    // Sort by type then name
    promotions.sort((a, b) => {
      const typeOrder = { coupon: 1, deal: 2, upsell: 3 }
      return (typeOrder[a.type as keyof typeof typeOrder] || 4) - (typeOrder[b.type as keyof typeof typeOrder] || 4)
    })

    return NextResponse.json({ promotions: promotions.slice(0, 10) })
  } catch (error) {
    console.error('[GET /api/admin/promotions/active]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch active promotions' },
      { status: 500 }
    )
  }
}

