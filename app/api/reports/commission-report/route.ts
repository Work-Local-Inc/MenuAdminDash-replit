import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'

const SUPER_ADMIN_ROLE_ID = 1
const HST_RATE = 0.13

interface OrderRow {
  id: number
  subtotal: number
  total_amount: number
  delivery_fee: number
  tip_amount: number
  payment_method: string | null
  payment_status: string
  order_status: string
  stripe_payment_intent_id: string | null
  restaurant_id: number
}

interface RestaurantRow {
  id: number
  name: string
}

interface CommissionConfig {
  restaurant_id: number
  commission_rate: number
  commission_type: string
}

interface SnapshotRow {
  restaurant_id: number
  this_week_net: number
  next_week_balance: number
  net_paid: number
}

interface AdjustmentRow {
  restaurant_id: number
  adjustment_type: string
  amount: string | number
  tax_exempt: boolean
}

function round2(val: number): number {
  return Math.round(val * 100) / 100
}

function calculateRestaurantFees(
  restaurantOrders: OrderRow[],
  config: CommissionConfig | undefined
) {
  const cashPaymentMethods = ['cash', 'credit_at_door', 'debit_at_door', 'credit_or_debit_at_door']
  const ccOrders = restaurantOrders.filter(o =>
    o.stripe_payment_intent_id || o.payment_method === 'credit_card' || o.payment_method === 'card'
  )
  const interacOrders = restaurantOrders.filter(o => o.payment_method === 'interac')

  const ccTotal = ccOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const interacTotal = interacOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const subtotalSum = [...ccOrders, ...interacOrders].reduce((sum, o) => sum + (o.subtotal || 0), 0)

  const ccBankFees = ccTotal * 0.029 + ccOrders.length * 0.30
  const interacBankFees = interacTotal * 0.015

  const commissionRate = config?.commission_rate || 0.10
  const commissionType = config?.commission_type || 'percentage'

  let commission = 0
  let weeklyCommission = 0
  let transactionFees = 0

  if (commissionType === 'weekly_flat' || commissionType === 'flat') {
    weeklyCommission = config?.commission_rate || 0
    transactionFees = (ccOrders.length + interacOrders.length) * 0.30
  } else {
    commission = subtotalSum * commissionRate
  }

  const deliveryCommission = 0
  const bankFees = ccBankFees + interacBankFees

  const totalServiceFees = commission + weeklyCommission + transactionFees + bankFees + deliveryCommission
  const hst = totalServiceFees * HST_RATE
  const totalFees = totalServiceFees + hst

  const totalUnpaid = ccTotal + interacTotal

  return { totalUnpaid, totalFees }
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
    const weekStart = searchParams.get('weekStart')
    const weekEnd = searchParams.get('weekEnd')

    if (!weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'Missing required parameters: weekStart, weekEnd' },
        { status: 400 }
      )
    }

    console.log('[Commission Report] Generating for', { weekStart, weekEnd })

    const supabase = await createClient()

    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')
      .order('name')

    if (restaurantsError) {
      console.error('[Commission Report] Restaurants query error:', restaurantsError)
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      )
    }

    const restaurants = (restaurantsData || []) as RestaurantRow[]

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        subtotal,
        total_amount,
        delivery_fee,
        tip_amount,
        payment_method,
        payment_status,
        order_status,
        stripe_payment_intent_id,
        restaurant_id
      `)
      .gte('created_at', `${weekStart}T00:00:00`)
      .lte('created_at', `${weekEnd}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded'])
      .in('order_status', ['completed', 'accepted', 'ready', 'preparing'])

    if (ordersError) {
      console.error('[Commission Report] Orders query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const orders = (ordersData || []) as OrderRow[]

    const { data: configsData } = await supabase
      .from('restaurant_commission_configs')
      .select('*')

    const configs = (configsData || []) as CommissionConfig[]
    const configMap = new Map(configs.map(c => [c.restaurant_id, c]))

    const { data: adjustmentsData } = await (supabase as any)
      .from('statement_adjustments')
      .select('*')
      .gte('applies_to_week_start', weekStart)
      .lte('applies_to_week_start', weekEnd)

    const adjustments = (adjustmentsData || []) as AdjustmentRow[]

    const adjustmentsByRestaurant = new Map<number, AdjustmentRow[]>()
    for (const adj of adjustments) {
      const existing = adjustmentsByRestaurant.get(adj.restaurant_id) || []
      existing.push(adj)
      adjustmentsByRestaurant.set(adj.restaurant_id, existing)
    }

    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0]

    const { data: snapshotsData } = await (supabase as any)
      .from('commission_weekly_snapshots')
      .select('restaurant_id, this_week_net, next_week_balance, net_paid')
      .eq('week_start', prevWeekStartStr)

    const snapshots = (snapshotsData || []) as SnapshotRow[]
    const snapshotMap = new Map(snapshots.map(s => [s.restaurant_id, s]))

    const ordersByRestaurant = new Map<number, OrderRow[]>()
    for (const order of orders) {
      const existing = ordersByRestaurant.get(order.restaurant_id) || []
      existing.push(order)
      ordersByRestaurant.set(order.restaurant_id, existing)
    }

    const restaurantResults: Array<{
      restaurant_id: number
      restaurant_name: string
      this_week: number
      prev_week: number
      carry_value: number
      net_paid: number
      next_week: number
      has_snapshot: boolean
    }> = []

    for (const restaurant of restaurants) {
      const restaurantOrders = ordersByRestaurant.get(restaurant.id) || []
      const config = configMap.get(restaurant.id)
      const restAdjustments = adjustmentsByRestaurant.get(restaurant.id) || []

      const { totalUnpaid, totalFees } = calculateRestaurantFees(restaurantOrders, config)

      const totalCharges = restAdjustments
        .filter(a => a.adjustment_type === 'charge')
        .reduce((sum, a) => sum + round2(parseFloat(String(a.amount))), 0)

      const totalCredits = restAdjustments
        .filter(a => a.adjustment_type === 'credit')
        .reduce((sum, a) => sum + round2(parseFloat(String(a.amount))), 0)

      const thisWeek = round2(totalUnpaid - totalFees - totalCharges + totalCredits)

      const prevSnapshot = snapshotMap.get(restaurant.id)
      const prevWeek = prevSnapshot ? round2(Number(prevSnapshot.this_week_net)) : 0
      const carryValue = prevSnapshot ? round2(Number(prevSnapshot.next_week_balance)) : 0
      const netPaid = 0

      const nextWeek = round2(carryValue + prevWeek + thisWeek - netPaid)

      restaurantResults.push({
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        this_week: thisWeek,
        prev_week: prevWeek,
        carry_value: carryValue,
        net_paid: netPaid,
        next_week: nextWeek,
        has_snapshot: !!prevSnapshot,
      })
    }

    const totals = {
      this_week: round2(restaurantResults.reduce((sum, r) => sum + r.this_week, 0)),
      prev_week: round2(restaurantResults.reduce((sum, r) => sum + r.prev_week, 0)),
      carry_value: round2(restaurantResults.reduce((sum, r) => sum + r.carry_value, 0)),
      net_paid: round2(restaurantResults.reduce((sum, r) => sum + r.net_paid, 0)),
      next_week: round2(restaurantResults.reduce((sum, r) => sum + r.next_week, 0)),
    }

    console.log('[Commission Report] Generated', restaurantResults.length, 'restaurant rows')

    return NextResponse.json({
      week_start: weekStart,
      week_end: weekEnd,
      restaurants: restaurantResults,
      totals,
    })
  } catch (error) {
    console.error('[Commission Report] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { weekStart, weekEnd } = body

    if (!weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: weekStart, weekEnd' },
        { status: 400 }
      )
    }

    console.log('[Commission Report] Saving snapshot for', { weekStart, weekEnd })

    const supabase = await createClient()

    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')
      .order('name')

    if (restaurantsError) {
      console.error('[Commission Report] Restaurants query error:', restaurantsError)
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      )
    }

    const restaurants = (restaurantsData || []) as RestaurantRow[]

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        subtotal,
        total_amount,
        delivery_fee,
        tip_amount,
        payment_method,
        payment_status,
        order_status,
        stripe_payment_intent_id,
        restaurant_id
      `)
      .gte('created_at', `${weekStart}T00:00:00`)
      .lte('created_at', `${weekEnd}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded'])
      .in('order_status', ['completed', 'accepted', 'ready', 'preparing'])

    if (ordersError) {
      console.error('[Commission Report] Orders query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const orders = (ordersData || []) as OrderRow[]

    const { data: configsData } = await supabase
      .from('restaurant_commission_configs')
      .select('*')

    const configs = (configsData || []) as CommissionConfig[]
    const configMap = new Map(configs.map(c => [c.restaurant_id, c]))

    const { data: adjustmentsData } = await (supabase as any)
      .from('statement_adjustments')
      .select('*')
      .gte('applies_to_week_start', weekStart)
      .lte('applies_to_week_start', weekEnd)

    const adjustments = (adjustmentsData || []) as AdjustmentRow[]

    const adjustmentsByRestaurant = new Map<number, AdjustmentRow[]>()
    for (const adj of adjustments) {
      const existing = adjustmentsByRestaurant.get(adj.restaurant_id) || []
      existing.push(adj)
      adjustmentsByRestaurant.set(adj.restaurant_id, existing)
    }

    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0]

    const { data: snapshotsData } = await (supabase as any)
      .from('commission_weekly_snapshots')
      .select('restaurant_id, this_week_net, next_week_balance, net_paid')
      .eq('week_start', prevWeekStartStr)

    const snapshots = (snapshotsData || []) as SnapshotRow[]
    const snapshotMap = new Map(snapshots.map(s => [s.restaurant_id, s]))

    const ordersByRestaurant = new Map<number, OrderRow[]>()
    for (const order of orders) {
      const existing = ordersByRestaurant.get(order.restaurant_id) || []
      existing.push(order)
      ordersByRestaurant.set(order.restaurant_id, existing)
    }

    const snapshotRows: Array<{
      restaurant_id: number
      week_start: string
      week_end: string
      this_week_net: number
      prev_week_net: number
      carry_value: number
      next_week_balance: number
      net_paid: number
    }> = []

    for (const restaurant of restaurants) {
      const restaurantOrders = ordersByRestaurant.get(restaurant.id) || []
      const config = configMap.get(restaurant.id)
      const restAdjustments = adjustmentsByRestaurant.get(restaurant.id) || []

      const { totalUnpaid, totalFees } = calculateRestaurantFees(restaurantOrders, config)

      const totalCharges = restAdjustments
        .filter(a => a.adjustment_type === 'charge')
        .reduce((sum, a) => sum + round2(parseFloat(String(a.amount))), 0)

      const totalCredits = restAdjustments
        .filter(a => a.adjustment_type === 'credit')
        .reduce((sum, a) => sum + round2(parseFloat(String(a.amount))), 0)

      const thisWeek = round2(totalUnpaid - totalFees - totalCharges + totalCredits)

      const prevSnapshot = snapshotMap.get(restaurant.id)
      const prevWeek = prevSnapshot ? round2(Number(prevSnapshot.this_week_net)) : 0
      const carryValue = prevSnapshot ? round2(Number(prevSnapshot.next_week_balance)) : 0
      const netPaid = 0

      const nextWeek = round2(carryValue + prevWeek + thisWeek - netPaid)

      snapshotRows.push({
        restaurant_id: restaurant.id,
        week_start: weekStart,
        week_end: weekEnd,
        this_week_net: thisWeek,
        prev_week_net: prevWeek,
        carry_value: carryValue,
        next_week_balance: nextWeek,
        net_paid: netPaid,
      })
    }

    let savedCount = 0
    let errorCount = 0

    for (const row of snapshotRows) {
      const { error: upsertError } = await (supabase as any)
        .from('commission_weekly_snapshots')
        .upsert(
          {
            restaurant_id: row.restaurant_id,
            week_start: row.week_start,
            week_end: row.week_end,
            this_week_net: row.this_week_net,
            prev_week_net: row.prev_week_net,
            carry_value: row.carry_value,
            next_week_balance: row.next_week_balance,
            net_paid: row.net_paid,
            snapshot_at: new Date().toISOString(),
          },
          { onConflict: 'restaurant_id,week_start' }
        )

      if (upsertError) {
        console.error('[Commission Report] Upsert error for restaurant', row.restaurant_id, upsertError)
        errorCount++
      } else {
        savedCount++
      }
    }

    console.log('[Commission Report] Snapshot saved:', savedCount, 'restaurants, errors:', errorCount)

    return NextResponse.json({
      success: true,
      saved_count: savedCount,
      error_count: errorCount,
      week_start: weekStart,
      week_end: weekEnd,
    })
  } catch (error) {
    console.error('[Commission Report] Snapshot error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
