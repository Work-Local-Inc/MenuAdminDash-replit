import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/customer/restaurants/[slug]/auto-deals
 * Fetch auto-apply deals and check eligibility for customer
 * 
 * Body:
 * - subtotal: number - Order subtotal
 * - service_type: 'pickup' | 'delivery' - Order service type
 * - customer_email?: string - Customer email (for first-order validation)
 * - customer_id?: number - Customer ID if logged in
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient() as any
    const slug = params.slug
    const body = await request.json()
    
    const { subtotal, service_type, customer_email, customer_id } = body

    // Extract restaurant ID from slug (format: restaurant-name-123)
    const slugParts = slug.split('-')
    const restaurantId = parseInt(slugParts[slugParts.length - 1])

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant slug' }, { status: 400 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

    // First, fetch ALL active deals for this restaurant to debug
    const { data: allDeals, error: allDealsError } = await supabase
      .schema('menuca_v3')
      .from('promotional_deals')
      .select('id, name, promo_code, is_enabled, is_first_order_only, discount_percent, discount_amount, deal_type')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
    
    console.log('[Auto-Deals] Restaurant ID:', restaurantId)
    console.log('[Auto-Deals] All active deals for restaurant:', JSON.stringify(allDeals, null, 2))
    console.log('[Auto-Deals] All deals error:', allDealsError?.message)

    // Fetch active deals that don't require a promo code (auto-apply deals)
    // Filter for deals where promo_code is null OR empty string
    const { data: deals, error: dealsError } = await supabase
      .schema('menuca_v3')
      .from('promotional_deals')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .or('promo_code.is.null,promo_code.eq.') // null or empty string
      .or(`date_start.is.null,date_start.lte.${today}`)
      .or(`date_stop.is.null,date_stop.gte.${today}`)
      .order('display_order', { ascending: true })

    console.log('[Auto-Deals] Auto-apply deals (no promo code):', deals?.length || 0)
    
    if (dealsError) {
      console.error('[Auto-Deals] Error fetching deals:', dealsError)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    if (!deals || deals.length === 0) {
      // Check if there are deals but they all have promo codes
      if (allDeals && allDeals.length > 0) {
        console.log('[Auto-Deals] Deals exist but all require promo codes')
        return NextResponse.json({ 
          eligible_deal: null, 
          message: 'All deals require promo codes - no auto-apply deals',
          debug: { total_deals: allDeals.length, deals_with_codes: allDeals.filter((d: any) => d.promo_code).length }
        })
      }
      return NextResponse.json({ eligible_deal: null, message: 'No auto-apply deals available' })
    }

    // Filter deals by time restrictions
    const timeFilteredDeals = deals.filter((deal: any) => {
      if (deal.time_start && deal.time_stop) {
        if (currentTime < deal.time_start || currentTime > deal.time_stop) {
          return false
        }
      }
      return true
    })

    // Find the best eligible deal
    let bestDeal = null
    let bestDiscountValue = 0

    for (const deal of timeFilteredDeals) {
      // Check eligibility using the database function
      const { data: eligibilityResult, error: eligError } = await supabase
        .schema('menuca_v3')
        .rpc('validate_deal_eligibility', {
          p_deal_id: deal.id,
          p_order_total: subtotal || 0,
          p_service_type: service_type || null,
          p_customer_id: customer_id || null,
          p_customer_email: customer_email || null
        })

      if (eligError) {
        console.log('[Auto-Deals] Eligibility check error for deal', deal.id, ':', eligError.message)
        continue
      }

      const result = eligibilityResult?.[0]
      console.log('[Auto-Deals] Deal', deal.id, 'eligibility result:', JSON.stringify(result))
      
      if (result?.eligible) {
        // Calculate discount value - handle various deal_type naming conventions
        let discountValue = 0
        const dealType = deal.deal_type || ''
        if (dealType.includes('percent') || dealType === 'percentTotal') {
          discountValue = (subtotal * (deal.discount_percent || 0)) / 100
        } else if (dealType.includes('value') || dealType.includes('amount') || dealType === 'valueTotal') {
          discountValue = deal.discount_amount || 0
        }
        
        console.log('[Auto-Deals] Deal', deal.id, 'discount calculation:', { dealType, discount_percent: deal.discount_percent, subtotal, discountValue })

        // Keep track of best deal (highest discount)
        if (discountValue > bestDiscountValue) {
          bestDiscountValue = discountValue
          bestDeal = {
            id: deal.id,
            name: deal.name_en || deal.name,
            description: deal.description_en || deal.description,
            deal_type: deal.deal_type,
            discount_percent: deal.discount_percent,
            discount_amount: deal.discount_amount,
            is_first_order_only: deal.is_first_order_only,
            calculated_discount: discountValue
          }
        }
      } else {
        console.log('[Auto-Deals] Deal', deal.id, 'not eligible:', result?.reason)
      }
    }

    if (bestDeal) {
      return NextResponse.json({
        eligible_deal: bestDeal,
        applied: true,
        message: `Auto-applied: ${bestDeal.name}`
      })
    }

    return NextResponse.json({
      eligible_deal: null,
      applied: false,
      message: 'No eligible auto-apply deals for this order'
    })

  } catch (error) {
    console.error('[POST /api/customer/restaurants/[slug]/auto-deals]', error)
    return NextResponse.json(
      { error: 'Failed to check auto-apply deals' },
      { status: 500 }
    )
  }
}
