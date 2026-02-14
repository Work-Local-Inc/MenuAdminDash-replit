import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'
export const dynamic = 'force-dynamic'

/**
 * Cart item input for targeting validation
 */
interface CartItemInput {
  dish_id: number;
  course_id?: number;
  quantity: number;
  item_subtotal: number;
}

/**
 * Check if a cart item is eligible based on coupon targeting rules
 */
function isItemEligible(
  item: CartItemInput,
  targetingType: string,
  targetingMode: string,
  targetingIds: number[]
): boolean {
  if (!targetingIds || targetingIds.length === 0) return true;
  
  const targetId = targetingType === 'dish' ? item.dish_id : item.course_id;
  
  // If course targeting but course_id is missing, cannot determine eligibility
  if (targetingType === 'course' && (targetId === undefined || targetId === null)) {
    // For include mode: item is NOT eligible (must be in list to qualify)
    // For exclude mode: item IS eligible (not in excluded list)
    return targetingMode !== 'include';
  }
  
  const isInList = targetingIds.includes(targetId as number);
  return targetingMode === 'include' ? isInList : !isInList;
}

/**
 * Check if targeting is effectively enabled
 */
function hasActiveTargeting(
  targetingType: string | null | undefined,
  targetingIds: number[] | null | undefined
): boolean {
  if (!targetingType || targetingType === 'all') return false;
  if (!targetingIds || targetingIds.length === 0) return false;
  return true;
}

