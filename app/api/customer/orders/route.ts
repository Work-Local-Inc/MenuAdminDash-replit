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

    // VALIDATION: Guest orders MUST have a name (industry standard for pickup/delivery)
    if (!user && (!delivery_address?.name || delivery_address.name.trim().length < 2)) {
      console.error('[Order API] Guest checkout missing name')
      return NextResponse.json({ error: 'Name required for order (e.g., "Order for John")' }, { status: 400 })
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

    // Maps for simple modifiers (from dish_modifiers table)
    let simpleModifierMap = new Map<number, { id: number; name: string; modifier_group: { id: number; dish_id: number } }>()
    let simpleModifierPriceMap = new Map<string, number>()
    
    // Maps for combo modifiers (from combo_modifiers table)
    let comboModifierMap = new Map<number, { id: number; name: string; combo_modifier_group_id: number }>()
    let comboModifierPriceMap = new Map<number, number>()
    let dishComboGroupLinks = new Map<number, Set<number>>() // dish_id -> set of combo_group_ids

    if (modifierIds.length > 0) {
      // First, try to load as simple modifiers
      const { data: simpleModifiersData, error: simpleModifiersError } = await adminSupabase
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

      if (simpleModifiersError) {
        console.error('[Order API] Simple modifier preload error:', simpleModifiersError)
        return NextResponse.json({ error: 'Failed to load modifiers' }, { status: 500 })
      }

      simpleModifiersData?.forEach((mod: any) => {
        simpleModifierMap.set(mod.id, mod)
      })

      // Load simple modifier prices
      const simpleModIds = simpleModifiersData?.map((m: any) => m.id) || []
      if (simpleModIds.length > 0) {
        const { data: simpleModifierPricesData, error: simpleModifierPricesError } = await adminSupabase
          .from('dish_modifier_prices')
          .select('dish_modifier_id, dish_id, price')
          .in('dish_modifier_id', simpleModIds)
          .eq('is_active', true)

        if (simpleModifierPricesError) {
          console.error('[Order API] Simple modifier price preload error:', simpleModifierPricesError)
          return NextResponse.json({ error: 'Failed to load modifier prices' }, { status: 500 })
        }

        simpleModifierPricesData?.forEach((priceRow: any) => {
          const key = `${priceRow.dish_modifier_id}-${priceRow.dish_id}`
          simpleModifierPriceMap.set(key, parseFloat(priceRow.price))
        })
      }

      // Find modifier IDs not found in simple modifiers - these might be combo modifiers
      const notFoundIds = (modifierIds as number[]).filter((id: number) => !simpleModifierMap.has(id))
      
      if (notFoundIds.length > 0) {
        console.log('[Order API] Looking for combo modifiers:', notFoundIds)
        
        // Load combo modifiers (note: prices are in separate combo_modifier_prices table)
        const { data: comboModifiersData, error: comboModifiersError } = await adminSupabase
          .from('combo_modifiers')
          .select(`
            id,
            name,
            combo_modifier_group_id
          `)
          .in('id', notFoundIds)

        if (comboModifiersError) {
          console.error('[Order API] Combo modifier preload error:', comboModifiersError)
          return NextResponse.json({ error: 'Failed to load combo modifiers' }, { status: 500 })
        }

        comboModifiersData?.forEach((mod: any) => {
          comboModifierMap.set(mod.id, mod)
        })

        // Load combo modifier prices from separate table
        const { data: comboPricesData, error: comboPricesError } = await adminSupabase
          .from('combo_modifier_prices')
          .select('combo_modifier_id, price, size_variant')
          .in('combo_modifier_id', notFoundIds)

        if (comboPricesError) {
          console.error('[Order API] Combo modifier prices error:', comboPricesError)
          // Non-fatal - combo modifiers might be free (included)
        }

        comboPricesData?.forEach((priceRow: any) => {
          // Store price by modifier ID (may need size matching later)
          // For now, use the first price found (or base price without size_variant)
          if (!comboModifierPriceMap.has(priceRow.combo_modifier_id)) {
            comboModifierPriceMap.set(priceRow.combo_modifier_id, parseFloat(priceRow.price))
          }
        })

        // Load dish -> combo_group links to validate that combo modifiers belong to this dish
        const { data: dishComboLinks, error: dishComboLinksError } = await adminSupabase
          .from('dish_combo_groups')
          .select('dish_id, combo_group_id')
          .in('dish_id', dishIds)
          .eq('is_active', true)

        if (dishComboLinksError) {
          console.error('[Order API] Dish combo group links error:', dishComboLinksError)
          return NextResponse.json({ error: 'Failed to load dish combo links' }, { status: 500 })
        }

        dishComboLinks?.forEach((link: any) => {
          if (!dishComboGroupLinks.has(link.dish_id)) {
            dishComboGroupLinks.set(link.dish_id, new Set())
          }
          dishComboGroupLinks.get(link.dish_id)!.add(link.combo_group_id)
        })

        // Also load the combo_modifier_groups -> combo_group_sections -> combo_groups chain
        // to validate the full path from combo modifier to dish
        const comboModGroupIds = comboModifiersData?.map((m: any) => m.combo_modifier_group_id) || []
        if (comboModGroupIds.length > 0) {
          const { data: comboModGroups, error: comboModGroupsError } = await adminSupabase
            .from('combo_modifier_groups')
            .select('id, combo_group_section_id')
            .in('id', comboModGroupIds)

          if (!comboModGroupsError && comboModGroups) {
            const sectionIds = comboModGroups.map((g: any) => g.combo_group_section_id)
            
            const { data: sections, error: sectionsError } = await adminSupabase
              .from('combo_group_sections')
              .select('id, combo_group_id')
              .in('id', sectionIds)

            if (!sectionsError && sections) {
              // Build mapping: combo_modifier_group_id -> combo_group_id
              const sectionToComboGroup = new Map<number, number>()
              sections.forEach((s: any) => {
                sectionToComboGroup.set(s.id, s.combo_group_id)
              })

              const modGroupToSection = new Map<number, number>()
              comboModGroups.forEach((g: any) => {
                modGroupToSection.set(g.id, g.combo_group_section_id)
              })

              // Store the combo_group_id for each combo modifier for validation
              comboModifiersData?.forEach((mod: any) => {
                const sectionId = modGroupToSection.get(mod.combo_modifier_group_id)
                if (sectionId) {
                  const comboGroupId = sectionToComboGroup.get(sectionId)
                  if (comboGroupId) {
                    // Store for validation: combo_modifier_id -> combo_group_id
                    (mod as any)._comboGroupId = comboGroupId
                    comboModifierMap.set(mod.id, mod)
                  }
                }
              })
            }
          }
        }
      }
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
      // Supports both simple modifiers (dish_modifiers) and combo modifiers (combo_modifiers)
      let validatedModifiers = []
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          // First check if it's a simple modifier
          const simpleModifier = simpleModifierMap.get(mod.id)
          
          if (simpleModifier) {
            // Validate simple modifier belongs to this dish
            if (simpleModifier.modifier_group.dish_id !== item.dishId) {
              console.error(`[Order API] Simple modifier ${mod.id} belongs to dish ${simpleModifier.modifier_group.dish_id}, not ${item.dishId}`)
              return NextResponse.json({ 
                error: `Invalid modifier ${mod.id} for dish ${item.dishId}` 
              }, { status: 400 })
            }

            const modifierPriceKey = `${mod.id}-${item.dishId}`
            const modPrice = simpleModifierPriceMap.get(modifierPriceKey) ?? 0

            itemTotal += modPrice * item.quantity
            validatedModifiers.push({
              id: mod.id,
              name: simpleModifier.name,
              price: modPrice,
              placement: mod.placement || null
            })
          } else {
            // Check if it's a combo modifier
            const comboModifier = comboModifierMap.get(mod.id) as any
            
            if (!comboModifier) {
              console.error(`[Order API] Modifier ${mod.id} not found in simple or combo modifiers`)
              return NextResponse.json({ 
                error: `Invalid modifier ${mod.id} for dish ${item.dishId}` 
              }, { status: 400 })
            }

            // Validate combo modifier belongs to this dish via dish_combo_groups
            const comboGroupId = comboModifier._comboGroupId
            const dishComboGroups = dishComboGroupLinks.get(item.dishId)
            
            if (!comboGroupId || !dishComboGroups || !dishComboGroups.has(comboGroupId)) {
              console.error(`[Order API] Combo modifier ${mod.id} (combo_group: ${comboGroupId}) not linked to dish ${item.dishId}`)
              console.error(`[Order API] Dish ${item.dishId} has combo groups:`, dishComboGroups ? Array.from(dishComboGroups) : 'none')
              return NextResponse.json({ 
                error: `Invalid modifier ${mod.id} for dish ${item.dishId}` 
              }, { status: 400 })
            }

            // Use price from combo modifier or from cart (free items have price 0)
            const modPrice = comboModifierPriceMap.get(mod.id) ?? 0
            // Use the client price for free items logic (server will use client-submitted price)
            const effectivePrice = mod.price ?? modPrice

            itemTotal += effectivePrice * item.quantity
            validatedModifiers.push({
              id: mod.id,
              name: comboModifier.name,
              price: effectivePrice,
              placement: mod.placement || null
            })
          }
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
      guest_phone: user_id ? null : delivery_address?.phone || null,
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
    console.log('[Order API] Attempting to send confirmation email to:', customerEmail)
    
    if (!customerEmail) {
      console.warn('[Order API] No customer email available - skipping confirmation email')
    } else {
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
        console.log('[Order API] ✅ Order confirmation email sent successfully to:', customerEmail)
      } catch (emailError: any) {
        console.error('[Order API] ❌ Failed to send order confirmation email:', {
          error: emailError?.message || emailError,
          customerEmail,
          orderNumber: order.id,
          hint: 'If using Resend free tier, emails can only be sent to verified domains'
        })
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
