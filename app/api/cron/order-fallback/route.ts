import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { attemptFallbackCall, FallbackCallResult } from '@/lib/twilio/order-fallback'

const ACK_TIMEOUT_SECONDS = parseInt(process.env.ORDER_FALLBACK_ACK_TIMEOUT_SECONDS || '180')
const DEVICE_OFFLINE_SECONDS = parseInt(process.env.ORDER_FALLBACK_DEVICE_OFFLINE_SECONDS || '180')
const ONLINE_GRACE_SECONDS = parseInt(process.env.ORDER_FALLBACK_ONLINE_GRACE_SECONDS || '180')
const CALL_IF_ONLINE = process.env.ORDER_FALLBACK_CALL_IF_ONLINE === 'true'
const LOOKBACK_HOURS = parseInt(process.env.ORDER_FALLBACK_LOOKBACK_HOURS || '24')
const MAX_ORDERS = parseInt(process.env.ORDER_FALLBACK_MAX_ORDERS || '50')
const CRON_SECRET = process.env.ORDER_FALLBACK_CRON_SECRET

interface OrderRow {
  id: number
  order_number: string
  restaurant_id: number
  order_type: 'delivery' | 'takeout' | 'dine_in'
  payment_status: string
  created_at: string
  acknowledged_at: string | null
  restaurant: {
    id: number
    name: string
    timezone: string
  }
}

interface DeviceRow {
  restaurant_id: number
  last_check_at: string | null
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const tokenFromHeader = authHeader?.replace('Bearer ', '')
  const tokenFromQuery = request.nextUrl.searchParams.get('token')
  const token = tokenFromHeader || tokenFromQuery

  if (!CRON_SECRET || token !== CRON_SECRET) {
    console.log('[OrderFallback Cron] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date()
    const lookbackTime = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000)
    const ackCutoffTime = new Date(now.getTime() - ACK_TIMEOUT_SECONDS * 1000)

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        restaurant_id,
        order_type,
        payment_status,
        created_at,
        acknowledged_at,
        restaurant:restaurants!inner(id, name, timezone)
      `)
      .eq('payment_status', 'paid')
      .is('acknowledged_at', null)
      .gte('created_at', lookbackTime.toISOString())
      .lte('created_at', ackCutoffTime.toISOString())
      .limit(MAX_ORDERS)
      .order('created_at', { ascending: true }) as { data: OrderRow[] | null; error: unknown }

    if (ordersError) {
      console.error('[OrderFallback Cron] Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        message: 'No unacknowledged orders found',
        processed: 0,
        calls: []
      })
    }

    console.log(`[OrderFallback Cron] Found ${orders.length} unacknowledged orders`)

    const restaurantIds = Array.from(new Set(orders.map(o => o.restaurant_id)))
    const { data: devices } = await supabase
      .from('devices')
      .select('restaurant_id, last_check_at')
      .in('restaurant_id', restaurantIds)
      .eq('device_type', 'tablet') as { data: DeviceRow[] | null }

    const deviceMap = new Map<number, Date | null>()
    devices?.forEach(d => {
      if (d.last_check_at) {
        deviceMap.set(d.restaurant_id, new Date(d.last_check_at))
      }
    })

    const results: FallbackCallResult[] = []

    for (const order of orders) {
      const restaurant = Array.isArray(order.restaurant) ? order.restaurant[0] : order.restaurant
      if (!restaurant) {
        console.warn(`[OrderFallback Cron] No restaurant found for order ${order.id}`)
        continue
      }

      const orderCreatedAt = new Date(order.created_at)
      const orderAge = (now.getTime() - orderCreatedAt.getTime()) / 1000

      const lastHeartbeat = deviceMap.get(order.restaurant_id)
      const isOnline = lastHeartbeat
        ? (now.getTime() - lastHeartbeat.getTime()) / 1000 < DEVICE_OFFLINE_SECONDS
        : false

      if (isOnline) {
        const totalGraceSeconds = ACK_TIMEOUT_SECONDS + ONLINE_GRACE_SECONDS
        if (orderAge < totalGraceSeconds) {
          console.log(`[OrderFallback Cron] Order ${order.order_number} - tablet online, waiting for extended grace period`)
          continue
        }
        if (!CALL_IF_ONLINE) {
          console.log(`[OrderFallback Cron] Order ${order.order_number} - tablet online, skipping call (CALL_IF_ONLINE=false)`)
          continue
        }
      }

      console.log(`[OrderFallback Cron] Processing order ${order.order_number} for ${restaurant.name}`)

      const result = await attemptFallbackCall(
        order.id,
        order.order_number,
        order.restaurant_id,
        restaurant.name
      )
      results.push(result)

      if (result.callResult?.success) {
        console.log(`[OrderFallback Cron] Call placed for order ${order.order_number}`)
      } else if (result.skippedReason) {
        console.log(`[OrderFallback Cron] Skipped order ${order.order_number}: ${result.skippedReason}`)
      } else {
        console.warn(`[OrderFallback Cron] Call failed for order ${order.order_number}: ${result.callResult?.error}`)
      }
    }

    const callsPlaced = results.filter(r => r.callResult?.success).length
    const callsFailed = results.filter(r => r.callResult && !r.callResult.success).length
    const callsSkipped = results.filter(r => r.skippedReason).length

    return NextResponse.json({
      message: 'Order fallback cron completed',
      processed: orders.length,
      callsPlaced,
      callsFailed,
      callsSkipped,
      results: results.map(r => ({
        orderId: r.orderId,
        orderNumber: r.orderNumber,
        restaurantName: r.restaurantName,
        phoneUsed: r.phoneUsed,
        success: r.callResult?.success || false,
        skippedReason: r.skippedReason
      }))
    })

  } catch (error) {
    console.error('[OrderFallback Cron] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