// Validate coupon server-side and calculate discount
async function validateCouponServerSide(
  couponCode: string | undefined,
  restaurantId: number,
  subtotal: number,
  orderType: string,
  userId?: string | null,
  cartItems?: CartItemInput[]
): Promise<{ valid: boolean; discountAmount: number; promoId: number | null; promoType: string | null; code: string | null }> {
  if (!couponCode) {
    return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
  }

  try {
    const adminSupabase = createAdminClient() as any
    const code = couponCode.toUpperCase()
    const now = new Date()

    // Check promotional_coupons first
    const { data: coupon } = await adminSupabase
      .schema('menuca_v3')
      .from('promotional_coupons')
      .select('*')
      .eq('code', code)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (coupon) {
      // Validate coupon dates
      if (coupon.valid_from_at && new Date(coupon.valid_from_at) > now) {
        return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
      }
      if (coupon.valid_until_at && new Date(coupon.valid_until_at) < now) {
        return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
      }
      // Check order type restrictions
      if (coupon.order_type_restriction && coupon.order_type_restriction !== 'all') {
        const dbOrderType = orderType === 'pickup' ? 'takeout' : orderType
        if (coupon.order_type_restriction !== dbOrderType) {
          return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
        }
      }

      // Check total usage limit (max_redemptions)
      const maxRedemptions = coupon.max_redemptions ?? coupon.usage_limit
      if (maxRedemptions !== null && maxRedemptions !== undefined) {
        // Count actual usage from coupon_usage_log
        const { count: usageCount } = await adminSupabase
          .schema('menuca_v3')
          .from('coupon_usage_log')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
        
        if (usageCount !== null && usageCount >= maxRedemptions) {
          console.log(`[PaymentIntent] Coupon ${code} has reached usage limit: ${usageCount}/${maxRedemptions}`)
          return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
        }
      }

      // Check per-customer usage limit (max_uses_per_customer)
      const maxPerCustomer = coupon.max_uses_per_customer
      if (maxPerCustomer !== null && maxPerCustomer !== undefined && userId) {
        // Count this user's usage from coupon_usage_log
        const { count: userUsageCount } = await adminSupabase
          .schema('menuca_v3')
          .from('coupon_usage_log')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', userId)
        
        if (userUsageCount !== null && userUsageCount >= maxPerCustomer) {
          console.log(`[PaymentIntent] Coupon ${code} per-customer limit reached for user ${userId}: ${userUsageCount}/${maxPerCustomer}`)
          return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
        }
      }

      // Item Targeting Logic
      const targetingType = coupon.targeting_type || 'all'
      const targetingMode = coupon.targeting_mode || 'include'
      const targetingIds: number[] = coupon.targeting_ids || []
      
      const targetingEnabled = hasActiveTargeting(targetingType, targetingIds)
      
      let eligibleSubtotal = subtotal
      let eligibleItems: CartItemInput[] = []
      let enrichedCartItems: CartItemInput[] = []
      
      if (targetingEnabled && cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
        enrichedCartItems = [...cartItems]
        
        // For course targeting, fetch course_ids from dishes table if not provided
        if (targetingType === 'course') {
          const itemsNeedingCourse = enrichedCartItems.filter(item => item.course_id === undefined || item.course_id === null)
          
          if (itemsNeedingCourse.length > 0) {
            const dishIds = itemsNeedingCourse.map(item => item.dish_id)
            
            const { data: dishes, error: dishesError } = await adminSupabase
              .schema('menuca_v3')
              .from('dishes')
              .select('id, course_id')
              .in('id', dishIds)
            
            if (!dishesError && dishes) {
              const courseMap = new Map<number, number>()
              for (const dish of dishes) {
                if (dish.course_id) {
                  courseMap.set(dish.id, dish.course_id)
                }
              }
              
              enrichedCartItems = enrichedCartItems.map(item => ({
                ...item,
                course_id: item.course_id ?? courseMap.get(item.dish_id)
              }))
            }
          }
        }
        
        // Filter cart items to find eligible items
        eligibleItems = enrichedCartItems.filter(item => 
          isItemEligible(item, targetingType, targetingMode, targetingIds)
        )
        
        // Calculate eligible subtotal
        eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.item_subtotal || 0), 0)
        
        console.log(`[PaymentIntent] Targeting applied:`, {
          targetingType,
          targetingMode,
          targetingIds,
          totalItems: enrichedCartItems.length,
          eligibleItems: eligibleItems.length,
          eligibleSubtotal,
          totalSubtotal: subtotal
        })
        
        // If no items are eligible, coupon is invalid
        if (eligibleSubtotal === 0) {
          console.log(`[PaymentIntent] No eligible items for coupon ${code}`)
          return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
        }
      } else if (targetingEnabled) {
        // Targeting is enabled but no cart items provided - use full subtotal for backward compatibility
        console.log(`[PaymentIntent] Targeting enabled but no cart items provided, using full subtotal`)
      }
      
      // Use eligibleSubtotal for checks and discount calculation when targeting is active
      const subtotalForCalculation = targetingEnabled && cartItems && cartItems.length > 0 ? eligibleSubtotal : subtotal

      // Check minimum purchase requirement (supports both column names for backward compatibility)
      const minPurchase = coupon.minimum_purchase ?? coupon.minimum_order_amount
      if (minPurchase && subtotalForCalculation < parseFloat(String(minPurchase))) {
        console.log(`[PaymentIntent] Coupon ${code} minimum purchase not met: $${subtotalForCalculation} < $${minPurchase}`)
        return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
      }

      // Calculate discount - handle tiered discounts
      let discountAmount = 0
      
      if (coupon.discount_type === 'tiered' && coupon.discount_tiers && Array.isArray(coupon.discount_tiers)) {
        // Tiered discount: find applicable tier based on eligibleSubtotal
        const tiers = coupon.discount_tiers.sort((a: any, b: any) => b.threshold_amount - a.threshold_amount)
        let activeTier = null
        
        for (const tier of tiers) {
          if (subtotalForCalculation >= tier.threshold_amount) {
            activeTier = tier
            break
          }
        }
        
        if (activeTier) {
          if (activeTier.discount_type === 'percentage') {
            discountAmount = subtotalForCalculation * (activeTier.discount_value / 100)
          } else {
            discountAmount = activeTier.discount_value
          }
          console.log(`[PaymentIntent] Applied tiered discount: ${activeTier.discount_type === 'percentage' ? `${activeTier.discount_value}%` : `$${activeTier.discount_value}`} for subtotal $${subtotalForCalculation} (tier threshold: $${activeTier.threshold_amount})`)
        } else {
          // Subtotal doesn't meet any tier threshold - no discount
          console.log(`[PaymentIntent] Subtotal $${subtotalForCalculation} does not meet any tier threshold`)
          return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
        }
      } else if (coupon.discount_type === 'percentage') {
        discountAmount = subtotalForCalculation * (parseFloat(coupon.discount_value) / 100)
        if (coupon.max_discount_amount) {
          discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount))
        }
      } else {
        // Fixed discount: cap to subtotalForCalculation so discount doesn't exceed eligible amount
        discountAmount = Math.min(parseFloat(coupon.discount_value), subtotalForCalculation)
      }
      discountAmount = Math.round(discountAmount * 100) / 100 // Round to cents

      return { valid: true, discountAmount, promoId: coupon.id, promoType: 'coupon', code }
    }

    // Check promotional_deals
    const { data: deal } = await adminSupabase
      .schema('menuca_v3')
      .from('promotional_deals')
      .select('*')
      .eq('code', code)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (deal) {
      // Validate deal dates
      if (deal.valid_from_at && new Date(deal.valid_from_at) > now) {
        return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
      }
      if (deal.valid_until_at && new Date(deal.valid_until_at) < now) {
        return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
      }
      // Check minimum order
      if (deal.minimum_order_amount && subtotal < parseFloat(deal.minimum_order_amount)) {
        return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
      }

      // Check total usage limit for deals (max_total_uses)
      const maxTotalUses = deal.max_total_uses
      if (maxTotalUses !== null && maxTotalUses !== undefined) {
        // Count actual usage from coupon_usage_log (deals also logged here with promo_type='deal')
        const { count: usageCount } = await adminSupabase
          .schema('menuca_v3')
          .from('coupon_usage_log')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', deal.id)
        
        if (usageCount !== null && usageCount >= maxTotalUses) {
          console.log(`[PaymentIntent] Deal ${code} has reached usage limit: ${usageCount}/${maxTotalUses}`)
          return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
        }
      }

      // Check per-customer usage limit for deals (max_uses_per_user)
      const maxPerUser = deal.max_uses_per_user
      if (maxPerUser !== null && maxPerUser !== undefined && userId) {
        const { count: userUsageCount } = await adminSupabase
          .schema('menuca_v3')
          .from('coupon_usage_log')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', deal.id)
          .eq('user_id', userId)
        
        if (userUsageCount !== null && userUsageCount >= maxPerUser) {
          console.log(`[PaymentIntent] Deal ${code} per-customer limit reached for user ${userId}: ${userUsageCount}/${maxPerUser}`)
          return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
        }
      }

      // Calculate discount
      let discountAmount = 0
      if (deal.discount_type === 'percentage') {
        discountAmount = subtotal * (parseFloat(deal.discount_value) / 100)
        if (deal.max_discount_amount) {
          discountAmount = Math.min(discountAmount, parseFloat(deal.max_discount_amount))
        }
      } else {
        discountAmount = parseFloat(deal.discount_value)
      }
      discountAmount = Math.round(discountAmount * 100) / 100

      return { valid: true, discountAmount, promoId: deal.id, promoType: 'deal', code }
    }

    return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
  } catch (error) {
    console.error('[PaymentIntent] Coupon validation error:', error)
    return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
  }
}

