import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'
import { sendOrderConfirmationEmail } from '@/lib/emails/service'
import { fetchMenuForCustomer } from '@/lib/supabase/menu'
import { TaxConfig, TaxLineItem, calculateTaxes, getTotalTax } from '@/lib/types/tax'
import { getEffectivePrepTime, formatPrepTimeRange } from '@/lib/utils/prep-time'
import crypto from 'crypto'
export const dynamic = 'force-dynamic'

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
      user_id: requestUserId, 
      guest_email,
      restaurant_slug,
      order_type,
      service_time,
      order_notes
    } = body

    // Resolve user_id: If authenticated but no user_id provided (phone-only users),
    // find or create their users table record so their profile persists across orders
    let user_id = requestUserId
    if (!user_id && user) {
      console.log('[Cash Order API] Authenticated user without user_id - resolving profile for:', user.id)
      const { data: existingProfile } = await (adminSupabase as any)
        .schema('menuca_v3')
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      
      if (existingProfile) {
        user_id = String(existingProfile.id)
        console.log('[Cash Order API] Found existing user profile:', user_id)
      } else {
        const checkoutName = delivery_address?.name?.trim()
        const nameParts = checkoutName ? checkoutName.split(' ') : []
        const insertData: Record<string, any> = {
          auth_user_id: user.id,
          email: delivery_address?.email || user.email || null,
          first_name: nameParts[0] || null,
          last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : null,
          phone: user.phone || delivery_address?.phone || null,
        }
        const { data: newProfile, error: insertErr } = await (adminSupabase as any)
          .schema('menuca_v3')
          .from('users')
          .insert(insertData)
          .select('id')
          .single()
        
        if (newProfile) {
          user_id = String(newProfile.id)
          console.log('[Cash Order API] Created new user profile for phone user:', user_id)
        } else {
          console.error('[Cash Order API] Failed to create user profile:', insertErr?.message)
        }
      }
    }

    console.log('[Cash Order API] Request:', { 
      payment_type,
      has_user: !!user,
      resolved_user_id: user_id,
      guest_email,
      cart_items_count: cart_items?.length,
      order_type
    })

    const validPaymentTypes = ['cash', 'interac', 'credit_at_door', 'debit_at_door', 'credit_or_debit_at_door']
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

    // VALIDATION: Guest orders MUST have a name (industry standard for pickup/delivery)
    if (!user && (!delivery_address?.name || delivery_address.name.trim().length < 2)) {
      return NextResponse.json({ error: 'Name required for order (e.g., "Order for John")' }, { status: 400 })
    }

    const restaurantId = extractIdFromSlug(restaurant_slug)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Invalid restaurant identifier' }, { status: 400 })
    }

    const { data: restaurant, error: restaurantError } = await (adminSupabase as any)
      .schema('menuca_v3')
      .from('restaurants')
      .select(`
        id, 
        name,
        logo_url,
        restaurant_delivery_areas(id, delivery_fee, delivery_min_order, is_active),
        restaurant_locations(street_address, postal_code, phone)
      `)
      .eq('id', restaurantId)
      .single() as { 
        data: { 
          id: number; 
          name: string;
          logo_url: string | null;
          restaurant_delivery_areas: { id: number; delivery_fee: number | null; delivery_min_order: number | null; is_active: boolean }[];
          restaurant_locations: { street_address: string; postal_code: string; phone: string | null }[]
        } | null; 
        error: any 
      }

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const dishIds: number[] = Array.from(new Set(cart_items.map((item: any) => item.dishId as number)))
    const modifierIds = Array.from(new Set(
      cart_items.flatMap((item: any) => item.modifiers?.map((mod: any) => mod.id) || [])
    ))

    // Validate dishes exist using the cached menu RPC (same source as customer-facing menu)
    const { data: menuData, error: menuError } = await fetchMenuForCustomer(
      adminSupabase,
      restaurant.id,
      'en'
    )

    if (menuError) {
      console.error('[Cash Order API] Menu fetch error:', menuError)
      return NextResponse.json({ error: 'Failed to validate dishes' }, { status: 500 })
    }

    const dishMap = new Map<number, { id: number; restaurant_id: number; name: string }>()
    const dishPriceMap = new Map<string, { price: number; size_variant: string | null; modifierSizeVariantId: number | null; sizeIndex: number }>()
    const modifierIdToGroupId = new Map<number, number>()
    const modifierGroupNameMap = new Map<number, string>()
    menuData?.courses?.forEach((course: any) => {
      course.dishes?.forEach((dish: any) => {
        dishMap.set(dish.id, {
          id: dish.id,
          restaurant_id: restaurant.id,
          name: dish.name || 'Unknown'
        })
        if (dish.prices && Array.isArray(dish.prices)) {
          dish.prices.forEach((p: any, idx: number) => {
            const key = `${dish.id}-${p.size_variant}`
            dishPriceMap.set(key, {
              price: parseFloat(p.price),
              size_variant: p.size_variant,
              modifierSizeVariantId: p.modifier_size_variant_id ?? null,
              sizeIndex: idx,
            })
          })
        }
        dish.modifier_groups?.forEach((mg: any) => {
          if (mg.name) {
            modifierGroupNameMap.set(mg.id, mg.name)
          }
          mg.modifiers?.forEach((mod: any) => {
            modifierIdToGroupId.set(mod.id, mg.id)
          })
        })
      })
    })

    // Validate all requested dishes exist in the menu
    const missingDishes = dishIds.filter((id: number) => !dishMap.has(id))
    if (missingDishes.length > 0) {
      console.error('[Cash Order API] Dishes not found in menu:', missingDishes)
      return NextResponse.json({ error: 'Some dishes are not available' }, { status: 400 })
    }

    // Maps for simple modifiers (from modifiers/modifier_prices tables - NOT the empty dish_modifiers table)
    // Key format: `${modifier_id}-${modifier_size_variant_id}` to support size-variant pricing
    let simpleModifierPriceMap = new Map<string, number>()
    // Maps for combo modifiers (from combo_modifiers table)
    // Key format: `${combo_modifier_id}-${size_variant}` to support size-variant pricing
    let comboModifierPriceMap = new Map<string, number>()
    
    if (modifierIds.length > 0) {
      // Load simple modifier prices from modifier_prices table (NOT dish_modifier_prices which is empty)
      const { data: simpleModifierPricesData } = await (adminSupabase as any)
        .schema('menuca_v3')
        .from('modifier_prices')
        .select('modifier_id, price, modifier_size_variant_id')
        .in('modifier_id', modifierIds)

      simpleModifierPricesData?.forEach((priceRow: any) => {
        // Store ALL prices with compound key: modifier_id-size_variant_id
        // This enables looking up size-specific prices (e.g., Hot Peppers for Large = $3.25)
        const sizeVariantId = priceRow.modifier_size_variant_id || 1
        const key = `${priceRow.modifier_id}-${sizeVariantId}`
        simpleModifierPriceMap.set(key, parseFloat(priceRow.price))
      })

      // Also check combo modifiers for any IDs not found in simple modifiers
      const simpleModIds = new Set(simpleModifierPricesData?.map((p: any) => p.modifier_id) || [])
      const potentialComboIds = (modifierIds as number[]).filter(id => !simpleModIds.has(id))
      
      if (potentialComboIds.length > 0) {
        const { data: comboPricesData } = await (adminSupabase as any)
          .schema('menuca_v3')
          .from('combo_modifier_prices')
          .select('combo_modifier_id, price, size_variant')
          .in('combo_modifier_id', potentialComboIds)

        comboPricesData?.forEach((priceRow: any) => {
          const sizeVariant = priceRow.size_variant || 'base'
          const key = `${priceRow.combo_modifier_id}-${sizeVariant}`
          comboModifierPriceMap.set(key, parseFloat(priceRow.price))
        })

        const { data: comboModifiersData } = await (adminSupabase as any)
          .schema('menuca_v3')
          .from('combo_modifiers')
          .select('id, combo_modifier_group_id')
          .in('id', potentialComboIds)

        const comboModGroupIds = comboModifiersData?.map((m: any) => m.combo_modifier_group_id).filter(Boolean) || []
        if (comboModGroupIds.length > 0) {
          const { data: comboModGroups } = await (adminSupabase as any)
            .schema('menuca_v3')
            .from('combo_modifier_groups')
            .select('id, name')
            .in('id', comboModGroupIds)

          const comboGroupNameMap = new Map<number, string>()
          comboModGroups?.forEach((g: any) => {
            if (g.name) comboGroupNameMap.set(g.id, g.name)
          })
          comboModifiersData?.forEach((mod: any) => {
            modifierIdToGroupId.set(mod.id, mod.combo_modifier_group_id)
            const gName = comboGroupNameMap.get(mod.combo_modifier_group_id)
            if (gName) modifierGroupNameMap.set(mod.combo_modifier_group_id, gName)
          })
        }
      }
    }

    // DB fallback: for any cart modifier IDs not found via menu data, query DB directly
    // This handles cases where menu RPC doesn't include modifier_groups on certain dishes
    const allCartModIds = cart_items.flatMap((item: any) => (item.modifiers || []).map((m: any) => m.id))
    const unmappedModIds = allCartModIds.filter((id: number) => !modifierIdToGroupId.has(id))
    if (unmappedModIds.length > 0) {
      console.log('[Cash Order API] DB fallback for unmapped modifier group names:', unmappedModIds)
      const { data: dbModData } = await (adminSupabase as any)
        .schema('menuca_v3')
        .from('modifiers')
        .select('id, modifier_group_id')
        .in('id', unmappedModIds)

      if (dbModData && dbModData.length > 0) {
        const dbGroupIds = Array.from(new Set(dbModData.map((m: any) => m.modifier_group_id).filter(Boolean))) as number[]
        const missingGroupIds = dbGroupIds.filter((gid: number) => !modifierGroupNameMap.has(gid))
        
        if (missingGroupIds.length > 0) {
          const { data: dbGroupData } = await (adminSupabase as any)
            .schema('menuca_v3')
            .from('modifier_groups')
            .select('id, name_en')
            .in('id', missingGroupIds)

          dbGroupData?.forEach((g: any) => {
            if (g.name_en) modifierGroupNameMap.set(g.id, g.name_en)
          })
        }

        dbModData.forEach((m: any) => {
          if (m.modifier_group_id) {
            modifierIdToGroupId.set(m.id, m.modifier_group_id)
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
          const targetSizeVariantId = dishPrice.modifierSizeVariantId || 1

          let modPrice: number | undefined = simpleModifierPriceMap.get(`${mod.id}-${targetSizeVariantId}`)
          if (modPrice === undefined) {
            modPrice = simpleModifierPriceMap.get(`${mod.id}-1`)
          }

          // If not found in simple modifiers, check combo modifiers with size variant
          if (modPrice === undefined) {
            const sizeForCombo = item.size || 'base'
            modPrice = comboModifierPriceMap.get(`${mod.id}-${sizeForCombo}`)
            // Fallback to base price if size-specific price not found
            if (modPrice === undefined) {
              modPrice = comboModifierPriceMap.get(`${mod.id}-base`)
            }
          }

          // If still not found, use client-provided price (for free items)
          if (modPrice === undefined) {
            modPrice = mod.price ?? 0
          }
          
          const finalModPrice = modPrice ?? 0
          const modQuantity = mod.quantity || 1
          itemTotal += finalModPrice * modQuantity * item.quantity
          const groupId = modifierIdToGroupId.get(mod.id)
          validatedModifiers.push({
            modifier_id: mod.id,
            modifier_name: mod.name,
            modifier_price: finalModPrice.toString(),
            quantity: modQuantity,
            placement: mod.placement || null,
            group_name: groupId ? (modifierGroupNameMap.get(groupId) || null) : null
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
    
    // Fetch restaurant's tax configuration from restaurant_tax_info view
    let taxConfig: TaxConfig[] = [{ type: 'HST', rate: 0.13 }] // Default: Ontario HST
    let taxProvinceId: number | null = null
    
    try {
      const { data: taxInfo } = await (adminSupabase as any)
        .schema('menuca_v3')
        .from('restaurant_tax_info')
        .select('province_id, taxes')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle() as { data: { province_id: number; taxes: TaxConfig[] } | null }
      
      if (taxInfo?.taxes && taxInfo.taxes.length > 0) {
        taxConfig = taxInfo.taxes
        taxProvinceId = taxInfo.province_id
        console.log('[Cash Order API] Tax config for restaurant:', { restaurantId: restaurant.id, taxConfig, provinceId: taxProvinceId })
      } else {
        console.log('[Cash Order API] No tax config found, using default Ontario HST 13%')
      }
    } catch (taxError) {
      console.warn('[Cash Order API] Error fetching tax config, using default:', taxError)
    }
    
    // Calculate itemized tax breakdown
    const taxableAmount = serverSubtotal + deliveryFee
    const taxBreakdown: TaxLineItem[] = calculateTaxes(taxableAmount, taxConfig)
    const serverTax = getTotalTax(taxBreakdown)
    const serverTotal = serverSubtotal + deliveryFee + serverTax

    let parsedServiceTime: { type: string; scheduledTime?: string } = { type: 'asap' }
    if (service_time) {
      try {
        parsedServiceTime = typeof service_time === 'string' ? JSON.parse(service_time) : service_time
      } catch (e) {}
    }

    const cashOrderReference = `CASH-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    const dbUserId = user_id ? parseInt(user_id, 10) : null

    // For logged-in users, ensure we have their name for the kitchen receipt
    // If delivery_address.name is empty but user_id exists, look up the user's name
    let customerName = delivery_address?.name
    if (dbUserId) {
      const { data: userData } = await (adminSupabase as any)
        .schema('menuca_v3')
        .from('users')
        .select('first_name, last_name, email, phone')
        .eq('id', dbUserId)
        .maybeSingle() as { data: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null }
      
      if (userData) {
        if (!customerName) {
          customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
          if (!customerName) {
            customerName = userData.email?.split('@')[0] || 'Customer'
          }
        }

        // Update user profile with checkout details they provided (e.g. phone-only users adding name/email)
        const profileUpdates: Record<string, string> = {}
        const checkoutName = delivery_address?.name?.trim()
        if (checkoutName && !userData.first_name && !userData.last_name) {
          const nameParts = checkoutName.split(' ')
          profileUpdates.first_name = nameParts[0]
          if (nameParts.length > 1) {
            profileUpdates.last_name = nameParts.slice(1).join(' ')
          }
        }
        if (delivery_address?.email && !userData.email) {
          profileUpdates.email = delivery_address.email
        }
        if (delivery_address?.phone && !userData.phone) {
          profileUpdates.phone = delivery_address.phone
        }

        if (Object.keys(profileUpdates).length > 0) {
          console.log('[Cash Order] Updating user profile with checkout details:', { user_id: dbUserId, updates: Object.keys(profileUpdates) })
          await (adminSupabase as any)
            .schema('menuca_v3')
            .from('users')
            .update(profileUpdates)
            .eq('id', dbUserId)
        }
      }
    }

    // Format items for orders.items JSONB column (tablet API reads from here)
    // Match the format used by credit card orders for consistency
    const itemsForOrdersTable = validatedItems.map(item => {
      const basePrice = parseFloat(item.unit_price)
      // Calculate modifier total: sum of (price × quantity) for each modifier
      const modifierTotal = item.modifiers.reduce((sum, mod) => {
        const modPrice = parseFloat(mod.modifier_price) || 0
        const modQty = mod.quantity || 1
        return sum + (modPrice * modQty)
      }, 0)
      // Subtotal = (basePrice + modifierTotal) × item quantity
      const subtotal = (basePrice + modifierTotal) * item.quantity
      
      return {
        dish_id: item.dish_id,
        name: item.dish_name,  // Use 'name' for consistency with credit card orders
        size: item.size_variant || 'default',
        quantity: item.quantity,
        unit_price: basePrice,
        subtotal: subtotal,
        special_instructions: item.special_instructions || null,  // Tablet API reads this as 'notes'
        modifiers: item.modifiers.map(mod => ({
          id: mod.modifier_id,
          name: mod.modifier_name,
          price: parseFloat(mod.modifier_price) || 0,
          quantity: mod.quantity || 1,
          placement: mod.placement || null,
          group_name: mod.group_name || null,
        })),
      }
    })

    // Generate unique order number (same format as credit card orders)
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const { data: paymentConfig } = await (adminSupabase as any)
      .schema('menuca_v3')
      .from('delivery_and_pickup_configs')
      .select('payment_mode')
      .eq('restaurant_id', restaurant.id)
      .maybeSingle()
    const paymentMode = paymentConfig?.payment_mode || 'test'

    const orderData = {
      order_number: orderNumber,
      restaurant_id: restaurant.id,
      user_id: dbUserId,
      guest_email: !dbUserId ? (guest_email || null) : null,
      // Always store customer name/phone for receipt printing (tablet API reads these fields)
      guest_name: customerName || 'Guest Customer',
      guest_phone: delivery_address?.phone || null,
      is_guest_order: !dbUserId,
      order_type: finalOrderType,
      order_status: 'pending',
      payment_status: 'pending',
      payment_method: payment_type,
      subtotal: serverSubtotal.toFixed(2),
      tax_amount: serverTax.toFixed(2),
      tax_breakdown: taxBreakdown, // Itemized tax breakdown for multi-tax provinces (e.g., Quebec TPS + TVQ)
      tax_province_id: taxProvinceId, // Province ID for tax audit trail
      delivery_fee: deliveryFee.toFixed(2),
      total_amount: serverTotal.toFixed(2),
      delivery_address: delivery_address ? JSON.stringify({ ...delivery_address, service_time: parsedServiceTime }) : null,
      items: itemsForOrdersTable,  // Store items in JSONB column for tablet API
      special_instructions: (() => {
        const parts: string[] = []
        if (order_notes?.trim()) parts.push(order_notes.trim())
        if (parsedServiceTime.type === 'scheduled' && parsedServiceTime.scheduledTime) {
          parts.push(`Scheduled for: ${parsedServiceTime.scheduledTime}`)
        }
        return parts.length > 0 ? parts.join(' | ') : null
      })(),
      stripe_payment_intent_id: cashOrderReference,
      is_test_order: paymentMode === 'test',
    }

    console.log('[Cash Order API] Creating order:', orderData)

    const { data: order, error: orderError } = await ((adminSupabase as any)
      .schema('menuca_v3')
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

    const { error: itemsError } = await (adminSupabase as any)
      .schema('menuca_v3')
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
        // Calculate estimated time based on service_time
        let estimatedTime: string
        if (service_time?.type === 'scheduled' && service_time.scheduledTime) {
          const scheduledDate = new Date(service_time.scheduledTime)
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
          // Use dynamic prep time based on busy mode and peak hours
          const prepTimeResult = await getEffectivePrepTime(restaurantId)
          estimatedTime = formatPrepTimeRange(prepTimeResult.prep_time_minutes, order_type as 'pickup' | 'delivery')
          console.log(`[Cash Order API] Dynamic prep time for restaurant ${restaurantId}: ${prepTimeResult.prep_time_minutes}min (mode: ${prepTimeResult.mode}, is_busy: ${prepTimeResult.is_busy})`)
        }

        // Get restaurant location for pickup orders
        const restaurantLocation = restaurant.restaurant_locations?.[0]
        
        await sendOrderConfirmationEmail({
          customerEmail: email,
          orderNumber: order.id.toString(),
          restaurantName: restaurant.name,
          restaurantLogoUrl: restaurant.logo_url || undefined,
          orderType: order_type as 'delivery' | 'pickup',
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
          taxBreakdown: taxBreakdown,
          deliveryFee: deliveryFee,
          total: serverTotal,
          estimatedDeliveryTime: estimatedTime,
          ...(order_type === 'pickup' && restaurantLocation ? {
            pickupLocation: {
              name: restaurant.name,
              address: restaurantLocation.street_address || '',
              city: '',
              province: 'ON',
              postal_code: restaurantLocation.postal_code || '',
              phone: restaurantLocation.phone || undefined,
            }
          } : {
            deliveryAddress: {
              street: delivery_address.street_address || '',
              city: delivery_address.city || delivery_address.city_name || '',
              province: delivery_address.province || 'ON',
              postal_code: delivery_address.postal_code || '',
              delivery_instructions: delivery_address.delivery_instructions,
            }
          }),
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
      total: serverTotal,
      token: cashOrderReference  // Required for guest order confirmation page access
    })

  } catch (error: any) {
    console.error('[Cash Order API] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 })
  }
}
