import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { sendOrderConfirmationEmail } from '@/lib/emails/service'
import { extractIdFromSlug } from '@/lib/utils/slugify'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { payment_intent_id, delivery_address, cart_items } = body

    if (!payment_intent_id) {
      return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 })
    }

    if (!cart_items || cart_items.length === 0) {
      return NextResponse.json({ error: 'Cart items required' }, { status: 400 })
    }

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)
    
    // SECURITY: Verify payment belongs to this user
    if (paymentIntent.metadata.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    
    // Get restaurant with service config for fees
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, logo_url, restaurant_service_configs(delivery_fee_cents)')
      .eq('id', restaurantId)
      .single() as { data: { id: number; name: string; logo_url: string | null; restaurant_service_configs: { delivery_fee_cents: number }[] } | null }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

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

      // Fetch actual price from database
      const { data: dishPrice } = await supabase
        .from('dish_prices')
        .select('price')
        .eq('dish_id', item.dishId)
        .eq('size', item.size)
        .single() as { data: { price: string } | null }

      if (!dishPrice) {
        return NextResponse.json({ error: `Invalid dish price: ${item.dishId}` }, { status: 400 })
      }

      // Calculate item total using server prices
      let itemTotal = parseFloat(dishPrice.price) * item.quantity
      
      // SECURITY: Validate modifier prices from database and verify they belong to this dish
      let validatedModifiers = []
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          // Get modifier and verify it belongs to a modifier group for this dish
          const { data: modifierData } = await supabase
            .from('dish_modifiers')
            .select(`
              id,
              name,
              modifier_group:modifier_groups!inner(
                id,
                dish_id
              )
            `)
            .eq('id', mod.id)
            .single() as { data: { id: number; name: string; modifier_group: { id: number; dish_id: number } } | null }

          if (!modifierData || modifierData.modifier_group.dish_id !== item.dishId) {
            return NextResponse.json({ 
              error: `Invalid modifier ${mod.id} for dish ${item.dishId}` 
            }, { status: 400 })
          }

          // Get modifier price from dish_modifier_prices table
          const { data: priceData } = await supabase
            .from('dish_modifier_prices')
            .select('price')
            .eq('dish_modifier_id', mod.id)
            .eq('dish_id', item.dishId)
            .eq('is_active', true)
            .single() as { data: { price: string } | null }

          if (!priceData) {
            return NextResponse.json({ 
              error: `Invalid modifier price for modifier ${mod.id}` 
            }, { status: 400 })
          }

          const modPrice = parseFloat(priceData.price)
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
    const deliveryFee = (restaurant.restaurant_service_configs?.[0]?.delivery_fee_cents || 500) / 100
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
      user_id: user.id,
      restaurant_id: restaurant.id,
      status: 'pending',
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
        user_id: user.id,
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
    try {
      await sendOrderConfirmationEmail({
        orderNumber: order.id.toString(),
        restaurantName: restaurant.name,
        restaurantLogoUrl: restaurant.logo_url || undefined,
        items: validatedItems,
        deliveryAddress: delivery_address,
        subtotal: serverSubtotal,
        deliveryFee: deliveryFee,
        tax: tax,
        total: serverTotal,
        customerEmail: user.email!,
      })
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError)
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

    // Fetch user's orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(id, name, slug, logo_url)
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