// Get Stripe instance based on payment mode (test or live)
function getStripe(paymentMode: 'test' | 'live' = 'test') {
  let stripeSecretKey: string | undefined
  let keySource: string = ''
  
  if (paymentMode === 'live') {
    // Use LIVE Stripe keys for real payments
    stripeSecretKey = process.env.STRIPE_SECRET_KEY
    keySource = 'STRIPE_SECRET_KEY'
  } else {
    // Use TEST Stripe keys for testing - NO FALLBACK to live key
    stripeSecretKey = process.env.TESTING_STRIPE_SECRET_KEY
    keySource = 'TESTING_STRIPE_SECRET_KEY'
  }
  
  // Log full key structure for debugging (safe - only shows first 20 chars which is public info anyway)
  console.log(`[Stripe] Mode: ${paymentMode}, Source: ${keySource}`)
  console.log(`[Stripe] Secret key (first 25 chars): ${stripeSecretKey ? stripeSecretKey.substring(0, 25) : 'NOT SET'}`)
  
  // Also log what publishable key SHOULD be used to ensure they match
  const expectedPubKey = paymentMode === 'live' 
    ? process.env.VITE_STRIPE_PUBLIC_KEY 
    : process.env.NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY
  console.log(`[Stripe] Expected matching publishable key (first 25 chars): ${expectedPubKey ? expectedPubKey.substring(0, 25) : 'NOT SET'}`)
  
  if (!stripeSecretKey) {
    throw new Error(`Missing required Stripe secret key for ${paymentMode} mode (${keySource})`)
  }
  
  return new Stripe(stripeSecretKey, {})
}

