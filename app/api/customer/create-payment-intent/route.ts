import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'

// Validate coupon server-side and calculate discount
async function validateCouponServerSide(
  couponCode: string | undefined,
  restaurantId: number,
  subtotal: number,
  orderType: string
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
      // Check minimum order
      if (coupon.minimum_order_amount && subtotal < parseFloat(coupon.minimum_order_amount)) {
        return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
      }
      // Check order type restrictions
      if (coupon.order_type_restriction && coupon.order_type_restriction !== 'all') {
        const dbOrderType = orderType === 'pickup' ? 'takeout' : orderType
        if (coupon.order_type_restriction !== dbOrderType) {
          return { valid: false, discountAmount: 0, promoId: null, promoType: null, code: null }
        }
      }

      // Calculate discount
      let discountAmount = 0
      if (coupon.discount_type === 'percentage') {
        discountAmount = subtotal * (parseFloat(coupon.discount_value) / 100)
        if (coupon.max_discount_amount) {
          discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount))
        }
      } else {
        discountAmount = parseFloat(coupon.discount_value)
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
    const { amount, subtotal, metadata, user_id, guest_email, shipping_address } = body
    
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
      const { data: userData } = await supabase
        .from('users')
        .select('id, stripe_customer_id, email, first_name, last_name')
        .eq('auth_user_id', user.id)
        .single() as { data: { id: number; stripe_customer_id: string | null; email: string; first_name: string | null; last_name: string | null } | null }

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
          await (supabase
            .from('users') as any)
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
        metadata?.order_type || 'delivery'
      )
      console.log('[PaymentIntent] Server-side coupon validation:', validatedCoupon)
    }

    // Build metadata with server-validated coupon data (overrides client-provided values)
    const { coupon_code: clientCouponCode, discount_amount: clientDiscount, promo_id: clientPromoId, promo_type: clientPromoType, ...otherMetadata } = metadata || {}
    
    const paymentMetadata: Record<string, string> = {
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
      automatic_payment_methods: {
        enabled: true,
      },
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
