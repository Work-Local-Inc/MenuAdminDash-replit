import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'
import { getWeek, getYear } from 'date-fns'

const SUPER_ADMIN_ROLE_ID = 1
const HST_RATE = 0.13

interface OrderRow {
  id: number
  subtotal: number
  total_amount: number
  delivery_fee: number
  tip_amount: number
  payment_method: string
  payment_status: string
  order_status: string
}

interface RestaurantRow {
  id: number
  name: string
  address: string | null
  hst_number: string | null
}

interface CommissionConfig {
  restaurant_id: number
  commission_rate: number
  commission_type: string
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
    const restaurantIdParam = searchParams.get('0') || searchParams.get('restaurantId')
    const startDate = searchParams.get('1') || searchParams.get('startDate')
    const endDate = searchParams.get('2') || searchParams.get('endDate')

    if (!restaurantIdParam || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: restaurantId, startDate, endDate' },
        { status: 400 }
      )
    }

    const restaurantId = parseInt(restaurantIdParam)
    if (isNaN(restaurantId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

    console.log('[Statement] Generating for restaurant', restaurantId, { startDate, endDate })

    const supabase = await createClient()

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, address, hst_number')
      .eq('id', restaurantId)
      .single()

    if (restaurantError || !restaurantData) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    const restaurant = restaurantData as RestaurantRow

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
        order_status
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .in('payment_status', ['paid', 'succeeded'])
      .in('order_status', ['completed', 'accepted', 'ready', 'preparing'])

    if (ordersError) {
      console.error('[Statement] Orders query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const orders = (ordersData || []) as OrderRow[]

    const { data: configData } = await supabase
      .from('restaurant_commission_configs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single()

    const config = configData as CommissionConfig | null

    const cashOrders = orders.filter(o => o.payment_method === 'cash')
    const ccOrders = orders.filter(o => 
      o.payment_method === 'credit_card' || o.payment_method === 'card'
    )
    const interacOrders = orders.filter(o => o.payment_method === 'interac')

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

    const totalUnpaid = ccTotal + interacTotal
    const netPayable = totalUnpaid - totalFees

    const weekNumber = getWeek(new Date(startDate))
    const year = getYear(new Date(startDate))
    const statementNumber = `STM-${restaurantId}-${year}-${String(weekNumber).padStart(2, '0')}`

    const statement = {
      statement_number: statementNumber,
      period_start: startDate,
      period_end: endDate,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address || '',
        hst_number: restaurant.hst_number,
      },
      summary: {
        cash_orders: { count: cashOrders.length, total: Math.round(cashTotal * 100) / 100 },
        cc_orders: { 
          count: ccOrders.length, 
          total: Math.round(ccTotal * 100) / 100,
          bank_fees: Math.round(ccBankFees * 100) / 100,
        },
        interac_orders: { 
          count: interacOrders.length, 
          total: Math.round(interacTotal * 100) / 100,
          bank_fees: Math.round(interacBankFees * 100) / 100,
        },
      },
      fees: {
        commission: Math.round(commission * 100) / 100,
        commission_rate: commissionRate,
        delivery_commission: Math.round(deliveryCommission * 100) / 100,
        weekly_commission: Math.round(weeklyCommission * 100) / 100,
        transaction_fees: Math.round(transactionFees * 100) / 100,
        bank_fees: Math.round(bankFees * 100) / 100,
        hst: Math.round(hst * 100) / 100,
        total_fees: Math.round(totalFees * 100) / 100,
      },
      net_payable: Math.round(netPayable * 100) / 100,
    }

    console.log('[Statement] Generated statement', statementNumber)

    return NextResponse.json(statement)
  } catch (error) {
    console.error('[Statement] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
