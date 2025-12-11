import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyDeviceAuth, isAuthError, checkRateLimit, rateLimitResponse } from '@/lib/tablet/verify-device'
import { maskEmail, maskPhone } from '@/lib/tablet/auth'
import type { TabletOrder, TabletOrderItem } from '@/types/tablet'

/**
 * GET /api/tablet/orders/[id]
 *
 * Fetch a single order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

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

    // Validate order ID
    const orderIdNum = parseInt(orderId, 10)
    if (isNaN(orderIdNum)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient() as any

    // Fetch order - must belong to device's restaurant
    const { data: order, error: orderError } = await supabase
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
        special_instructions,
        subtotal,
        delivery_fee,
        tax_amount,
        tip_amount,
        total_amount,
        payment_status,
        acknowledged_at,
        acknowledged_by_device_id,
        users (
          id,
          first_name,
          last_name,
          phone,
          email
        )
      `)
      .eq('id', orderIdNum)
      .eq('restaurant_id', deviceContext.restaurant_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get status history
    const { data: statusHistory } = await supabase
      .from('order_status_history')
      .select('status, notes, created_at')
      .eq('order_id', orderIdNum)
      .order('created_at', { ascending: false })

    // Transform order (same logic as list endpoint)
    let customerName = 'Unknown Customer'
    let customerPhone = ''
    let customerEmail = ''

    if (order.is_guest_order) {
      customerName = order.guest_name || 'Guest'
      customerPhone = order.guest_phone || ''
      customerEmail = order.guest_email || ''
    } else if (order.users) {
      const user = order.users as any
      customerName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Customer'
      customerPhone = user.phone || ''
      customerEmail = user.email || ''
    }

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
    const deliveryAddress = typeof order.delivery_address === 'string'
      ? JSON.parse(order.delivery_address)
      : order.delivery_address

    const serviceTime = deliveryAddress?.service_time || { type: 'asap' }

    // Transform items - use 'notes' field for printer app compatibility
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
        placement: mod.placement || null,
      })),
      notes: item.special_instructions || item.notes || null, // Printer app expects 'notes'
    }))

    const transformedOrder: TabletOrder = {
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

      subtotal: parseFloat(order.subtotal as string) || 0,
      delivery_fee: parseFloat(order.delivery_fee as string) || 0,
      tax_amount: parseFloat(order.tax_amount as string) || 0,
      tip_amount: parseFloat(order.tip_amount as string) || 0,
      total_amount: parseFloat(order.total_amount as string) || 0,

      payment_status: order.payment_status,

      service_time: serviceTime,

      // Order-level notes for printer app (from special_instructions column)
      notes: order.special_instructions || null,

      acknowledged_at: order.acknowledged_at || undefined,
      acknowledged_by_device_id: order.acknowledged_by_device_id || undefined,
    }

    return NextResponse.json({
      order: transformedOrder,
      status_history: statusHistory || [],
    })
  } catch (error: any) {
    console.error('[Tablet Order Detail] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tablet/orders/[id]
 *
 * Acknowledge receipt of an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

    // Verify device authentication
    const authResult = await verifyDeviceAuth(request)
    if (isAuthError(authResult)) {
      return authResult
    }

    const deviceContext = authResult

    // Validate order ID
    const orderIdNum = parseInt(orderId, 10)
    if (isNaN(orderIdNum)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient() as any

    // Verify order belongs to device's restaurant
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, restaurant_id, acknowledged_at')
      .eq('id', orderIdNum)
      .eq('restaurant_id', deviceContext.restaurant_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if already acknowledged
    if (order.acknowledged_at) {
      return NextResponse.json({
        success: true,
        acknowledged_at: order.acknowledged_at,
        message: 'Order was already acknowledged',
      })
    }

    // Update order with acknowledgment
    const acknowledgedAt = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        acknowledged_at: acknowledgedAt,
        acknowledged_by_device_id: deviceContext.device_id,
      })
      .eq('id', orderIdNum)

    if (updateError) {
      console.error('[Tablet Order Acknowledge] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to acknowledge order' },
        { status: 500 }
      )
    }

    console.log(`[Tablet Order Acknowledge] Order ${orderIdNum} acknowledged by device ${deviceContext.device_id}`)

    return NextResponse.json({
      success: true,
      acknowledged_at: acknowledgedAt,
    })
  } catch (error: any) {
    console.error('[Tablet Order Acknowledge] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to acknowledge order' },
      { status: 500 }
    )
  }
}
