import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/customer/restaurants/[slug]/promotions
 * Get active promotions visible to customers for a restaurant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient()
    const slug = params.slug

    // Extract restaurant ID from slug (format: restaurant-name-123)
    const slugParts = slug.split('-')
    const restaurantId = parseInt(slugParts[slugParts.length - 1])

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant slug' }, { status: 400 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

    // Fetch active coupons
    const { data: coupons } = await supabase
      .from('promotional_coupons')
      .select('id, name, code, description, discount_type, redeem_value_limit, minimum_purchase, is_first_order_only, valid_until_at')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .or(`valid_from_at.is.null,valid_from_at.lte.${now.toISOString()}`)
      .or(`valid_until_at.is.null,valid_until_at.gte.${now.toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch active deals
    const { data: deals } = await supabase
      .from('promotional_deals')
      .select('id, name, description, deal_type, discount_percent, discount_amount, promo_code, date_stop, time_start, time_stop, image_url, is_first_order_only')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .or(`date_start.is.null,date_start.lte.${today}`)
      .or(`date_stop.is.null,date_stop.gte.${today}`)
      .order('display_order', { ascending: true })
      .limit(10)

    // Transform coupons into customer-friendly format
    const customerCoupons = (coupons || []).map((coupon: any) => {
      let discountText = ''
      if (coupon.discount_type === 'percent') {
        discountText = `${coupon.redeem_value_limit}% off`
      } else if (coupon.discount_type === 'currency') {
        discountText = `$${coupon.redeem_value_limit} off`
      } else if (coupon.discount_type === 'delivery') {
        discountText = 'Free delivery'
      } else if (coupon.discount_type === 'item') {
        discountText = 'Free item'
      }

      return {
        id: `coupon-${coupon.id}`,
        type: 'coupon' as const,
        name: coupon.name,
        code: coupon.code,
        description: coupon.description || discountText,
        discountText,
        minPurchase: coupon.minimum_purchase,
        firstOrderOnly: coupon.is_first_order_only,
        expiresAt: coupon.valid_until_at,
      }
    })

    // Transform deals into customer-friendly format
    const customerDeals = (deals || []).filter((deal: any) => {
      // Check time-based availability
      if (deal.time_start && deal.time_stop) {
        if (currentTime < deal.time_start || currentTime > deal.time_stop) {
          return false
        }
      }
      return true
    }).map((deal: any) => {
      let discountText = deal.name
      if (deal.deal_type === 'percent' || deal.deal_type === 'percentTotal') {
        discountText = `${deal.discount_percent}% off`
      } else if (deal.deal_type === 'value' || deal.deal_type === 'valueTotal') {
        discountText = `$${deal.discount_amount} off`
      } else if (deal.deal_type === 'freeItem') {
        discountText = 'Free item'
      }

      return {
        id: `deal-${deal.id}`,
        type: 'deal' as const,
        name: deal.name,
        code: deal.promo_code,
        description: deal.description || discountText,
        discountText,
        imageUrl: deal.image_url,
        firstOrderOnly: deal.is_first_order_only,
        expiresAt: deal.date_stop,
        timeRange: deal.time_start && deal.time_stop 
          ? `${deal.time_start} - ${deal.time_stop}` 
          : null,
      }
    })

    // Combine and prioritize (deals first, then coupons)
    const promotions = [...customerDeals, ...customerCoupons]

    // Pick featured promo for banner (first deal with image, or first with code)
    const featured = promotions.find(p => p.type === 'deal' && (p as any).imageUrl) 
      || promotions.find(p => p.code)
      || promotions[0]

    return NextResponse.json({
      promotions,
      featured,
      hasCoupons: customerCoupons.length > 0,
      hasDeals: customerDeals.length > 0,
    })
  } catch (error) {
    console.error('[GET /api/customer/restaurants/[slug]/promotions]', error)
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 }
    )
  }
}