// Get restaurant's payment mode (test or live)
async function getRestaurantPaymentMode(restaurantSlug: string): Promise<'test' | 'live'> {
  try {
    const adminSupabase = createAdminClient() as any
    const restaurantId = extractIdFromSlug(restaurantSlug)
    
    if (!restaurantId) {
      console.log('[PaymentMode] Could not extract restaurant ID from slug:', restaurantSlug)
      return 'test'
    }
    
    const { data: config } = await adminSupabase
      .from('delivery_and_pickup_configs')
      .select('payment_mode')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    
    const paymentMode = config?.payment_mode || 'test'
    console.log(`[PaymentMode] Restaurant ${restaurantId}: mode=${paymentMode}`)
    return paymentMode
  } catch (error) {
    console.error('[PaymentMode] Error fetching config:', error)
    return 'test'
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any
    
    // Check authentication (optional - support guest checkout)
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { amount, subtotal, metadata, user_id, guest_email, shipping_address, cart_items } = body
    
    // Basic validation
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    
    // Get restaurant's payment mode
    const restaurantSlug = metadata?.restaurant_slug || ''
    const paymentMode = await getRestaurantPaymentMode(restaurantSlug)
    const stripe = getStripe(paymentMode)

    // For guests, require email
    if (!user && !guest_email) {
      return NextResponse.json({ error: 'Email required for guest checkout' }, { status: 400 })
    }

    let stripeCustomerId: string | undefined = undefined
    let userDbId: number | null = null

    // LOGGED-IN USER: Get or create Stripe customer
    if (user) {
      const adminSupabase = createAdminClient() as any
      let userData: { id: number; stripe_customer_id: string | null; email: string; first_name: string | null; last_name: string | null } | null = null

      // Primary lookup: by auth_user_id
      const { data: primaryResult } = await adminSupabase
        .schema('menuca_v3')
        .from('users')
        .select('id, stripe_customer_id, email, first_name, last_name')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      
      userData = primaryResult

      // Fallback: check by email or phone if auth_user_id not linked
      if (!userData) {
        const userEmail = user.email || guest_email
        if (userEmail) {
          const { data } = await adminSupabase
            .schema('menuca_v3')
            .from('users')
            .select('id, stripe_customer_id, email, first_name, last_name, auth_user_id')
            .eq('email', userEmail)
            .maybeSingle()
          if (data) {
            userData = data
            if (!data.auth_user_id) {
              await adminSupabase
                .schema('menuca_v3')
                .from('users')
                .update({ auth_user_id: user.id })
                .eq('id', data.id)
              console.log('[PaymentIntent] Linked auth account to existing user:', data.id)
            }
          }
        }
        if (!userData && user.phone) {
          const { data } = await adminSupabase
            .schema('menuca_v3')
            .from('users')
            .select('id, stripe_customer_id, email, first_name, last_name, auth_user_id')
            .eq('phone', user.phone)
            .maybeSingle()
          if (data) {
            userData = data
            if (!data.auth_user_id) {
              await adminSupabase
                .schema('menuca_v3')
                .from('users')
                .update({ auth_user_id: user.id })
                .eq('id', data.id)
              console.log('[PaymentIntent] Linked auth account to existing user by phone:', data.id)
            }
          }
        }
      }

      userDbId = userData?.id || null
      stripeCustomerId = userData?.stripe_customer_id || undefined

      // Helper to create a new Stripe customer
      const createNewCustomer = async () => {
        const customer = await stripe.customers.create({
          email: userData?.email || user.email || undefined,
          name: userData?.first_name && userData?.last_name 
            ? `${userData.first_name} ${userData.last_name}`
            : undefined,
          metadata: {
            user_id: String(userData?.id || user.id),
            payment_mode: paymentMode,
          },
        })
        return customer.id
      }

      // If we have an existing customer ID, verify it exists in current Stripe mode
      if (stripeCustomerId) {
        try {
          await stripe.customers.retrieve(stripeCustomerId)
          console.log(`[Stripe] Customer ${stripeCustomerId} found in ${paymentMode} mode`)
        } catch (error: any) {
          if (error.code === 'resource_missing' || error.message?.includes('No such customer')) {
            console.log(`[Stripe] Customer ${stripeCustomerId} not found in ${paymentMode} mode, creating new one`)
            stripeCustomerId = await createNewCustomer()
            
            // Note: We don't update the DB here because the customer might still be valid in the other mode
            // A proper solution would use separate columns for test/live customer IDs
          } else {
            throw error
          }
        }
      } else {
        // No existing customer, create one
        stripeCustomerId = await createNewCustomer()

        // Update user with Stripe customer ID  
        if (userData?.id) {
          const updateData = { stripe_customer_id: stripeCustomerId }
          await adminSupabase
            .schema('menuca_v3')
            .from('users')
            .update(updateData)
            .eq('id', userData.id)
        }
      }
    }
    // GUEST: Create anonymous Stripe customer
    else if (guest_email) {
      const customer = await stripe.customers.create({
        email: guest_email,
        metadata: {
          guest_checkout: 'true',
        },
      })
      stripeCustomerId = customer.id
    }

    // Build shipping address for Stripe (helps with country detection)
    const stripeShipping = shipping_address ? {
      name: shipping_address.name || guest_email || 'Customer',
      address: {
        line1: shipping_address.street_address || shipping_address.street,
        line2: shipping_address.unit || undefined,
        city: shipping_address.city_name || shipping_address.city,
        state: shipping_address.province || 'ON',
        postal_code: shipping_address.postal_code,
        country: 'CA', // Explicitly set Canada
      },
    } : undefined

    // SECURITY: Validate coupon server-side instead of trusting client-provided discount
    const restaurantId = extractIdFromSlug(restaurantSlug)
    let validatedCoupon = { valid: false, discountAmount: 0, promoId: null as number | null, promoType: null as string | null, code: null as string | null }
    
    if (restaurantId && metadata?.coupon_code) {
      validatedCoupon = await validateCouponServerSide(
        metadata.coupon_code,
        restaurantId,
        subtotal || 0,
        metadata?.order_type || 'delivery',
        user_id || null,
        cart_items
      )
      console.log('[PaymentIntent] Server-side coupon validation:', validatedCoupon)
    }

    // Build metadata with server-validated coupon data (overrides client-provided values)
    const { coupon_code: clientCouponCode, discount_amount: clientDiscount, promo_id: clientPromoId, promo_type: clientPromoType, ...otherMetadata } = metadata || {}
    
    const paymentMetadata: Record<string, string> = {
      restaurant_id: restaurantId ? String(restaurantId) : '',
      user_id: user_id ? String(user_id) : 'guest',
      guest_email: guest_email || undefined,
      country: 'CA',
      payment_mode: paymentMode,
      ...otherMetadata,
    }
    
    // Only include coupon data if server-side validation passed
    if (validatedCoupon.valid) {
      paymentMetadata.coupon_code = validatedCoupon.code || ''
      paymentMetadata.discount_amount = String(validatedCoupon.discountAmount)
      paymentMetadata.promo_id = validatedCoupon.promoId ? String(validatedCoupon.promoId) : ''
      paymentMetadata.promo_type = validatedCoupon.promoType || ''
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'cad',
      customer: stripeCustomerId,
      shipping: stripeShipping, // Include shipping address for Canadian origin detection
      metadata: paymentMetadata,
      payment_method_types: ['card'],
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: any) {
    console.error('[Payment Intent] Error:', error.message)
    console.error('[Payment Intent] Full error:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent', details: error.type || 'unknown' },
      { status: 500 }
    )
  }
}
