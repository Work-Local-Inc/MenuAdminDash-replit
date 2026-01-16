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

// Commission config type
interface CommissionConfig {
  enabled: boolean
  rate: number // Percentage (e.g., 8 for 8%)
  base: 'gross' | 'net'
}

// Get restaurant's service config (payment mode + commission)
async function getRestaurantServiceConfig(restaurantSlug: string): Promise<{ paymentMode: 'test' | 'live', commission: CommissionConfig }> {
  try {
    const adminSupabase = createAdminClient() as any
    const restaurantId = extractIdFromSlug(restaurantSlug)
    
    if (!restaurantId) {
      console.log('[ServiceConfig] Could not extract restaurant ID from slug:', restaurantSlug)
      return { paymentMode: 'test', commission: { enabled: false, rate: 0, base: 'gross' } }
    }
    
    const { data: config } = await adminSupabase
      .from('delivery_and_pickup_configs')
      .select('payment_mode, commission_enabled, commission_rate, commission_base')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    
    const paymentMode = config?.payment_mode || 'test'
    const commission: CommissionConfig = config?.commission_enabled && config?.commission_rate
      ? { enabled: true, rate: config.commission_rate, base: config.commission_base || 'gross' }
      : { enabled: false, rate: 0, base: 'gross' }
    
    console.log(`[ServiceConfig] Restaurant ${restaurantId}: mode=${paymentMode}, commission=${commission.enabled ? `${commission.rate}% (${commission.base})` : 'disabled'}`)
    return { paymentMode, commission }
  } catch (error) {
    console.error('[ServiceConfig] Error fetching config:', error)
    return { paymentMode: 'test', commission: { enabled: false, rate: 0, base: 'gross' } }
  }
}

// Legacy function for backward compatibility
async function getRestaurantPaymentMode(restaurantSlug: string): Promise<'test' | 'live'> {
  const config = await getRestaurantServiceConfig(restaurantSlug)
  return config.paymentMode
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
    
    // Validate subtotal is reasonable (must be positive and not exceed total)
    // This prevents commission manipulation through invalid subtotal values
    const validatedSubtotal = subtotal && typeof subtotal === 'number' && subtotal > 0 && subtotal <= amount
      ? subtotal
      : null
    
    if (subtotal && !validatedSubtotal) {
      console.warn('[Payment Intent] Invalid subtotal rejected:', { subtotal, amount })
    }
    
    // Get restaurant's service config (payment mode + commission)
    const restaurantSlug = metadata?.restaurant_slug || ''
    const { paymentMode, commission } = await getRestaurantServiceConfig(restaurantSlug)
    const stripe = getStripe(paymentMode)
    
    // Calculate commission based on gross vs net setting
    // Gross: commission on total amount (subtotal + delivery + tax)
    // Net: commission on subtotal only (excludes delivery fee and tax)
    // NOTE: For 'net' mode, if subtotal is invalid/missing, we fall back to 'gross' (full amount)
    // This ensures commission is always charged correctly even if client manipulation is attempted
    let commissionAmount = 0
    if (commission.enabled && commission.rate > 0) {
      const commissionBase = commission.base === 'net' && validatedSubtotal 
        ? validatedSubtotal   // Net: validated subtotal only
        : amount              // Gross: total amount (or fallback if subtotal invalid)
      commissionAmount = Math.round(commissionBase * (commission.rate / 100) * 100) / 100
    }
    
    // Add commission to the total amount
    const totalWithCommission = amount + commissionAmount
    
    console.log('[Payment Intent] Commission calculation:', {
      baseAmount: amount,
      clientSubtotal: subtotal || 'not provided',
      validatedSubtotal: validatedSubtotal || 'fell back to gross',
      commissionBase: commission.base,
      commissionEnabled: commission.enabled,
      commissionRate: commission.rate,
      commissionAmount,
      totalWithCommission
    })

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

    // Create payment intent with commission included
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalWithCommission * 100), // Convert to cents (includes commission)
      currency: 'cad',
      customer: stripeCustomerId,
      shipping: stripeShipping, // Include shipping address for Canadian origin detection
      metadata: {
        user_id: user_id ? String(user_id) : 'guest',
        guest_email: guest_email || undefined,
        country: 'CA', // Explicitly mark as Canadian transaction
        payment_mode: paymentMode, // Store payment mode for reference
        commission_amount: String(commissionAmount), // Store commission for orders API
        commission_rate: String(commission.rate || 0),
        commission_base: commission.base || 'gross',
        base_amount: String(amount), // Store base amount before commission
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
