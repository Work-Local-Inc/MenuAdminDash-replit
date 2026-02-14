import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    // Validate order ID
    if (!orderId || isNaN(Number(orderId))) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    // Check authentication first using regular client
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    // Use admin client to fetch order (bypasses RLS, but we validate access below)
    const supabase = createAdminClient() as any

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(
          id,
          name,
          primary_color,
          restaurant_locations(
            street_address,
            city_id,
            province_id,
            postal_code,
            phone,
            is_primary,
            is_active
          )
        )
      `)
      .eq('id', orderId)
      .single() as { 
        data: {
          id: number
          user_id: number | null
          is_guest_order: boolean
          guest_email: string | null
          guest_name: string | null
          restaurant_id: number
          order_type: 'delivery' | 'pickup'
          payment_status: string
          payment_method: string | null
          stripe_payment_intent_id: string
          total_amount: string
          subtotal: string
          delivery_fee: string
          tax_amount: string
          items: any
          delivery_address: any
          delivery_instructions: string | null
          created_at: string
          restaurant: {
            id: number
            name: string
            primary_color?: string | null
            restaurant_locations?: Array<{
              street_address?: string
              city_id?: number
              province_id?: number
              postal_code?: string
              phone?: string
              is_primary?: boolean
              is_active?: boolean
            }>
          }
        } | null
        error: any 
      }

    if (orderError || !order) {
      console.error('[Order API] Order not found:', orderId, orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // AUTHORIZATION: Verify access rights
    const { searchParams } = new URL(request.url)
    const providedToken = searchParams.get('token')
    let hasAccess = false

    if (providedToken && providedToken === order.stripe_payment_intent_id) {
      hasAccess = true
    }

    if (!hasAccess && user) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      const userNumericId = userData?.id
      if (userNumericId && order.user_id === userNumericId) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      console.error('[Order API] Access denied', { 
        hasUser: !!user,
        hasToken: !!providedToken,
        orderUserId: order.user_id 
      })
      return NextResponse.json({ error: 'Access denied. Please check your link.' }, { status: 403 })
    }

    // Fetch current order status from order_status_history
    const { data: statusHistory, error: statusError } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as {
        data: {
          id: number
          order_id: number
          status: string
          notes: string | null
          created_at: string
        } | null
        error: any
      }

    if (statusError && statusError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Order API] Error fetching status:', statusError)
    }

    const loc = order.restaurant?.restaurant_locations?.find((l: any) => l.is_primary && l.is_active)
      || order.restaurant?.restaurant_locations?.find((l: any) => l.is_active)
      || order.restaurant?.restaurant_locations?.[0];
    
    if (loc) {
      const cityIds = loc.city_id ? [loc.city_id] : [];
      const provinceIds = loc.province_id ? [loc.province_id] : [];
      
      const [citiesResult, provincesResult] = await Promise.all([
        cityIds.length > 0
          ? supabase.from('cities').select('id, name').in('id', cityIds)
          : { data: [] },
        provinceIds.length > 0
          ? supabase.from('provinces').select('id, name').in('id', provinceIds)
          : { data: [] },
      ]);
      
      const cityName = citiesResult.data?.[0]?.name || null;
      const provinceName = provincesResult.data?.[0]?.name || null;
      
      order.restaurant = {
        ...order.restaurant,
        address: loc.street_address || null,
        city: cityName,
        province: provinceName,
        postal_code: loc.postal_code || null,
        phone: loc.phone || order.restaurant.phone || null,
      };
    }
    delete order.restaurant?.restaurant_locations;

    // Parse JSON fields if they're strings
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    
    // Convert all monetary fields from strings to numbers for UI compatibility
    const parsedItems = items.map((item: any) => ({
      ...item,
      unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
      subtotal: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : item.subtotal,
      modifiers: item.modifiers?.map((mod: any) => ({
        ...mod,
        price: typeof mod.price === 'string' ? parseFloat(mod.price) : mod.price,
      })) || []
    }))
    
    // Parse delivery_address JSONB - includes service_time for scheduled orders
    const parsedDeliveryAddress = typeof order.delivery_address === 'string' 
      ? JSON.parse(order.delivery_address) 
      : order.delivery_address
    
    // Debug: Log what we're returning
    console.log('[Order API] Order details:', {
      order_id: order.id,
      order_type: order.order_type,
      service_time: parsedDeliveryAddress?.service_time,
      has_delivery_address: !!parsedDeliveryAddress
    })
    
    const parsedOrder = {
      ...order,
      total_amount: typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : order.total_amount,
      subtotal: typeof order.subtotal === 'string' ? parseFloat(order.subtotal) : order.subtotal,
      delivery_fee: typeof order.delivery_fee === 'string' ? parseFloat(order.delivery_fee) : order.delivery_fee,
      tax_amount: typeof order.tax_amount === 'string' ? parseFloat(order.tax_amount) : order.tax_amount,
      items: parsedItems,
      delivery_address: parsedDeliveryAddress,
      current_status: statusHistory?.status || 'pending',
    }

    // SECURITY: Don't expose user email or sensitive info for public access
    // Order ID itself is the secret for accessing this public endpoint
    const responseOrder = { ...parsedOrder } as any
    if (responseOrder.user_id) {
      delete responseOrder.guest_email // Remove if exists
    }

    return NextResponse.json(responseOrder)
  } catch (error: any) {
    console.error('[Order API] Error fetching order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
