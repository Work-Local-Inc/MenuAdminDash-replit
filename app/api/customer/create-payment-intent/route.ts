import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

// Use TEST keys in development, LIVE keys in production
const stripeSecretKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing required Stripe secret key')
}

// Debug: Check which key we're using
console.log('[Payment Intent API] Using Stripe key:', stripeSecretKey.substring(0, 10) + '...')

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication (optional - support guest checkout)
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { amount, metadata, user_id, guest_email } = body

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
        .single()

      userDbId = userData?.id || null
      stripeCustomerId = userData?.stripe_customer_id

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
          await supabase
            .from('users')
            .update({ stripe_customer_id: stripeCustomerId } as any)
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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'cad',
      customer: stripeCustomerId,
      metadata: {
        user_id: user_id ? String(user_id) : 'guest',
        guest_email: guest_email || undefined,
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
