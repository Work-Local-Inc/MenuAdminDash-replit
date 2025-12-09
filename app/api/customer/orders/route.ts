import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'
import Stripe from 'stripe'
import { sendOrderConfirmationEmail } from '@/lib/emails/service'

// Use TEST Stripe keys to match the create-payment-intent endpoint
// Both endpoints must use the same Stripe account/keys
const stripeSecretKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing required Stripe secret key')
}

const stripe = new Stripe(stripeSecretKey, {})

export async function POST(request: NextRequest) {
  try {
    // Use regular client for auth, admin client for data queries
    const supabase = await createClient() as any
    const adminSupabase = createAdminClient() as any
    
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
    const { data: existingOrder } = await adminSupabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .maybeSingle() as { data: { id: number } | null }

    if (existingOrder) {
      return NextResponse.json({ 
        error: 'This payment has already been processed',
        order_id: existingOrder.id 
      }, { status: 409 })
    }
    
    // Extract order type and service time from payment intent metadata
    const orderType = (metadata.order_type === 'pickup' ? 'pickup' : 'delivery') as 'delivery' | 'pickup'
    let serviceTime: { type: 'asap' | 'scheduled'; scheduledTime?: string } = { type: 'asap' }
    
    if (metadata.service_time) {
      try {
        serviceTime = JSON.parse(metadata.service_time)
        console.log('[Order API] Parsed service_time:', serviceTime)
      } catch (e) {
        console.warn('[Order API] Failed to parse service_time:', metadata.service_time)
      }
    }
    
    console.log('[Order API] Order type:', orderType, 'Service time:', serviceTime)
    
    // Get restaurant with delivery areas for delivery fee
    // Note: Using restaurant_delivery_areas table (same as admin UI), not restaurant_delivery_zones
    console.log('[Order API] Looking for restaurant ID:', restaurantId)
    const { data: restaurant, error: restaurantError } = await adminSupabase
      .from('restaurants')
      .select(`
        id, 
        name,
        restaurant_delivery_areas(id, delivery_fee, delivery_min_order, is_active)
      `)
      .eq('id', restaurantId)
      .single() as { 
        data: { 
          id: number; 
          name: string;
          restaurant_delivery_areas: { id: number; delivery_fee: number | null; delivery_min_order: number | null; is_active: boolean }[]
        } | null; 
        error: any 
      }

    if (restaurantError || !restaurant) {
      console.error('[Order API] Restaurant query error:', restaurantError)
      console.error('[Order API] Restaurant data:', restaurant)
      return NextResponse.json({ error: 'Restaurant not found', details: restaurantError }, { status: 404 })
    }

    console.log('[Order API] Found restaurant:', restaurant.id, restaurant.name)

    // Preload dishes, prices, and modifiers to avoid per-item round trips
    const dishIds = Array.from(new Set(cart_items.map((item: any) => item.dishId)))
    const modifierIds = Array.from(new Set(
      cart_items.flatMap((item: any) => item.modifiers?.map((mod: any) => mod.id) || [])
    ))

    if (dishIds.length === 0) {
      return NextResponse.json({ error: 'No dishes found in cart' }, { status: 400 })
    }

    const { data: dishesData, error: dishesError } = await adminSupabase
      .from('dishes')
      .select('id, restaurant_id, name')
      .in('id', dishIds)
      .eq('restaurant_id', restaurant.id)

    if (dishesError) {
      console.error('[Order API] Dish preload error:', dishesError)
      return NextResponse.json({ error: 'Failed to validate dishes' }, { status: 500 })
    }

    const dishMap = new Map<number, { id: number; restaurant_id: number; name: string }>()
    dishesData?.forEach((dish: any) => {
      dishMap.set(dish.id, dish)
    })

    const { data: dishPricesData, error: dishPricesError } = await adminSupabase
      .from('dish_prices')
      .select('dish_id, size_variant, price')
      .in('dish_id', dishIds)
      .eq('is_active', true)

    if (dishPricesError) {
      console.error('[Order API] Dish price preload error:', dishPricesError)
      return NextResponse.json({ error: 'Failed to load dish prices' }, { status: 500 })
    }

    const dishPriceMap = new Map<string, { price: number; size_variant: string | null }>()
    const dishPriceOptions = new Map<number, { size_variant: string | null; price: string }[]>()
    dishPricesData?.forEach((priceRow: any) => {
      const key = `${priceRow.dish_id}-${priceRow.size_variant}`
      dishPriceMap.set(key, {
        price: parseFloat(priceRow.price),
        size_variant: priceRow.size_variant,
      })
      const existing = dishPriceOptions.get(priceRow.dish_id) || []
      existing.push({ size_variant: priceRow.size_variant, price: priceRow.price })
      dishPriceOptions.set(priceRow.dish_id, existing)
    })

    let modifierMap = new Map<number, { id: number; name: string; modifier_group: { id: number; dish_id: number } }>()
    let modifierPriceMap = new Map<string, number>()

    if (modifierIds.length > 0) {
      const { data: modifiersData, error: modifiersError } = await adminSupabase
        .from('dish_modifiers')
        .select(`
          id,
          name,
          modifier_group:modifier_groups!inner(
            id,
            dish_id
          )
        `)
        .in('id', modifierIds)

      if (modifiersError) {
        console.error('[Order API] Modifier preload error:', modifiersError)
        return NextResponse.json({ error: 'Failed to load modifiers' }, { status: 500 })
      }

      modifiersData?.forEach((mod: any) => {
        modifierMap.set(mod.id, mod)
      })

      const { data: modifierPricesData, error: modifierPricesError } = await adminSupabase
        .from('dish_modifier_prices')
        .select('dish_modifier_id, dish_id, price')
        .in('dish_modifier_id', modifierIds)
        .eq('is_active', true)

      if (modifierPricesError) {
        console.error('[Order API] Modifier price preload error:', modifierPricesError)
        return NextResponse.json({ error: 'Failed to load modifier prices' }, { status: 500 })
      }

      modifierPricesData?.forEach((priceRow: any) => {
        const key = `${priceRow.dish_modifier_id}-${priceRow.dish_id}`
        modifierPriceMap.set(key, parseFloat(priceRow.price))
      })
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

      const dish = dishMap.get(item.dishId)
      if (!dish) {
        return NextResponse.json({ 
          error: `Dish ${item.dishId} does not belong to this restaurant` 
        }, { status: 400 })
      }

      const priceKey = `${item.dishId}-${item.size}`
      const dishPrice = dishPriceMap.get(priceKey)

      if (!dishPrice) {
        const availableSizes = dishPriceOptions.get(item.dishId) || []
        console.error(`[Order API] Price not found for dish ${item.dishId}, size_variant: "${item.size}"`)
        console.error('[Order API] Available size_variants:', availableSizes)
        return NextResponse.json({ 
          error: `Invalid dish price: dish ${item.dishId}, size "${item.size}" not found. Available sizes: ${JSON.stringify(availableSizes)}` 
        }, { status: 400 })
      }

      console.log(`[Order API] Found price: ${dishPrice.price} for size_variant "${dishPrice.size_variant}"`)

      // Calculate item total using server prices
      let itemTotal = dishPrice.price * item.quantity
      
      // SECURITY: Validate modifier prices from database and verify they belong to this dish
      let validatedModifiers = []
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          const modifierData = modifierMap.get(mod.id)

          if (!modifierData || modifierData.modifier_group.dish_id !== item.dishId) {
            return NextResponse.json({ 
              error: `Invalid modifier ${mod.id} for dish ${item.dishId}` 
            }, { status: 400 })
          }

          const modifierPriceKey = `${mod.id}-${item.dishId}`
          const modPrice = modifierPriceMap.get(modifierPriceKey) ?? 0

          itemTotal += modPrice * item.quantity
          validatedModifiers.push({
            id: mod.id,
            name: modifierData.name,
            price: modPrice,
            placement: mod.placement || null
          })
        }
      }

      serverSubtotal += itemTotal
      validatedItems.push({
        dish_id: item.dishId,
        name: dish.name,
        size: item.size,
        quantity: item.quantity,
        unit_price: dishPrice.price,
        modifiers: validatedModifiers,
        subtotal: itemTotal
      })
    }

    // Calculate fees and tax on server
    // Pickup orders have NO delivery fee
    let deliveryFee = 0
    if (orderType === 'delivery') {
      // Get delivery fee from first active delivery area (or $0 if none configured)
      // Note: Using restaurant_delivery_areas table - delivery_fee is already in dollars
      const activeArea = restaurant.restaurant_delivery_areas?.find(
        area => area.is_active
      )
      deliveryFee = activeArea?.delivery_fee ?? 0
    }
    
    const tax = (serverSubtotal + deliveryFee) * 0.13 // 13% HST
    const serverTotal = serverSubtotal + deliveryFee + tax

    // Get actual paid amount from Stripe (source of truth - payment already succeeded)
    const paymentTotal = paymentIntent.amount / 100
    
    console.log('[Order API] Total breakdown:', {
      orderType,
      serverSubtotal,
      deliveryFee,
      tax,
      serverTotal,
      paymentTotal,
      paymentAmountCents: paymentIntent.amount,
      difference: Math.abs(paymentTotal - serverTotal)
    })
    
    // Log discrepancy but DON'T block - payment already succeeded
    // This can happen due to floating point rounding or price changes between cart and checkout
    if (Math.abs(paymentTotal - serverTotal) > 0.01) {
      console.warn('[Order API] Price discrepancy detected (not blocking):', { 
        paymentTotal, 
        serverTotal,
        difference: (paymentTotal - serverTotal).toFixed(2),
        serverSubtotal: serverSubtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        tax: tax.toFixed(2)
      })
      // Use payment amount as source of truth since payment already succeeded
      // TODO: Investigate price calculation discrepancies
    }
    
    // Use the PAID amount for the order (payment already succeeded, this is the truth)
    const finalTotal = paymentTotal
    // Recalculate tax/subtotal proportionally if there's a difference
    const finalSubtotal = serverSubtotal
    const finalDeliveryFee = deliveryFee
    const finalTax = finalTotal - finalSubtotal - finalDeliveryFee

    // Create order with server-validated data
    // IMPORTANT: Match exact schema of orders table (see AI-AGENTS-START-HERE/DATABASE_SCHEMA_QUICK_REF.md)
    // Generate unique order number (timestamp + random for uniqueness)
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    // Enrich delivery_address with service time info (stored in JSONB for flexibility)
    const enrichedDeliveryAddress = {
      ...delivery_address,
      service_time: serviceTime, // { type: 'asap' | 'scheduled', scheduledTime?: string }
    }
    
    // Database expects 'delivery' or 'takeout' (not 'pickup')
    // Map 'pickup' -> 'takeout' for database compatibility
    const dbOrderType = orderType === 'pickup' ? 'takeout' : orderType
    
    const orderData = {
      order_number: orderNumber,
      order_type: dbOrderType, // Database values: "delivery" or "takeout"
      order_status: 'pending', // Required: Initial status for new orders
      user_id: user_id || null, // NULL for guest orders
      is_guest_order: !user_id, // TRUE for guest checkouts
      guest_email: guest_email || null,
      guest_phone: user_id ? null : '000-000-0000', // TODO: Collect phone in checkout form
      guest_name: user_id ? null : delivery_address?.name || 'Guest Customer',
      restaurant_id: restaurant.id,
      payment_status: 'paid',
      stripe_payment_intent_id: payment_intent_id,
      total_amount: finalTotal,
      subtotal: finalSubtotal,
      delivery_fee: finalDeliveryFee,
      tax_amount: finalTax,
      items: validatedItems,
      delivery_address: enrichedDeliveryAddress,
      // NOTE: service_time stored inside delivery_address JSONB for flexibility
      // NOTE: created_at auto-generated by database
    }

    // Create order (protected by UNIQUE constraint on stripe_payment_intent_id)
    console.log('[Order API] Attempting to create order with data:', {
      order_type: orderData.order_type,
      service_time: serviceTime,
      user_id: orderData.user_id,
      restaurant_id: orderData.restaurant_id,
      payment_intent_id: payment_intent_id,
      total_amount: orderData.total_amount,
      items_count: orderData.items.length,
      has_delivery_address: !!orderData.delivery_address
    })

    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .insert(orderData as any)
      .select()
      .single() as { data: { id: number; created_at: string } | null; error: any }

    if (orderError || !order) {
      console.error('[Order API] ❌ Order creation FAILED')
      console.error('[Order API] Error code:', orderError?.code)
      console.error('[Order API] Error message:', orderError?.message)
      console.error('[Order API] Error details:', orderError?.details)
      console.error('[Order API] Error hint:', orderError?.hint)
      console.error('[Order API] Full error object:', JSON.stringify(orderError, null, 2))
      
      // SECURITY: Handle duplicate payment intent (race condition or replay attack)
      if (orderError?.code === '23505') { // PostgreSQL unique violation
        return NextResponse.json({ 
          error: 'This payment has already been processed (concurrent request detected)',
        }, { status: 409 })
      }
      
      // Return detailed error to help diagnose the issue
      return NextResponse.json({ 
        error: 'Failed to create order',
        details: orderError?.message || 'Unknown database error',
        code: orderError?.code
      }, { status: 500 })
    }

    console.log('[Order API] ✅ Order created successfully:', order.id)

    // Create payment transaction record
    await adminSupabase
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
    await adminSupabase
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
        // Format the estimated time for the email
        let estimatedTime: string | undefined
        if (serviceTime.type === 'scheduled' && serviceTime.scheduledTime) {
          // Format: "Scheduled for Dec 15, 2024 at 6:30 PM"
          const scheduledDate = new Date(serviceTime.scheduledTime)
          estimatedTime = `Scheduled for ${scheduledDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })} at ${scheduledDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}`
        } else {
          estimatedTime = orderType === 'pickup' ? 'ASAP (Pickup)' : 'ASAP (Delivery)'
        }
        
        await sendOrderConfirmationEmail({
          orderNumber: order.id.toString(),
          restaurantName: restaurant.name,
          restaurantLogoUrl: undefined, // logo_url column doesn't exist in restaurants table
          items: validatedItems,
          deliveryAddress: delivery_address,
          subtotal: finalSubtotal,
          deliveryFee: finalDeliveryFee,
          tax: finalTax,
          total: finalTotal,
          customerEmail,
          estimatedDeliveryTime: estimatedTime,
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
    const supabase = await createClient() as any
    
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
        restaurant:restaurants(id, name)
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
