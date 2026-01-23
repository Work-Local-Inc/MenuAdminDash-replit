import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/customer/restaurants/[slug]/promotions
 * Get active promotions visible to customers for a restaurant
 * 
 * Query params:
 * - lang: 'en' | 'fr' (default: 'en') - Language for translations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient() as any
    const slug = params.slug
    
    // Get language preference from query params (default to English)
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') === 'fr' ? 'fr' : 'en'

    // Extract restaurant ID from slug (format: restaurant-name-123)
    const slugParts = slug.split('-')
    const restaurantId = parseInt(slugParts[slugParts.length - 1])

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant slug' }, { status: 400 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

    // Fetch active coupons (including French translation fields)
    const { data: coupons } = await supabase
      .from('promotional_coupons')
      .select('id, name, name_fr, code, description, description_fr, discount_type, redeem_value_limit, minimum_purchase, is_first_order_only, valid_until_at')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .or(`valid_from_at.is.null,valid_from_at.lte.${now.toISOString()}`)
      .or(`valid_until_at.is.null,valid_until_at.gte.${now.toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch active deals (including French translation fields)
    const { data: deals } = await supabase
      .from('promotional_deals')
      .select('id, name, name_fr, description, description_fr, deal_type, discount_percent, discount_amount, promo_code, date_stop, time_start, time_stop, image_url, is_first_order_only')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .or(`date_start.is.null,date_start.lte.${today}`)
      .or(`date_stop.is.null,date_stop.gte.${today}`)
      .order('display_order', { ascending: true })
      .limit(10)
    
    // Helper function to get localized text with fallback to English
    const getLocalizedText = (englishText: string | null, frenchText: string | null): string => {
      if (lang === 'fr' && frenchText) {
        return frenchText
      }
      return englishText || ''
    }

    // Transform coupons into customer-friendly format
    const customerCoupons = (coupons || []).map((coupon: any) => {
      let discountText = ''
      if (coupon.discount_type === 'percent') {
        discountText = lang === 'fr' ? `${coupon.redeem_value_limit}% de rabais` : `${coupon.redeem_value_limit}% off`
      } else if (coupon.discount_type === 'currency') {
        discountText = lang === 'fr' ? `${coupon.redeem_value_limit}$ de rabais` : `$${coupon.redeem_value_limit} off`
      } else if (coupon.discount_type === 'delivery') {
        discountText = lang === 'fr' ? 'Livraison gratuite' : 'Free delivery'
      } else if (coupon.discount_type === 'item') {
        discountText = lang === 'fr' ? 'Article gratuit' : 'Free item'
      }

      const localizedName = getLocalizedText(coupon.name, coupon.name_fr)
      const localizedDescription = getLocalizedText(coupon.description, coupon.description_fr)

      return {
        id: `coupon-${coupon.id}`,
        type: 'coupon' as const,
        name: localizedName,
        code: coupon.code,
        description: localizedDescription || discountText,
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
      const localizedName = getLocalizedText(deal.name, deal.name_fr)
      const localizedDescription = getLocalizedText(deal.description, deal.description_fr)
      
      let discountText = localizedName
      if (deal.deal_type === 'percent' || deal.deal_type === 'percentTotal') {
        discountText = lang === 'fr' ? `${deal.discount_percent}% de rabais` : `${deal.discount_percent}% off`
      } else if (deal.deal_type === 'value' || deal.deal_type === 'valueTotal') {
        discountText = lang === 'fr' ? `${deal.discount_amount}$ de rabais` : `$${deal.discount_amount} off`
      } else if (deal.deal_type === 'freeItem') {
        discountText = lang === 'fr' ? 'Article gratuit' : 'Free item'
      }

      return {
        id: `deal-${deal.id}`,
        type: 'deal' as const,
        name: localizedName,
        code: deal.promo_code,
        description: localizedDescription || discountText,
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
      language: lang,
    })
  } catch (error) {
    console.error('[GET /api/customer/restaurants/[slug]/promotions]', error)
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 }
    )
  }
}


