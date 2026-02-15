import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

const VALID_REASON_CODES = [
  'customer_cancellation',
  'restaurant_issue',
  'platform_issue',
  'fraud_chargeback',
  'goodwill',
  'duplicate_order',
  'other',
]

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
    const restaurantId = searchParams.get('restaurantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const reasonCode = searchParams.get('reasonCode')

    const supabase = createAdminClient()

    let query = (supabase as any)
      .from('order_refunds')
      .select('*')
      .order('created_at', { ascending: false })

    if (restaurantId) {
      const id = parseInt(restaurantId)
      if (isNaN(id)) {
        return NextResponse.json(
          { error: 'Invalid restaurant ID' },
          { status: 400 }
        )
      }
      query = query.eq('restaurant_id', id)
    }

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`)
    }

    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`)
    }

    if (reasonCode) {
      query = query.eq('reason_code', reasonCode)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Refunds] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch refunds' },
        { status: 500 }
      )
    }

    console.log(`[Refunds] Fetched ${(data || []).length} refund records`)

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[Refunds] Error:', error)
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
    const { order_id, refund_amount, refund_type, reason_code, notes } = body

    if (!order_id || !refund_amount || !refund_type || !reason_code) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, refund_amount, refund_type, reason_code' },
        { status: 400 }
      )
    }

    if (!['full', 'partial'].includes(refund_type)) {
      return NextResponse.json(
        { error: 'Invalid refund_type. Must be "full" or "partial"' },
        { status: 400 }
      )
    }

    if (!VALID_REASON_CODES.includes(reason_code)) {
      return NextResponse.json(
        { error: `Invalid reason_code. Must be one of: ${VALID_REASON_CODES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const orderSelect = 'id, order_number, restaurant_id, subtotal, total_amount, delivery_fee, tip_amount, payment_method, payment_status, order_status, stripe_payment_intent_id, created_at, is_test_order'

    let { data: orderData, error: orderError } = await (supabase as any)
      .from('orders')
      .select(orderSelect)
      .eq('id', order_id)
      .single()

    if (orderError || !orderData) {
      const fallback = await (supabase as any)
        .from('orders')
        .select(orderSelect)
        .eq('order_number', order_id)
        .single()
      orderData = fallback.data
      orderError = fallback.error
    }

    const order = orderData as any

    if (orderError || !order) {
      console.error('[Refunds] Order not found by id or order_number:', order_id, orderError)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.is_test_order) {
      return NextResponse.json(
        { error: 'Cannot refund a test order — no real money was charged' },
        { status: 400 }
      )
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'Cannot refund this order - no Stripe payment intent found (cash orders cannot be refunded)' },
        { status: 400 }
      )
    }

    if (!['paid', 'succeeded', 'partially_refunded'].includes(order.payment_status)) {
      return NextResponse.json(
        { error: `Cannot refund order with payment status "${order.payment_status}". Must be "paid", "succeeded", or "partially_refunded"` },
        { status: 400 }
      )
    }

    if (refund_amount <= 0 || refund_amount > order.total_amount) {
      return NextResponse.json(
        { error: `Refund amount must be greater than 0 and not exceed the order total of $${order.total_amount}` },
        { status: 400 }
      )
    }

    const { data: existingRefunds } = await (supabase as any)
      .from('order_refunds')
      .select('refund_amount')
      .eq('order_id', order.id)
      .eq('status', 'completed')

    const totalAlreadyRefunded = (existingRefunds || []).reduce(
      (sum: number, r: any) => sum + parseFloat(r.refund_amount),
      0
    )

    if (totalAlreadyRefunded + refund_amount > order.total_amount) {
      return NextResponse.json(
        { error: `Total refund amount ($${totalAlreadyRefunded + refund_amount}) would exceed order total ($${order.total_amount}). Already refunded: $${totalAlreadyRefunded}` },
        { status: 400 }
      )
    }

    const { data: config } = await (supabase as any)
      .from('delivery_and_pickup_configs')
      .select('payment_mode')
      .eq('restaurant_id', order.restaurant_id)
      .maybeSingle()
    const paymentMode = config?.payment_mode || 'test'

    const stripeKey = paymentMode === 'live'
      ? process.env.STRIPE_SECRET_KEY
      : process.env.TESTING_STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json(
        { error: `Missing Stripe key for ${paymentMode} mode` },
        { status: 500 }
      )
    }
    const stripe = new Stripe(stripeKey, {})

    console.log(`[Refunds] Issuing Stripe refund for order #${order.id}, amount: $${refund_amount}, mode: ${paymentMode}`)

    let stripeRefund: Stripe.Refund
    try {
      stripeRefund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: Math.round(refund_amount * 100),
        reason: reason_code === 'duplicate_order' ? 'duplicate' :
                reason_code === 'fraud_chargeback' ? 'fraudulent' : 'requested_by_customer',
      })
      console.log(`[Refunds] Stripe refund created: ${stripeRefund.id}, status: ${stripeRefund.status}`)
    } catch (stripeError: any) {
      console.error('[Refunds] Stripe refund failed:', stripeError.message)
      return NextResponse.json(
        { error: `Stripe refund failed: ${stripeError.message}` },
        { status: 500 }
      )
    }

    const refundRatio = refund_amount / order.total_amount

    const { data: commConfig } = await supabase
      .from('restaurant_commission_configs')
      .select('*')
      .eq('restaurant_id', order.restaurant_id)
      .single()

    const commissionRateRaw = (commConfig as any)?.commission_rate ?? 10
    const commissionRate = commissionRateRaw > 1 ? commissionRateRaw / 100 : commissionRateRaw
    const orderSubtotal = order.subtotal || 0

    const commissionReversed = Math.round((orderSubtotal * commissionRate * refundRatio) * 100) / 100
    const bankFeeReversed = Math.round((order.total_amount * 0.029 * refundRatio) * 100) / 100
    const transactionFeeReversed = Math.round((0.30 * refundRatio) * 100) / 100
    const serviceFeeTotal = commissionReversed + bankFeeReversed + transactionFeeReversed
    const hstReversed = Math.round((serviceFeeTotal * 0.13) * 100) / 100

    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const weekStart = monday.toISOString().split('T')[0]
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const weekEnd = sunday.toISOString().split('T')[0]

    const { data: adjustment, error: adjustmentError } = await (supabase as any)
      .from('statement_adjustments')
      .insert({
        restaurant_id: order.restaurant_id,
        adjustment_type: 'credit',
        category: 'refund',
        description: `Refund for order #${order.id} - ${reason_code.replace(/_/g, ' ')}${notes ? ': ' + notes : ''}`,
        amount: Math.round(refund_amount * 100) / 100,
        tax_exempt: true,
        applies_to_week_start: weekStart,
        applies_to_week_end: weekEnd,
        created_by: adminUser.id,
      })
      .select()
      .single()

    if (adjustmentError) {
      console.error('[Refunds] WARNING: Statement adjustment insert failed AFTER Stripe refund was issued:', adjustmentError)
      console.error('[Refunds] Stripe refund ID:', stripeRefund.id, '- This refund was already processed in Stripe!')
    }

    const { data: refundRecord, error: refundError } = await (supabase as any)
      .from('order_refunds')
      .insert({
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        refund_amount: Math.round(refund_amount * 100) / 100,
        original_order_total: Math.round(order.total_amount * 100) / 100,
        refund_type,
        reason_code,
        notes: notes || null,
        stripe_refund_id: stripeRefund.id,
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        stripe_refund_status: stripeRefund.status,
        commission_reversed: commissionReversed,
        bank_fee_reversed: bankFeeReversed,
        transaction_fee_reversed: transactionFeeReversed,
        hst_reversed: hstReversed,
        adjustment_id: adjustment?.id || null,
        applies_to_week_start: weekStart,
        applies_to_week_end: weekEnd,
        refunded_by: adminUser.id,
        refunded_by_email: adminUser.email,
        status: 'completed',
      })
      .select()
      .single()

    if (refundError) {
      console.error('[Refunds] WARNING: Order refund record insert failed AFTER Stripe refund was issued:', refundError)
      console.error('[Refunds] Stripe refund ID:', stripeRefund.id, '- This refund was already processed in Stripe!')
      return NextResponse.json(
        { error: 'Refund was processed in Stripe but failed to save record. Please contact support.', stripe_refund_id: stripeRefund.id },
        { status: 500 }
      )
    }

    const newPaymentStatus = (totalAlreadyRefunded + refund_amount >= order.total_amount) ? 'refunded' : 'partially_refunded'
    const { error: statusUpdateError } = await (supabase as any)
      .from('orders')
      .update({ payment_status: newPaymentStatus })
      .eq('id', order.id)

    if (statusUpdateError) {
      console.error('[Refunds] WARNING: Failed to update order payment_status:', statusUpdateError)
    } else {
      console.log(`[Refunds] Updated order #${order.id} payment_status to "${newPaymentStatus}"`)
    }

    console.log(`[Refunds] Refund completed successfully: refund_id=${refundRecord.id}, stripe_refund=${stripeRefund.id}`)

    return NextResponse.json({
      ...refundRecord,
      stripe_refund_id: stripeRefund.id,
      fee_breakdown: {
        commission_reversed: commissionReversed,
        bank_fee_reversed: bankFeeReversed,
        transaction_fee_reversed: transactionFeeReversed,
        hst_reversed: hstReversed,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Refunds] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
