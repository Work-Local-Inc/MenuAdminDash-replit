import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const JJS_RESTAURANT_ID = 1021

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'menuca_v3' }
})

async function getPaymentMode(): Promise<'test' | 'live'> {
  const { data, error } = await supabase
    .from('delivery_and_pickup_configs')
    .select('payment_mode')
    .eq('restaurant_id', JJS_RESTAURANT_ID)
    .single()

  if (error) {
    console.log(`Could not fetch payment mode, defaulting to 'live': ${error.message}`)
    return 'live'
  }
  return (data?.payment_mode as 'test' | 'live') || 'test'
}

async function main() {
  console.log(`\n=== JJ's Shawarma (ID ${JJS_RESTAURANT_ID}) Bulk Refund Script ===\n`)

  const paymentMode = await getPaymentMode()
  console.log(`Payment mode for JJ's: ${paymentMode}`)

  const liveStripeKey = process.env.STRIPE_SECRET_KEY
  const testStripeKey = process.env.TESTING_STRIPE_SECRET_KEY

  const stripeInstances: { mode: string; stripe: Stripe }[] = []

  if (liveStripeKey) {
    stripeInstances.push({ mode: 'live', stripe: new Stripe(liveStripeKey, {}) })
  }
  if (testStripeKey) {
    stripeInstances.push({ mode: 'test', stripe: new Stripe(testStripeKey, {}) })
  }

  if (stripeInstances.length === 0) {
    console.error('No Stripe keys available (need STRIPE_SECRET_KEY or TESTING_STRIPE_SECRET_KEY)')
    process.exit(1)
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, stripe_payment_intent_id, total_amount, payment_status, created_at, guest_name, guest_email')
    .eq('restaurant_id', JJS_RESTAURANT_ID)
    .not('stripe_payment_intent_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error.message)
    process.exit(1)
  }

  if (!orders || orders.length === 0) {
    console.log('No orders found for JJ\'s Shawarma with Stripe payment intents.')
    return
  }

  console.log(`Found ${orders.length} orders with Stripe payment intents\n`)

  let refunded = 0
  let alreadyRefunded = 0
  let failed = 0
  let notFound = 0

  for (const order of orders) {
    const piId = order.stripe_payment_intent_id
    if (!piId) continue

    console.log(`--- Order #${order.id} | PI: ${piId} | $${Number(order.total_amount || 0).toFixed(2)} | ${order.payment_status} | ${order.guest_name || order.guest_email || 'N/A'} ---`)

    let refundedThisOrder = false

    for (const { mode, stripe } of stripeInstances) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId)

        if (pi.status === 'canceled' || pi.status === 'requires_payment_method') {
          console.log(`  [${mode}] PI status: ${pi.status} — nothing to refund`)
          refundedThisOrder = true
          alreadyRefunded++
          break
        }

        if (pi.status !== 'succeeded') {
          console.log(`  [${mode}] PI status: ${pi.status} — skipping (not a completed payment)`)
          refundedThisOrder = true
          alreadyRefunded++
          break
        }

        const existingRefunds = await stripe.refunds.list({ payment_intent: piId })
        const totalRefunded = existingRefunds.data.reduce((sum, r) => sum + (r.amount || 0), 0)

        if (totalRefunded >= pi.amount!) {
          console.log(`  [${mode}] Already fully refunded ($${(totalRefunded / 100).toFixed(2)})`)
          refundedThisOrder = true
          alreadyRefunded++
          break
        }

        const remainingAmount = pi.amount! - totalRefunded
        console.log(`  [${mode}] Refunding $${(remainingAmount / 100).toFixed(2)}...`)

        const refund = await stripe.refunds.create({
          payment_intent: piId,
          amount: remainingAmount,
          reason: 'requested_by_customer',
          metadata: {
            refund_reason: 'testing payment processor',
            bulk_refund: 'true',
            restaurant_id: String(JJS_RESTAURANT_ID),
            order_id: String(order.id)
          }
        })

        console.log(`  [${mode}] Refund successful: ${refund.id} ($${(refund.amount / 100).toFixed(2)})`)
        refundedThisOrder = true
        refunded++
        break
      } catch (err: any) {
        if (err.code === 'resource_missing') {
          continue
        }
        console.log(`  [${mode}] Error: ${err.message}`)
        failed++
        refundedThisOrder = true
        break
      }
    }

    if (!refundedThisOrder) {
      console.log(`  PI not found on any Stripe account`)
      notFound++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Total orders processed: ${orders.length}`)
  console.log(`Refunded: ${refunded}`)
  console.log(`Already refunded/canceled: ${alreadyRefunded}`)
  console.log(`Failed: ${failed}`)
  console.log(`Not found on Stripe: ${notFound}`)
  console.log(`\nDone!`)
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
