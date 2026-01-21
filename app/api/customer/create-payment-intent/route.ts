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
