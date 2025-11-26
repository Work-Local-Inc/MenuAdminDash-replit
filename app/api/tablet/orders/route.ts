import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyDeviceAuth, isAuthError, checkRateLimit, rateLimitResponse } from '@/lib/tablet/verify-device'
import { ordersListQuerySchema } from '@/lib/validations/tablet'
import { maskEmail, maskPhone } from '@/lib/tablet/auth'
import type { TabletOrder, TabletOrderItem } from '@/types/tablet'

/**
 * GET /api/tablet/orders
 *
 * Fetch orders for the device's restaurant
 * Supports filtering by status and timestamp
 */
export async function GET(request: NextRequest) {
  try {
    // Verify device authentication
    const authResult = await verifyDeviceAuth(request)
    if (isAuthError(authResult)) {
      return authResult
    }

    const deviceContext = authResult

    // Check rate limit
    if (!checkRateLimit(deviceContext.device_id)) {
      return rateLimitResponse()
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = ordersListQuerySchema.safeParse({
      status: searchParams.get('status') || undefined,
      since: searchParams.get('since') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.flatten() },
        { status: 400 }
      )
    }

    const { status, since, limit } = queryValidation.data

    const supabase = createAdminClient()

    // Build query - orders for this restaurant only
    // Skip user join - guest info is already on the order, registered users are rare
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_type,
        order_status,
        created_at,
        user_id,
        is_guest_order,
        guest_name,
        guest_phone,
        guest_email,
        items,
        delivery_address,
        subtotal,
        delivery_fee,
        tax_amount,
        tip_amount,
        total_amount,
        payment_status,
        acknowledged_at,
        acknowledged_by_device_id
      `)
      .eq('restaurant_id', deviceContext.restaurant_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by status if provided
    if (status) {
      query = query.eq('order_status', status)
    }

    // Filter by timestamp if provided (for incremental polling)
    if (since) {
      query = query.gte('created_at', since)
    }

    const { data: orders, error: ordersError } = await query

    if (ordersError) {
      console.error('[Tablet Orders] Query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message, code: ordersError.code },
        { status: 500 }
      )
    }

    // Transform orders for tablet consumption
    const transformedOrders: TabletOrder[] = (orders || []).map((order: any) => {
      // Get customer info from user or guest fields
      let customerName = 'Unknown Customer'
      let customerPhone = ''
      let customerEmail = ''

      // Use guest info from order (most orders are guest orders)
      customerName = order.guest_name || 'Customer'
      customerPhone = order.guest_phone || ''
      customerEmail = order.guest_email || ''

      // Parse items and delivery address
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
      const deliveryAddress = typeof order.delivery_address === 'string'
        ? JSON.parse(order.delivery_address)
        : order.delivery_address

      // Extract service time from delivery_address
      const serviceTime = deliveryAddress?.service_time || { type: 'asap' }

      // Transform items
      const transformedItems: TabletOrderItem[] = items.map((item: any) => ({
        dish_id: item.dish_id,
        name: item.name,
        size: item.size || 'default',
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price) || 0,
        subtotal: parseFloat(item.subtotal) || 0,
        modifiers: (item.modifiers || []).map((mod: any) => ({
          id: mod.id,
          name: mod.name,
          price: parseFloat(mod.price) || 0,
        })),
        special_instructions: item.special_instructions,
      }))

      return {
        id: order.id,
        order_number: order.order_number,
        order_type: order.order_type as 'delivery' | 'pickup',
        order_status: order.order_status,
        created_at: order.created_at,

        customer: {
          name: customerName,
          phone: maskPhone(customerPhone),
          email: maskEmail(customerEmail),
        },

        delivery_address: order.order_type === 'delivery' && deliveryAddress ? {
          street: deliveryAddress.street || deliveryAddress.address || '',
          city: deliveryAddress.city || '',
          province: deliveryAddress.province || '',
          postal_code: deliveryAddress.postal_code || '',
          instructions: deliveryAddress.delivery_instructions || deliveryAddress.instructions || '',
        } : null,

        items: transformedItems,

        subtotal: parseFloat(order.subtotal) || 0,
        delivery_fee: parseFloat(order.delivery_fee) || 0,
        tax_amount: parseFloat(order.tax_amount) || 0,
        tip_amount: parseFloat(order.tip_amount) || 0,
        total_amount: parseFloat(order.total_amount) || 0,

        payment_status: order.payment_status,

        service_time: serviceTime,

        acknowledged_at: order.acknowledged_at,
        acknowledged_by_device_id: order.acknowledged_by_device_id,
      }
    })

    // Calculate next poll time (server provides guidance)
    const nextPollAt = new Date(Date.now() + 5000).toISOString() // 5 seconds

    return NextResponse.json({
      orders: transformedOrders,
      total_count: transformedOrders.length,
      next_poll_at: nextPollAt,
      server_time: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Tablet Orders] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch orders',
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        name: error.name,
      },
      { status: 500 }
    )
  }
}
