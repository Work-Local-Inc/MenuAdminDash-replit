import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

// Initialize Stripe lazily to avoid module-level errors in production
function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY
  
  if (!stripeSecretKey) {
    throw new Error('Missing required Stripe secret key')
  }
  
  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-11-17.clover',
  })
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe inside the request handler
    const stripe = getStripe()
    const supabase = await createClient() as any
    
    // Check authentication (optional - support guest checkout)
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { amount, metadata, user_id, guest_email, shipping_address } = body

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
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
