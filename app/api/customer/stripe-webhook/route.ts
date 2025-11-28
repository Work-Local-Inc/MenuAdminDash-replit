import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Use production Stripe key if available, fall back to test key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing required Stripe secret key. Set STRIPE_SECRET_KEY or TESTING_STRIPE_SECRET_KEY')
}

console.log('[Stripe Webhook] Using Stripe key:', stripeSecretKey.substring(0, 10) + '...')

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
      // For development without webhook secret
      event = JSON.parse(body)
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    // Check if event was already processed (idempotency)
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent) {
      return NextResponse.json({ received: true, status: 'already_processed' })
    }

    // Log the event
    await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event as any,
        processed: false,
      } as any)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Update payment transaction status
        await supabase
          .from('payment_transactions')
          .update({
            status: 'succeeded',
            updated_at: new Date().toISOString(),
          } as any)
          .eq('stripe_payment_intent_id', paymentIntent.id)

        // Update order payment status
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
          } as any)
          .eq('stripe_payment_intent_id', paymentIntent.id)

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Update payment transaction status
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
            updated_at: new Date().toISOString(),
          } as any)
          .eq('stripe_payment_intent_id', paymentIntent.id)

        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge

        // Update payment transaction with refund info
        await supabase
          .from('payment_transactions')
          .update({
            status: 'refunded',
            refund_amount: charge.amount_refunded / 100,
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
          .eq('stripe_charge_id', charge.id)

        break
      }
    }

    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true } as any)
      .eq('stripe_event_id', event.id)

    return NextResponse.json({ received: true, status: 'processed' })
  } catch (error: any) {
    console.error('Webhook processing error:', error)

    // Log error to webhook events table
    await supabase
      .from('stripe_webhook_events')
      .update({
        error_message: error.message,
      } as any)
      .eq('stripe_event_id', event.id)

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
