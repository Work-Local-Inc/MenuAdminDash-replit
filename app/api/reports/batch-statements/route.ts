import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'
import { getWeek, getYear } from 'date-fns'
export const dynamic = 'force-dynamic'

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
  legacy_v1_id: number | null
}

interface CommissionConfig {
  restaurant_id: number
  commission_rate: number
  commission_type: string
}

interface RestaurantStatement {
  restaurant_id: number
  legacy_id: number | null
  restaurant_name: string
  restaurant_address: string
  total_paid: number
  commission: number
  weekly_commission: number
  transaction_fees: number
  bank_fees: number
  delivery_commission: number
  delivery_tips: number
  charges: number
  hst: number
  net_total: number
  cash_count: number
  cc_count: number
  total_count: number
  last_order_date: string | null
  has_order_history: boolean
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate' },
        { status: 400 }
      )
    }

    console.log('[Batch Statements] Generating for all restaurants', { startDate, endDate })

    const supabase = await createClient()

    // Get all active restaurants
    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, legacy_v1_id')
      .order('name')

    if (restaurantsError) {
      console.error('[Batch Statements] Restaurants query error:', restaurantsError)
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      )
    }

    const restaurants = (restaurantsData || []) as RestaurantRow[]

    // Get all orders for the date range
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
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded'])
      .in('order_status', ['completed', 'accepted', 'ready', 'preparing'])

    if (ordersError) {
      console.error('[Batch Statements] Orders query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const orders = (ordersData || []) as OrderRow[]

    // Get all commission configs
    const { data: configsData } = await supabase
      .from('restaurant_commission_configs')
      .select('*')

    const configs = (configsData || []) as CommissionConfig[]
    const configMap = new Map(configs.map(c => [c.restaurant_id, c]))

    // Get all adjustments for the date range
    const { data: adjustmentsData } = await (supabase as any)
      .from('statement_adjustments')
      .select('*')
      .gte('applies_to_week_start', startDate)
      .lte('applies_to_week_start', endDate)

    const allAdjustments = (adjustmentsData || []) as any[]

    // Group adjustments by restaurant_id
    const adjustmentsByRestaurant = new Map<number, any[]>()
    for (const adj of allAdjustments) {
      const existing = adjustmentsByRestaurant.get(adj.restaurant_id) || []
      existing.push(adj)
      adjustmentsByRestaurant.set(adj.restaurant_id, existing)
    }

    // Get restaurant addresses from menuca_v3 schema
    const { data: contactsData } = await supabase
      .schema('menuca_v3')
      .from('restaurant_contacts')
      .select('restaurant_id, address, city, postal_code')

    const addressMap = new Map<number, string>()
    if (contactsData) {
      for (const contact of contactsData as Array<{ restaurant_id: number; address: string | null; city: string | null; postal_code: string | null }>) {
        const parts = [contact.address, contact.city, contact.postal_code].filter(Boolean)
        addressMap.set(contact.restaurant_id, parts.join(', '))
      }
    }

    // Get last order date for each restaurant (for activity indicator)
    const { data: lastOrdersData } = await supabase
      .from('orders')
      .select('restaurant_id, created_at')
      .in('payment_status', ['paid', 'succeeded'])
      .order('created_at', { ascending: false })

    // Build a map of restaurant_id -> last order date
    const lastOrderMap = new Map<number, string>()
    const hasOrderHistoryMap = new Map<number, boolean>()
    if (lastOrdersData) {
      for (const order of lastOrdersData as Array<{ restaurant_id: number; created_at: string }>) {
        if (!lastOrderMap.has(order.restaurant_id)) {
          lastOrderMap.set(order.restaurant_id, order.created_at)
        }
        hasOrderHistoryMap.set(order.restaurant_id, true)
      }
    }

    // Group orders by restaurant
    const ordersByRestaurant = new Map<number, OrderRow[]>()
    for (const order of orders) {
      const existing = ordersByRestaurant.get(order.restaurant_id) || []
      existing.push(order)
      ordersByRestaurant.set(order.restaurant_id, existing)
    }

    // Calculate statement for each restaurant
    const statements: RestaurantStatement[] = []

    for (const restaurant of restaurants) {
      const restaurantOrders = ordersByRestaurant.get(restaurant.id) || []
      const config = configMap.get(restaurant.id)

      // Cash payments include cash and door payment methods
      const cashPaymentMethods = ['cash', 'credit_at_door', 'debit_at_door', 'credit_or_debit_at_door']
      const cashOrders = restaurantOrders.filter(o => cashPaymentMethods.includes(o.payment_method || ''))
      // Stripe orders have stripe_payment_intent_id set
      const ccOrders = restaurantOrders.filter(o => 
        o.stripe_payment_intent_id || o.payment_method === 'credit_card' || o.payment_method === 'card'
      )
      const interacOrders = restaurantOrders.filter(o => o.payment_method === 'interac')

      const cashTotal = cashOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
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

      const totalPaid = ccTotal + interacTotal
      const deliveryTips = restaurantOrders.reduce((sum, o) => sum + (o.tip_amount || 0), 0)

      // Calculate net charges from adjustments
      const restaurantAdjustments = adjustmentsByRestaurant.get(restaurant.id) || []
      const totalCharges = restaurantAdjustments
        .filter((a: any) => a.adjustment_type === 'charge')
        .reduce((sum: number, a: any) => sum + Math.round(parseFloat(a.amount) * 100) / 100, 0)
      const totalCredits = restaurantAdjustments
        .filter((a: any) => a.adjustment_type === 'credit')
        .reduce((sum: number, a: any) => sum + Math.round(parseFloat(a.amount) * 100) / 100, 0)
      const charges = totalCharges - totalCredits

      const netTotal = totalPaid - totalFees - charges

      statements.push({
        restaurant_id: restaurant.id,
        legacy_id: restaurant.legacy_v1_id,
        restaurant_name: restaurant.name,
        restaurant_address: addressMap.get(restaurant.id) || '',
        total_paid: Math.round(totalPaid * 100) / 100,
        commission: Math.round(commission * 100) / 100,
        weekly_commission: Math.round(weeklyCommission * 100) / 100,
        transaction_fees: Math.round(transactionFees * 100) / 100,
        bank_fees: Math.round(bankFees * 100) / 100,
        delivery_commission: Math.round(deliveryCommission * 100) / 100,
        delivery_tips: Math.round(deliveryTips * 100) / 100,
        charges: Math.round(charges * 100) / 100,
        hst: Math.round(hst * 100) / 100,
        net_total: Math.round(netTotal * 100) / 100,
        cash_count: cashOrders.length,
        cc_count: ccOrders.length + interacOrders.length,
        total_count: restaurantOrders.length,
        last_order_date: lastOrderMap.get(restaurant.id) || null,
        has_order_history: hasOrderHistoryMap.has(restaurant.id),
      })
    }

    const weekNumber = getWeek(new Date(startDate))
    const year = getYear(new Date(startDate))

    // Calculate totals
    const grandTotals = {
      total_paid: Math.round(statements.reduce((sum, s) => sum + s.total_paid, 0) * 100) / 100,
      commission: Math.round(statements.reduce((sum, s) => sum + s.commission, 0) * 100) / 100,
      weekly_commission: Math.round(statements.reduce((sum, s) => sum + s.weekly_commission, 0) * 100) / 100,
      transaction_fees: Math.round(statements.reduce((sum, s) => sum + s.transaction_fees, 0) * 100) / 100,
      bank_fees: Math.round(statements.reduce((sum, s) => sum + s.bank_fees, 0) * 100) / 100,
      delivery_commission: Math.round(statements.reduce((sum, s) => sum + s.delivery_commission, 0) * 100) / 100,
      delivery_tips: Math.round(statements.reduce((sum, s) => sum + s.delivery_tips, 0) * 100) / 100,
      charges: Math.round(statements.reduce((sum, s) => sum + s.charges, 0) * 100) / 100,
      hst: Math.round(statements.reduce((sum, s) => sum + s.hst, 0) * 100) / 100,
      net_total: Math.round(statements.reduce((sum, s) => sum + s.net_total, 0) * 100) / 100,
    }

    console.log('[Batch Statements] Generated', statements.length, 'statements')

    return NextResponse.json({
      week_number: weekNumber,
      year,
      period_start: startDate,
      period_end: endDate,
      statements,
      totals: grandTotals,
    })
  } catch (error) {
    console.error('[Batch Statements] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
