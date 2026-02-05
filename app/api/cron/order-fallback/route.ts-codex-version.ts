import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTwilioCall } from '@/lib/twilio/calls'
import { getRestaurantCallPhone, recordFallbackCallAttempt, wasOrderFallbackCalled } from '@/lib/fallback/order-fallback'

export const runtime = 'nodejs'

const DEFAULT_ACK_TIMEOUT_SECONDS = 180
const DEFAULT_DEVICE_OFFLINE_SECONDS = 180
const DEFAULT_ONLINE_GRACE_SECONDS = 180
const DEFAULT_LOOKBACK_HOURS = 24
const DEFAULT_MAX_ORDERS = 50

function getCronSecret() {
  return process.env.ORDER_FALLBACK_CRON_SECRET || process.env.CRON_SECRET || ''
}

function isAuthorized(request: NextRequest) {
  const secret = getCronSecret()
  if (!secret) return false

  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length) === secret
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') || searchParams.get('secret')
  return token === secret
}

function getEnvNumber(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

async function getLatestDeviceHeartbeat(restaurantId: number) {
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('devices')
    .select('id, last_check_at, is_active')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('last_check_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[Order Fallback] Failed to fetch device heartbeat:', error)
    return null
  }

  return data
}

async function isRestaurantOpen(restaurantId: number, orderType: string) {
  const supabase = createAdminClient() as any
  const serviceType = orderType === 'delivery' ? 'delivery' : 'takeout'

  const { data, error } = await supabase.rpc('is_restaurant_open_now', {
    p_restaurant_id: restaurantId,
    p_service_type: serviceType,
    p_check_time: new Date().toISOString(),
  })

  if (error) {
    console.warn('[Order Fallback] Failed to check restaurant open status:', error)
    return false
  }

  return Boolean(data)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient() as any

  const ackTimeoutSeconds = getEnvNumber('ORDER_FALLBACK_ACK_TIMEOUT_SECONDS', DEFAULT_ACK_TIMEOUT_SECONDS)
  const deviceOfflineSeconds = getEnvNumber('ORDER_FALLBACK_DEVICE_OFFLINE_SECONDS', DEFAULT_DEVICE_OFFLINE_SECONDS)
  const onlineGraceSeconds = getEnvNumber('ORDER_FALLBACK_ONLINE_GRACE_SECONDS', DEFAULT_ONLINE_GRACE_SECONDS)
  const lookbackHours = getEnvNumber('ORDER_FALLBACK_LOOKBACK_HOURS', DEFAULT_LOOKBACK_HOURS)
  const maxOrders = getEnvNumber('ORDER_FALLBACK_MAX_ORDERS', DEFAULT_MAX_ORDERS)
  const callIfOnline = process.env.ORDER_FALLBACK_CALL_IF_ONLINE === 'true'

  const now = new Date()
  const ackCutoff = new Date(now.getTime() - ackTimeoutSeconds * 1000)
  const lookback = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, restaurant_id, order_type, order_status, created_at, acknowledged_at, payment_status')
    .is('acknowledged_at', null)
    .eq('payment_status', 'paid')
    .gte('created_at', lookback.toISOString())
    .lte('created_at', ackCutoff.toISOString())
    .order('created_at', { ascending: true })
    .limit(maxOrders)

  if (error) {
    console.error('[Order Fallback] Failed to fetch orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }

  const summary = {
    scanned: orders?.length || 0,
    called: 0,
    skipped: {
      already_called: 0,
      offline_required: 0,
      closed: 0,
      no_phone: 0,
      disabled: 0,
      error: 0,
    },
    details: [] as Array<{ order_id: number; status: string; reason?: string }>,
  }

  for (const order of orders || []) {
    try {
      const alreadyCalled = await wasOrderFallbackCalled(order.id)
      if (alreadyCalled) {
        summary.skipped.already_called += 1
        summary.details.push({ order_id: order.id, status: 'skipped', reason: 'already_called' })
        continue
      }

      const deviceHeartbeat = await getLatestDeviceHeartbeat(order.restaurant_id)
      const offlineCutoff = now.getTime() - deviceOfflineSeconds * 1000
      const isOffline = !deviceHeartbeat?.last_check_at || new Date(deviceHeartbeat.last_check_at).getTime() < offlineCutoff

      const createdAt = new Date(order.created_at)
      if (Number.isNaN(createdAt.getTime())) {
        summary.skipped.error += 1
        summary.details.push({ order_id: order.id, status: 'error', reason: 'invalid_created_at' })
        continue
      }

      if (!isOffline) {
        if (!callIfOnline) {
          summary.skipped.offline_required += 1
          summary.details.push({ order_id: order.id, status: 'skipped', reason: 'device_online' })
          continue
        }

        const onlineCutoff = now.getTime() - (ackTimeoutSeconds + onlineGraceSeconds) * 1000
        if (createdAt.getTime() > onlineCutoff) {
          summary.skipped.offline_required += 1
          summary.details.push({ order_id: order.id, status: 'skipped', reason: 'online_grace' })
          continue
        }
      }

      const isOpen = await isRestaurantOpen(order.restaurant_id, order.order_type)
      if (!isOpen) {
        summary.skipped.closed += 1
        summary.details.push({ order_id: order.id, status: 'skipped', reason: 'restaurant_closed' })
        continue
      }

      const phoneResult = await getRestaurantCallPhone(order.restaurant_id)
      if (phoneResult.source === 'disabled') {
        summary.skipped.disabled += 1
        summary.details.push({ order_id: order.id, status: 'skipped', reason: 'calls_disabled' })
        continue
      }

      if (!phoneResult.phone) {
        summary.skipped.no_phone += 1
        summary.details.push({ order_id: order.id, status: 'skipped', reason: 'no_phone' })
        continue
      }

      const callResult = await createTwilioCall({
        to: phoneResult.phone,
        orderId: order.id,
      })

      summary.called += 1
      summary.details.push({ order_id: order.id, status: 'called' })

      await recordFallbackCallAttempt({
        orderId: order.id,
        orderCreatedAt: order.created_at,
        orderStatus: order.order_status,
        notes: `Twilio fallback call attempted to ${callResult.to}. Call SID: ${callResult.sid}.`,
      })
    } catch (err: any) {
      summary.skipped.error += 1
      summary.details.push({ order_id: order.id, status: 'error', reason: err?.message || 'unknown' })
      console.error('[Order Fallback] Failed for order', order.id, err)
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    ack_timeout_seconds: ackTimeoutSeconds,
    device_offline_seconds: deviceOfflineSeconds,
    online_grace_seconds: onlineGraceSeconds,
    call_if_online: callIfOnline,
    summary,
  })
}
