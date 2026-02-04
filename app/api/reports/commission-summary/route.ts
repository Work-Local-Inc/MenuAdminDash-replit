import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'

const SUPER_ADMIN_ROLE_ID = 1
const HST_RATE = 0.13

interface OrderRow {
  id: number
  restaurant_id: number
  subtotal: number
  total_amount: number
  delivery_fee: number
  tip_amount: number
  payment_method: string | null
  payment_status: string
  order_status: string
  stripe_payment_intent_id: string | null
}

interface RestaurantRow {
  id: number
  name: string
}

interface CommissionConfig {
  restaurant_id: number
  commission_rate: number
  commission_type: string
  uses_gateway: boolean
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
    const startDate = searchParams.get('startDate') || searchParams.get('0')
    const endDate = searchParams.get('endDate') || searchParams.get('1')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required date parameters' },
        { status: 400 }
      )
    }

    console.log('[Commission Summary] Generating report for', { startDate, endDate })

    const supabase = await createClient()

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        restaurant_id,
        subtotal,
        total_amount,
        delivery_fee,
        tip_amount,
        payment_method,
        payment_status,
        order_status,
        stripe_payment_intent_id
      `)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded'])
      .in('order_status', ['completed', 'accepted', 'ready', 'preparing'])
    
    const orders = (ordersData || []) as OrderRow[]

    if (ordersError) {
      console.error('[Commission Summary] Orders query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')

    if (restaurantsError) {
      console.error('[Commission Summary] Restaurants query error:', restaurantsError)
    }

    const restaurants = (restaurantsData || []) as RestaurantRow[]
    const restaurantMap = new Map(
      restaurants.map(r => [r.id, { name: r.name }])
    )

    const { data: configData, error: configError } = await supabase
      .from('restaurant_commission_configs')
      .select('*')

    if (configError) {
      console.error('[Commission Summary] Config query error:', configError)
    }

    const commissionConfigs = (configData || []) as CommissionConfig[]
    const configMap = new Map(
      commissionConfigs.map(c => [c.restaurant_id, c])
    )

    const restaurantOrders = new Map<number, OrderRow[]>()
    for (const order of orders) {
      if (!restaurantOrders.has(order.restaurant_id)) {
        restaurantOrders.set(order.restaurant_id, [])
      }
      restaurantOrders.get(order.restaurant_id)!.push(order)
    }

    const summaryRows = []

    for (const [restaurantId, restaurantOrdersList] of Array.from(restaurantOrders.entries())) {
      const restaurantInfo = restaurantMap.get(restaurantId) || { name: `Restaurant #${restaurantId}` }
      const config = configMap.get(restaurantId)

      // Stripe orders have stripe_payment_intent_id set (payment_method may be null)
      // Cash orders have payment_method = 'cash', 'interac', 'credit_at_door', etc.
      const ccOrders = restaurantOrdersList.filter(o => 
        o.stripe_payment_intent_id || o.payment_method === 'credit_card' || o.payment_method === 'card'
      )
      const interacOrders = restaurantOrdersList.filter(o => o.payment_method === 'interac')
      const nonCashOrders = [...ccOrders, ...interacOrders]
      
      const totalUnpaid = nonCashOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const subtotalSum = nonCashOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
      const deliveryTips = restaurantOrdersList.reduce((sum, o) => sum + (o.tip_amount || 0), 0)

      const commissionRate = config?.commission_rate || 0.10
      const commissionType = config?.commission_type || 'percentage'
      const usesGateway = config?.uses_gateway !== false

      let commission = 0
      let weeklyCommission = 0
      let transactionFee = 0

      if (commissionType === 'weekly_flat' || commissionType === 'flat') {
        weeklyCommission = config?.commission_rate || 0
        transactionFee = ccOrders.length * 0.30
      } else {
        commission = subtotalSum * commissionRate
      }

      const deliveryCommission = 0

      const ccBankFee = ccOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.029 + ccOrders.length * 0.30
      const interacBankFee = interacOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.015
      const bankFee = ccBankFee + interacBankFee

      const totalServiceFees = commission + weeklyCommission + transactionFee + bankFee + deliveryCommission
      const hst = totalServiceFees * HST_RATE

      const totalFees = totalServiceFees + hst
      const netPayable = totalUnpaid - totalFees

      summaryRows.push({
        restaurant_id: restaurantId,
        restaurant_name: restaurantInfo.name,
        total_unpaid: Math.round(totalUnpaid * 100) / 100,
        commission: Math.round(commission * 100) / 100,
        weekly_commission: Math.round(weeklyCommission * 100) / 100,
        transaction_fee: Math.round(transactionFee * 100) / 100,
        bank_fee: Math.round(bankFee * 100) / 100,
        charges: 0,
        delivery_commission: Math.round(deliveryCommission * 100) / 100,
        delivery_tips: Math.round(deliveryTips * 100) / 100,
        hst: Math.round(hst * 100) / 100,
        total: Math.round(netPayable * 100) / 100,
        uses_gateway: usesGateway,
        order_count: nonCashOrders.length,
      })
    }

    summaryRows.sort((a, b) => a.total - b.total)

    console.log('[Commission Summary] Generated', summaryRows.length, 'restaurant rows')

    return NextResponse.json(summaryRows)
  } catch (error) {
    console.error('[Commission Summary] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
