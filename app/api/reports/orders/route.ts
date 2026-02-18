import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { toEasternDayStart, toEasternDayEnd } from '@/lib/utils/timezone'
export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

interface OrderRow {
  id: number
  uuid: string | null
  order_number: string | null
  restaurant_id: number
  order_type: string | null
  order_status: string | null
  subtotal: number
  tax_amount: number
  delivery_fee: number
  tip_amount: number
  discount_amount: number
  total_amount: number
  payment_method: string | null
  payment_status: string
  created_at: string
  stripe_payment_intent_id: string | null
}

interface RestaurantRow {
  id: number
  name: string
}

export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    
    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('0') || searchParams.get('startDate')
    const endDate = searchParams.get('1') || searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required date parameters' },
        { status: 400 }
      )
    }

    console.log('[Orders Report] Fetching orders for', { startDate, endDate })

    const adminSupabase = createAdminClient() as any

    const { data: ordersData, error: ordersError } = await (adminSupabase as any)
      .schema('menuca_v3')
      .from('orders')
      .select(`
        id,
        uuid,
        order_number,
        restaurant_id,
        order_type,
        order_status,
        subtotal,
        tax_amount,
        delivery_fee,
        tip_amount,
        discount_amount,
        total_amount,
        payment_method,
        payment_status,
        created_at,
        stripe_payment_intent_id
      `)
      .gte('created_at', toEasternDayStart(startDate))
      .lte('created_at', toEasternDayEnd(endDate))
      .order('created_at', { ascending: false })
      .limit(1000)

    if (ordersError) {
      console.error('[Orders Report] Query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const orders = (ordersData || []) as OrderRow[]
    const restaurantIds = Array.from(new Set(orders.map(o => o.restaurant_id)))
    
    const { data: restaurantsData } = await (adminSupabase as any)
      .schema('menuca_v3')
      .from('restaurants')
      .select('id, name')
      .in('id', restaurantIds.length > 0 ? restaurantIds : [0])

    const restaurants = (restaurantsData || []) as RestaurantRow[]
    const restaurantMap = new Map(
      restaurants.map(r => [r.id, r.name])
    )

    const formattedOrders = orders.map(order => {
      const createdAt = new Date(order.created_at)
      // Derive payment method: Stripe orders have stripe_payment_intent_id, payment_method may be null
      const derivedPaymentMethod = order.stripe_payment_intent_id 
        ? 'card' 
        : (order.payment_method || 'unknown')
      return {
        order_id: order.uuid || order.id.toString(),
        order_number: order.order_number || `#${order.id}`,
        date_placed: format(createdAt, 'yyyy-MM-dd'),
        order_time: format(createdAt, 'HH:mm:ss'),
        restaurant_id: order.restaurant_id,
        restaurant_name: restaurantMap.get(order.restaurant_id) || `Restaurant #${order.restaurant_id}`,
        order_status: order.order_status || 'pending',
        order_type: order.order_type || 'takeout',
        subtotal: order.subtotal || 0,
        tax_amount: order.tax_amount || 0,
        delivery_fee: order.delivery_fee || 0,
        tip_amount: order.tip_amount || 0,
        discount_amount: order.discount_amount || 0,
        total_amount: order.total_amount || 0,
        payment_method: derivedPaymentMethod,
        payment_status: order.payment_status || 'pending',
      }
    })

    const totals = {
      total_orders: formattedOrders.length,
      total_amount: formattedOrders.reduce((sum, o) => sum + o.total_amount, 0),
      total_cc: formattedOrders
        .filter(o => o.payment_method === 'credit_card' || o.payment_method === 'card')
        .reduce((sum, o) => sum + o.total_amount, 0),
      total_cash: formattedOrders
        .filter(o => ['cash', 'credit_at_door', 'debit_at_door', 'credit_or_debit_at_door'].includes(o.payment_method))
        .reduce((sum, o) => sum + o.total_amount, 0),
      total_interac: formattedOrders
        .filter(o => o.payment_method === 'interac')
        .reduce((sum, o) => sum + o.total_amount, 0),
      total_tips: formattedOrders.reduce((sum, o) => sum + o.tip_amount, 0),
      total_tax: formattedOrders.reduce((sum, o) => sum + o.tax_amount, 0),
      total_delivery_fees: formattedOrders.reduce((sum, o) => sum + o.delivery_fee, 0),
    }

    console.log('[Orders Report] Found', formattedOrders.length, 'orders')

    return NextResponse.json({
      orders: formattedOrders,
      totals,
    })
  } catch (error) {
    console.error('[Orders Report] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
