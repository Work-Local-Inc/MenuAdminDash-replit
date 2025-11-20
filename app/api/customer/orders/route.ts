import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractIdFromSlug } from '@/lib/utils/slugify'
import Stripe from 'stripe'
import { sendOrderConfirmationEmail } from '@/lib/emails/service'

// Use TEST keys in development, LIVE keys in production
const stripeSecretKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing required Stripe secret key')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication (optional - support guest checkout)
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { payment_intent_id, delivery_address, cart_items, user_id, guest_email } = body

    console.log('[Order API] Request:', { 
      payment_intent_id: payment_intent_id?.substring(0, 20) + '...', 
      has_user: !!user,
      guest_email,
      cart_items_count: cart_items?.length 
    })

    if (!payment_intent_id) {
      console.error('[Order API] Missing payment_intent_id')
      return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 })
    }

    if (!cart_items || cart_items.length === 0) {
      console.error('[Order API] Missing or empty cart_items')
      return NextResponse.json({ error: 'Cart items required' }, { status: 400 })
    }

    // For guests, require email
    if (!user && !guest_email) {
      console.error('[Order API] Guest checkout missing email')
      return NextResponse.json({ error: 'Email required for guest checkout' }, { status: 400 })
    }

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)
    
    // SECURITY: Verify payment belongs to this user/guest
    const expectedUserId = user_id ? String(user_id) : 'guest'
    if (paymentIntent.metadata.user_id !== expectedUserId) {
      return NextResponse.json({ error: 'Payment mismatch' }, { status: 401 })
    }

    // SECURITY: For guests, verify email matches
    if (!user && paymentIntent.metadata.guest_email !== guest_email) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 401 })
    }

    // SECURITY: Only process succeeded payments
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Extract order details from payment intent metadata
    const metadata = paymentIntent.metadata
    const restaurantSlug = metadata.restaurant_slug
    
    if (!restaurantSlug) {
      return NextResponse.json({ error: 'Invalid payment intent metadata' }, { status: 400 })
    }

    // Extract restaurant ID from slug
    const restaurantId = extractIdFromSlug(restaurantSlug)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Invalid restaurant identifier' }, { status: 400 })
    }

    // SECURITY: Check if this payment intent was already used (prevent replay attacks)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .single() as { data: { id: number } | null }

    if (existingOrder) {
      return NextResponse.json({ 
        error: 'This payment has already been processed',
        order_id: existingOrder.id 
      }, { status: 409 })
    }
    
    // Get restaurant with delivery zones for delivery fee (logo_url column doesn't exist)
    console.log('[Order API] Looking for restaurant ID:', restaurantId)
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select(`
        id, 
        name,
        restaurant_delivery_zones(id, delivery_fee_cents, is_active, deleted_at)
      `)
      .eq('id', restaurantId)
      .single() as { 
        data: { 
          id: number; 
          name: string;
          restaurant_delivery_zones: { id: number; delivery_fee_cents: number; is_active: boolean; deleted_at: string | null }[]
        } | null; 
        error: any 
      }

    if (restaurantError || !restaurant) {
      console.error('[Order API] Restaurant query error:', restaurantError)
      console.error('[Order API] Restaurant data:', restaurant)
      return NextResponse.json({ error: 'Restaurant not found', details: restaurantError }, { status: 404 })
    }

    console.log('[Order API] Found restaurant:', restaurant.id, restaurant.name)

    // SECURITY: Recompute totals on server to prevent client manipulation
    let serverSubtotal = 0
    const validatedItems = []

    for (const item of cart_items) {
      // SECURITY: Validate quantity is positive
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return NextResponse.json({ 
          error: 'Invalid quantity - must be a positive integer' 
        }, { status: 400 })
      }

      // SECURITY: Verify dish belongs to this restaurant before fetching price
      const { data: dish } = await supabase
        .from('dishes')
        .select('id, restaurant_id, name')
        .eq('id', item.dishId)
        .eq('restaurant_id', restaurant.id)
        .single() as { data: { id: number; restaurant_id: number; name: string } | null }

      if (!dish) {
        return NextResponse.json({ 
          error: `Dish ${item.dishId} does not belong to this restaurant` 
        }, { status: 400 })
      }

      // Fetch actual price from database (column is size_variant, not size)
      console.log(`[Order API] Looking for price - dish: ${item.dishId}, size_variant: "${item.size}"`)
      const { data: dishPrice, error: priceError } = await supabase
        .from('dish_prices')
        .select('price, size_variant')
        .eq('dish_id', item.dishId)
        .eq('size_variant', item.size)
        .eq('is_active', true)
        .single() as { data: { price: string; size_variant: string } | null; error: any }

      if (!dishPrice) {
        // Get available sizes for better error message
        const { data: availableSizes } = await supabase
          .from('dish_prices')
          .select('size_variant, price')
          .eq('dish_id', item.dishId)
          .eq('is_active', true)
        
        console.error(`[Order API] Price not found for dish ${item.dishId}, size_variant: "${item.size}"`)
        console.error('[Order API] Available size_variants:', availableSizes)
        console.error('[Order API] Price query error:', priceError)
        return NextResponse.json({ 
          error: `Invalid dish price: dish ${item.dishId}, size "${item.size}" not found. Available sizes: ${JSON.stringify(availableSizes)}` 
        }, { status: 400 })
      }

      console.log(`[Order API] Found price: ${dishPrice.price} for size_variant "${dishPrice.size_variant}"`)

      // Calculate item total using server prices
      let itemTotal = parseFloat(dishPrice.price) * item.quantity
      
      // SECURITY: Validate modifier prices from database and verify they belong to this dish
      let validatedModifiers = []
      if (item.modifiers && item.modifiers.length > 0) {
        // Step 1: Get all modifier groups for this dish
        const { data: dishModifierGroups, error: groupsError } = await supabase
          .from('modifier_groups')
          .select('id')
          .eq('dish_id', item.dishId) as { data: { id: number }[] | null; error: any }
        
        if (groupsError) {
          console.error(`[Order API] Failed to fetch modifier groups for dish ${item.dishId}:`, groupsError)
          return NextResponse.json({ 
            error: `Failed to validate modifiers for dish ${item.dishId}` 
          }, { status: 500 })
        }

        if (!dishModifierGroups || dishModifierGroups.length === 0) {
          console.error(`[Order API] No modifier groups found for dish ${item.dishId}`)
          return NextResponse.json({ 
            error: `Dish ${item.dishId} does not have modifiers` 
          }, { status: 400 })
        }

        const validGroupIds = dishModifierGroups.map(g => g.id)

        // Step 2: Validate each modifier belongs to one of those groups
        for (const mod of item.modifiers) {
          const { data: modifierData, error: modifierError } = await supabase
            .from('dish_modifiers')
            .select('id, modifier_group_id, name, price, is_active')
            .eq('id', mod.id)
            .single() as { data: { id: number; modifier_group_id: number; name: string; price: string; is_active: boolean } | null; error: any }

          if (modifierError || !modifierData) {
            console.error(`[Order API] Modifier ${mod.id} not found:`, modifierError)
            return NextResponse.json({ 
              error: `Invalid modifier ${mod.id}` 
            }, { status: 400 })
          }

          // Verify modifier is active
          if (!modifierData.is_active) {
            console.error(`[Order API] Modifier ${mod.id} is not active`)
            return NextResponse.json({ 
              error: `Modifier ${mod.id} is not available` 
            }, { status: 400 })
          }

          // Verify modifier's group belongs to this dish
          if (!validGroupIds.includes(modifierData.modifier_group_id)) {
            console.error(`[Order API] Modifier ${mod.id} (group ${modifierData.modifier_group_id}) does not belong to dish ${item.dishId}`)
            return NextResponse.json({ 
              error: `Invalid modifier ${mod.id} for dish ${item.dishId}` 
            }, { status: 400 })
          }

          // Step 3: Use the price column directly
          const modPrice = parseFloat(modifierData.price)

          itemTotal += modPrice * item.quantity
          validatedModifiers.push({
            id: mod.id,
            name: modifierData.name,
            price: modPrice
          })
        }
      }

      serverSubtotal += itemTotal
      validatedItems.push({
        dish_id: item.dishId,
        name: dish.name,
        size: item.size,
        quantity: item.quantity,
        unit_price: parseFloat(dishPrice.price),
        modifiers: validatedModifiers,
        subtotal: itemTotal
      })
    }

    // Calculate fees and tax on server
    // Get delivery fee from first active delivery zone (or $0 if none configured)
    const activeZone = restaurant.restaurant_delivery_zones?.find(
      zone => zone.is_active && !zone.deleted_at
    )
    const deliveryFeeCents = activeZone?.delivery_fee_cents ?? 0
    const deliveryFee = deliveryFeeCents / 100
    const tax = (serverSubtotal + deliveryFee) * 0.13 // 13% HST
    const serverTotal = serverSubtotal + deliveryFee + tax

    // SECURITY: Verify payment amount matches server-calculated total
    const paymentTotal = paymentIntent.amount / 100
    if (Math.abs(paymentTotal - serverTotal) > 0.01) {
      console.error('Total mismatch:', { paymentTotal, serverTotal })
      return NextResponse.json({ 
        error: 'Payment amount does not match order total',
        details: { expected: serverTotal, received: paymentTotal }
      }, { status: 400 })
    }

    // Create order with server-validated data
    const orderData = {
      user_id: user_id || null, // NULL for guest orders
      is_guest_order: !user_id, // TRUE for guest checkouts
      guest_email: guest_email || null,
      guest_phone: user_id ? null : '000-000-0000', // TODO: Collect phone in checkout form
      guest_name: user_id ? null : delivery_address.name || 'Guest Customer',
      restaurant_id: restaurant.id,
      // NOTE: No 'status' column - order status tracked in order_status_history table
      payment_status: 'paid',
      stripe_payment_intent_id: payment_intent_id,
      total_amount: serverTotal,
      subtotal: serverSubtotal,
      delivery_fee: deliveryFee,
      tax_amount: tax,
      items: validatedItems,
      delivery_address: delivery_address,
      delivery_instructions: delivery_address.delivery_instructions || null,
      created_at: new Date().toISOString(),
    }

    // Create order (protected by UNIQUE constraint on stripe_payment_intent_id)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData as any)
      .select()
      .single() as { data: { id: number; created_at: string } | null; error: any }

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      
      // SECURITY: Handle duplicate payment intent (race condition or replay attack)
      if (orderError?.code === '23505') { // PostgreSQL unique violation
        return NextResponse.json({ 
          error: 'This payment has already been processed (concurrent request detected)',
        }, { status: 409 })
      }
      
      throw new Error('Failed to create order')
    }

    // Create payment transaction record
    await supabase
      .from('payment_transactions')
      .insert({
        order_id: order.id,
        order_created_at: order.created_at,
        user_id: user_id || null,
        restaurant_id: restaurant.id,
        stripe_payment_intent_id: payment_intent_id,
        stripe_charge_id: paymentIntent.latest_charge as string,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: 'succeeded',
        payment_method: paymentIntent.payment_method_types[0] || 'card',
      } as any)

    // Create initial order status
    await supabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        order_created_at: order.created_at,
        status: 'pending',
        notes: 'Order placed and payment confirmed',
      } as any)

    // Send order confirmation email (don't fail order if email fails)
    const customerEmail = user?.email || guest_email
    if (customerEmail) {
      try {
        await sendOrderConfirmationEmail({
          orderNumber: order.id.toString(),
          restaurantName: restaurant.name,
          restaurantLogoUrl: undefined, // logo_url column doesn't exist
          items: validatedItems,
          deliveryAddress: delivery_address,
          subtotal: serverSubtotal,
          deliveryFee: deliveryFee,
          tax: tax,
          taxLabel: 'HST (13%)',
          total: serverTotal,
          customerEmail,
        })
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError)
      }
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}

// GET endpoint for fetching user's orders
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's orders (logo_url column doesn't exist)
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(id, name, slug)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(orders || [])
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
