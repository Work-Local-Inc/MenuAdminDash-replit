import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'
import { sendOrderConfirmationEmail } from '@/lib/emails/service'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any
    const adminSupabase = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { 
      payment_type,
      delivery_address, 
      cart_items, 
      user_id, 
      guest_email,
      restaurant_slug,
      order_type,
      service_time
    } = body

    console.log('[Cash Order API] Request:', { 
      payment_type,
      has_user: !!user,
      guest_email,
      cart_items_count: cart_items?.length,
      order_type
    })

    const validPaymentTypes = ['cash', 'interac', 'credit_at_door', 'debit_at_door', 'credit_debit_at_door']
    if (!validPaymentTypes.includes(payment_type)) {
      return NextResponse.json({ error: 'Invalid payment type for cash order' }, { status: 400 })
    }

    if (!cart_items || cart_items.length === 0) {
      return NextResponse.json({ error: 'Cart items required' }, { status: 400 })
    }

    if (!restaurant_slug) {
      return NextResponse.json({ error: 'Restaurant slug required' }, { status: 400 })
    }

    if (!user && !guest_email) {
      return NextResponse.json({ error: 'Email required for guest checkout' }, { status: 400 })
    }

    const restaurantId = extractIdFromSlug(restaurant_slug)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Invalid restaurant identifier' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const dishIds = Array.from(new Set(cart_items.map((item: any) => item.dishId)))
    const modifierIds = Array.from(new Set(
      cart_items.flatMap((item: any) => item.modifiers?.map((mod: any) => mod.id) || [])
    ))

    const { data: dishesData, error: dishesError } = await adminSupabase
      .from('dishes')
      .select('id, restaurant_id, name')
      .in('id', dishIds)
      .eq('restaurant_id', restaurant.id)

    if (dishesError || !dishesData) {
      return NextResponse.json({ error: 'Failed to validate dishes' }, { status: 500 })
    }

    const dishMap = new Map<number, { id: number; restaurant_id: number; name: string }>()
    dishesData.forEach((dish: any) => dishMap.set(dish.id, dish))

    const { data: dishPricesData } = await adminSupabase
      .from('dish_prices')
      .select('dish_id, size_variant, price')
      .in('dish_id', dishIds)
      .eq('is_active', true)

    const dishPriceMap = new Map<string, { price: number; size_variant: string | null }>()
    dishPricesData?.forEach((priceRow: any) => {
      const key = `${priceRow.dish_id}-${priceRow.size_variant}`
      dishPriceMap.set(key, {
        price: parseFloat(priceRow.price),
        size_variant: priceRow.size_variant,
      })
    })

    // Maps for simple modifiers (from dish_modifiers table)
    let simpleModifierPriceMap = new Map<string, number>()
    // Maps for combo modifiers (from combo_modifiers table)
    let comboModifierPriceMap = new Map<number, number>()
    
    if (modifierIds.length > 0) {
      // Load simple modifier prices
      const { data: simpleModifierPricesData } = await adminSupabase
        .from('dish_modifier_prices')
        .select('dish_modifier_id, dish_id, price')
        .in('dish_modifier_id', modifierIds)
        .eq('is_active', true)

      simpleModifierPricesData?.forEach((priceRow: any) => {
        const key = `${priceRow.dish_modifier_id}-${priceRow.dish_id}`
        simpleModifierPriceMap.set(key, parseFloat(priceRow.price))
      })

      // Also check combo modifiers for any IDs not found in simple modifiers
      const simpleModIds = new Set(simpleModifierPricesData?.map((p: any) => p.dish_modifier_id) || [])
      const potentialComboIds = (modifierIds as number[]).filter(id => !simpleModIds.has(id))
      
      if (potentialComboIds.length > 0) {
        const { data: comboModifiersData } = await adminSupabase
          .from('combo_modifiers')
          .select('id, price')
          .in('id', potentialComboIds)

        comboModifiersData?.forEach((mod: any) => {
          if (mod.price) {
            comboModifierPriceMap.set(mod.id, parseFloat(mod.price))
          }
        })
      }
    }

    let serverSubtotal = 0
    const validatedItems = []

    for (const item of cart_items) {
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
      }

      const dish = dishMap.get(item.dishId)
      if (!dish) {
        return NextResponse.json({ error: `Dish ${item.dishId} not found` }, { status: 400 })
      }

      const priceKey = `${item.dishId}-${item.size}`
      const dishPrice = dishPriceMap.get(priceKey)
      if (!dishPrice) {
        return NextResponse.json({ error: `Invalid price for dish ${item.dishId}` }, { status: 400 })
      }

      let itemTotal = dishPrice.price * item.quantity
      let validatedModifiers = []

      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          // First check simple modifier price
          const modKey = `${mod.id}-${item.dishId}`
          let modPrice: number = simpleModifierPriceMap.get(modKey) ?? -1
          
          // If not found in simple modifiers, check combo modifiers
          if (modPrice < 0) {
            modPrice = comboModifierPriceMap.get(mod.id) ?? -1
          }
          
          // If still not found, use client-provided price (for free items)
          if (modPrice < 0) {
            modPrice = mod.price ?? 0
          }
          
          itemTotal += modPrice * item.quantity
          validatedModifiers.push({
            modifier_id: mod.id,
            modifier_name: mod.name,
            modifier_price: modPrice.toString(),
            quantity: 1,
            placement: mod.placement || null
          })
        }
      }

      serverSubtotal += itemTotal
      validatedItems.push({
        dish_id: item.dishId,
        dish_name: dish.name,
        quantity: item.quantity,
        size_variant: item.size || null,
        unit_price: dishPrice.price.toString(),
        special_instructions: item.specialInstructions || null,
        modifiers: validatedModifiers
      })
    }

    const finalOrderType = order_type === 'pickup' ? 'takeout' : 'delivery'
    const activeArea = restaurant.restaurant_delivery_areas?.find((a: any) => a.is_active)
    const deliveryFee = finalOrderType === 'delivery' ? (activeArea?.delivery_fee || 0) : 0
    const taxRate = 0.13
    const serverTax = (serverSubtotal + deliveryFee) * taxRate
    const serverTotal = serverSubtotal + deliveryFee + serverTax

    let parsedServiceTime: { type: string; scheduledTime?: string } = { type: 'asap' }
    if (service_time) {
      try {
        parsedServiceTime = typeof service_time === 'string' ? JSON.parse(service_time) : service_time
      } catch (e) {}
    }

    const cashOrderReference = `CASH-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    const dbUserId = user_id ? parseInt(user_id, 10) : null

    const orderData = {
      restaurant_id: restaurant.id,
      user_id: dbUserId,
      guest_email: !dbUserId ? (guest_email || null) : null,
      order_type: finalOrderType,
      status: 'pending',
      payment_status: 'pending',
      payment_method: payment_type,
      subtotal: serverSubtotal.toFixed(2),
      tax: serverTax.toFixed(2),
      delivery_fee: deliveryFee.toFixed(2),
      total: serverTotal.toFixed(2),
      delivery_address: delivery_address ? JSON.stringify(delivery_address) : null,
      special_instructions: parsedServiceTime.type === 'scheduled' && parsedServiceTime.scheduledTime
        ? `Scheduled for: ${parsedServiceTime.scheduledTime}`
        : null,
      stripe_payment_intent_id: cashOrderReference,
      scheduled_time: parsedServiceTime.scheduledTime || null,
    }

    console.log('[Cash Order API] Creating order:', orderData)

    const { data: order, error: orderError } = await (adminSupabase
      .from('orders')
      .insert(orderData as any)
      .select()
      .single()) as { data: any; error: any }

    if (orderError) {
      console.error('[Cash Order API] Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order', details: orderError }, { status: 500 })
    }

    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      dish_id: item.dish_id,
      dish_name: item.dish_name,
      quantity: item.quantity,
      size_variant: item.size_variant,
      unit_price: item.unit_price,
      special_instructions: item.special_instructions,
      modifiers: item.modifiers.length > 0 ? JSON.stringify(item.modifiers) : null
    }))

    const { error: itemsError } = await adminSupabase
      .from('order_items')
      .insert(orderItems as any)

    if (itemsError) {
      console.error('[Cash Order API] Order items error:', itemsError)
    }

    const email = guest_email || user?.email
    console.log('[Cash Order API] Attempting to send confirmation email to:', email)
    
    if (!email) {
      console.warn('[Cash Order API] No customer email available - skipping confirmation email')
    } else if (email && delivery_address) {
      try {
        await sendOrderConfirmationEmail({
          customerEmail: email,
          orderNumber: order.id.toString(),
          restaurantName: restaurant.name,
          items: validatedItems.map(i => ({
            dish_id: i.dish_id,
            name: i.dish_name,
            quantity: i.quantity,
            size: i.size_variant || 'standard',
            unit_price: parseFloat(i.unit_price),
            subtotal: parseFloat(i.unit_price) * i.quantity,
          })),
          subtotal: serverSubtotal,
          tax: serverTax,
          deliveryFee: deliveryFee,
          total: serverTotal,
          deliveryAddress: {
            street: delivery_address.street_address || '',
            city: delivery_address.city || delivery_address.city_name || '',
            province: delivery_address.province || 'ON',
            postal_code: delivery_address.postal_code || '',
            delivery_instructions: delivery_address.delivery_instructions,
          },
        })
        console.log('[Cash Order API] ✅ Order confirmation email sent successfully to:', email)
      } catch (emailError: any) {
        console.error('[Cash Order API] ❌ Failed to send order confirmation email:', {
          error: emailError?.message || emailError,
          customerEmail: email,
          orderNumber: order.id,
          hint: 'If using Resend free tier, emails can only be sent to verified domains'
        })
      }
    }

    console.log('[Cash Order API] Order created successfully:', order.id)

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.id.toString(),
      payment_status: 'pending',
      payment_method: payment_type,
      total: serverTotal
    })

  } catch (error: any) {
    console.error('[Cash Order API] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 })
  }
}
