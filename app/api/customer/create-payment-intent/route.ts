import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'

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
  
  console.log(`[Stripe] Mode: ${paymentMode}, Source: ${keySource}, Key prefix: ${stripeSecretKey ? stripeSecretKey.substring(0, 12) + '...' : 'NOT SET'}`)
  
  if (!stripeSecretKey) {
    throw new Error(`Missing required Stripe secret key for ${paymentMode} mode (${keySource})`)
  }
  
  return new Stripe(stripeSecretKey, {})
}

// Get restaurant's payment mode from service config
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
    
    const mode = config?.payment_mode || 'test'
    console.log(`[PaymentMode] Restaurant ${restaurantId} payment mode: ${mode}`)
    return mode
  } catch (error) {
    console.error('[PaymentMode] Error fetching payment mode:', error)
    return 'test' // Default to test mode on error
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any
    
    // Check authentication (optional - support guest checkout)
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { amount, metadata, user_id, guest_email, shipping_address } = body
    
    // Get restaurant's payment mode and initialize Stripe with appropriate keys
    const restaurantSlug = metadata?.restaurant_slug || ''
    const paymentMode = await getRestaurantPaymentMode(restaurantSlug)
    const stripe = getStripe(paymentMode)

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

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

      // Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: userData?.email || user.email || undefined,
          name: userData?.first_name && userData?.last_name 
            ? `${userData.first_name} ${userData.last_name}`
            : undefined,
          metadata: {
            user_id: String(userData?.id || user.id),
          },
        })

        stripeCustomerId = customer.id

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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'cad',
      customer: stripeCustomerId,
      shipping: stripeShipping, // Include shipping address for Canadian origin detection
      metadata: {
        user_id: user_id ? String(user_id) : 'guest',
        guest_email: guest_email || undefined,
        country: 'CA', // Explicitly mark as Canadian transaction
        payment_mode: paymentMode, // Store payment mode for reference
        ...metadata,
      },
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
