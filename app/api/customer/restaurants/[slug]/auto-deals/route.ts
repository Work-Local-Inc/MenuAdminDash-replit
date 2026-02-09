import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

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

    // Input validation
    const validatedSubtotal = typeof subtotal === 'number' && subtotal >= 0 ? subtotal : 0
    const validServiceTypes = ['pickup', 'delivery']
    const validatedServiceType = validServiceTypes.includes(service_type) ? service_type : null
    const validatedEmail = typeof customer_email === 'string' && customer_email.includes('@') ? customer_email : null
    const validatedCustomerId = typeof customer_id === 'number' && customer_id > 0 ? customer_id : null

    // Extract restaurant ID from slug (format: restaurant-name-123)
    const slugParts = slug.split('-')
    const restaurantId = parseInt(slugParts[slugParts.length - 1])

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant slug' }, { status: 400 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

    // Fetch active deals that don't require a promo code (auto-apply deals)
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
    
    if (dealsError) {
      console.error('[Auto-Deals] Error fetching deals:', dealsError)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    if (!deals || deals.length === 0) {
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
      // Check eligibility using the database function with validated inputs
      const { data: eligibilityResult, error: eligError } = await supabase
        .schema('menuca_v3')
        .rpc('validate_deal_eligibility', {
          p_deal_id: deal.id,
          p_order_total: validatedSubtotal,
          p_service_type: validatedServiceType,
          p_customer_id: validatedCustomerId,
          p_customer_email: validatedEmail
        })

      if (eligError) {
        console.log('[Auto-Deals] Eligibility check error for deal', deal.id, ':', eligError.message)
        continue
      }

      const result = eligibilityResult?.[0]
      
      if (result?.eligible) {
        // Calculate discount value - handle various deal_type naming conventions
        let discountValue = 0
        const dealType = deal.deal_type || ''
        if (dealType.includes('percent') || dealType === 'percentTotal') {
          discountValue = (validatedSubtotal * (deal.discount_percent || 0)) / 100
        } else if (dealType.includes('value') || dealType.includes('amount') || dealType === 'valueTotal') {
          discountValue = deal.discount_amount || 0
        }

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
