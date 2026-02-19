import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWeek, getYear } from 'date-fns'
import { toEasternDayStart, toEasternDayEnd } from '@/lib/utils/timezone'
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
}

interface RestaurantRow {
  id: number
  name: string
}

interface RestaurantContact {
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  postal_code: string | null
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

    const supabase = createAdminClient()

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single()

    if (restaurantError || !restaurantData) {
      console.error('[Statement] Restaurant query error:', restaurantError)
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    const restaurant = restaurantData as RestaurantRow

    const { data: contactData } = await supabase
      .from('restaurant_contacts')
      .select('first_name, last_name, phone, email, address, city, postal_code')
      .eq('restaurant_id', restaurantId)
      .limit(1)
      .single()

    const contact = (contactData || {}) as RestaurantContact

    const { data: locationData } = await (supabase as any)
      .from('restaurant_locations')
      .select('street_address, city, postal_code')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .limit(1)
      .single()

    const location = (locationData || {}) as { street_address?: string; city?: string; postal_code?: string }

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
        is_test_order
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', toEasternDayStart(startDate))
      .lte('created_at', toEasternDayEnd(endDate))
      .in('payment_status', ['paid', 'succeeded'])
      .in('order_status', ['completed', 'accepted', 'ready', 'preparing'])
      .or('is_test_order.is.null,is_test_order.eq.false')

    if (ordersError) {
      console.error('[Statement] Orders query error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const orders = (ordersData || []) as OrderRow[]
    console.log(`[Statement] Found ${orders.length} orders for restaurant ${restaurantId} between ${toEasternDayStart(startDate)} and ${toEasternDayEnd(endDate)}`)
    if (orders.length > 0) {
      console.log('[Statement] Order IDs:', orders.map(o => o.id).join(', '))
    }

    const { data: configData } = await supabase
      .from('restaurant_commission_configs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single()

    const config = configData as CommissionConfig | null

    const { data: adjustmentsData } = await (supabase as any)
      .from('statement_adjustments')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('applies_to_week_start', startDate)
      .lte('applies_to_week_start', endDate)

    const adjustments = (adjustmentsData || []) as any[]

    const creditAdjustments = adjustments
      .filter((a: any) => a.adjustment_type === 'credit')
      .map((a: any) => ({
        id: a.id,
        category: a.category,
        description: a.description,
        amount: Math.round(parseFloat(a.amount) * 100) / 100,
        tax_exempt: a.tax_exempt,
      }))

    const chargeAdjustments = adjustments
      .filter((a: any) => a.adjustment_type === 'charge')
      .map((a: any) => ({
        id: a.id,
        category: a.category,
        description: a.description,
        amount: Math.round(parseFloat(a.amount) * 100) / 100,
        tax_exempt: a.tax_exempt,
      }))

    const totalCredits = creditAdjustments.reduce((sum: number, a: any) => sum + a.amount, 0)
    const totalCharges = chargeAdjustments.reduce((sum: number, a: any) => sum + a.amount, 0)

    const taxableAdjustmentNet = adjustments.reduce((sum: number, a: any) => {
      if (a.tax_exempt) return sum
      const amt = Math.round(parseFloat(a.amount) * 100) / 100
      if (a.adjustment_type === 'charge') return sum + amt
      if (a.adjustment_type === 'credit') return sum - amt
      return sum
    }, 0)

    // Cash payments include cash and door payment methods (credit_at_door, debit_at_door, etc.)
    const cashPaymentMethods = ['cash', 'credit_at_door', 'debit_at_door', 'credit_or_debit_at_door']
    const cashOrders = orders.filter(o => cashPaymentMethods.includes(o.payment_method || ''))
    // Stripe orders have stripe_payment_intent_id set (payment_method may be null)
    const ccOrders = orders.filter(o => 
      o.stripe_payment_intent_id || o.payment_method === 'credit_card' || o.payment_method === 'card'
    )
    const interacOrders = orders.filter(o => o.payment_method === 'interac')

    const cashTotal = cashOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const ccTotal = ccOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const interacTotal = interacOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const subtotalSum = [...ccOrders, ...interacOrders].reduce((sum, o) => sum + (o.subtotal || 0), 0)

    const ccBankFees = ccTotal * 0.029 + ccOrders.length * 0.30
    const interacBankFees = interacTotal * 0.015

    const commissionRateRaw = config?.commission_rate ?? 10
    const commissionRate = commissionRateRaw > 1 ? commissionRateRaw / 100 : commissionRateRaw
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
    const hstBase = totalServiceFees + taxableAdjustmentNet
    const hst = hstBase * HST_RATE
    const totalFees = totalServiceFees + hst

    const totalUnpaid = ccTotal + interacTotal
    const totalOrderValue = cashTotal + ccTotal + interacTotal
    const chargesOwed = Math.round(totalCharges * 100) / 100
    const netPayable = totalUnpaid - totalFees - totalCharges + totalCredits

    const deliveryTips = orders.reduce((sum, o) => sum + (o.tip_amount || 0), 0)
    const deliveryFees = orders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)

    const weekNumber = getWeek(new Date(startDate))
    const year = getYear(new Date(startDate))
    const statementNumber = String(weekNumber)

    const statement = {
      statement_number: statementNumber,
      period_start: startDate,
      period_end: endDate,
      menu_hst_number: "82804 8280 RT0001",
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        contact_name: contact.first_name && contact.last_name 
          ? `${contact.first_name} ${contact.last_name}` 
          : contact.first_name || '',
        address: contact.address || location.street_address || '',
        city: contact.city || location.city || '',
        postal_code: contact.postal_code || location.postal_code || '',
        phone: contact.phone || '',
        hst_number: null,
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
        commission_rate: commissionRateRaw,
        delivery_commission: Math.round(deliveryCommission * 100) / 100,
        weekly_commission: Math.round(weeklyCommission * 100) / 100,
        transaction_fees: Math.round(transactionFees * 100) / 100,
        bank_fees: Math.round(bankFees * 100) / 100,
        hst: Math.round(hst * 100) / 100,
        total_fees: Math.round(totalFees * 100) / 100,
      },
      adjustments: {
        credits: creditAdjustments,
        charges: chargeAdjustments,
        total_credits: Math.round(totalCredits * 100) / 100,
        total_charges: Math.round(totalCharges * 100) / 100,
      },
      totals: {
        total_order_value: Math.round(totalOrderValue * 100) / 100,
        total_unpaid: Math.round(totalUnpaid * 100) / 100,
        delivery_tips: Math.round(deliveryTips * 100) / 100,
        delivery_fees: Math.round(deliveryFees * 100) / 100,
        charges_owed: chargesOwed,
      },
      net_payable: Math.round(netPayable * 100) / 100,
    }

    console.log('[Statement] Generated statement', statementNumber)

    return NextResponse.json(statement)
  } catch (error: any) {
    console.error('[Statement] Error:', error)
    if (error?.statusCode === 401 || error?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
