import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const orderId = parseInt(params.id)
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { reason, mark_refunded } = body as { reason?: string; mark_refunded?: boolean }

    const supabase = createAdminClient()

    const { data: order, error: fetchError } = await (supabase as any)
      .from('orders')
      .select('id, order_status, payment_status, restaurant_id, order_number')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.order_status === 'cancelled') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      )
    }

    if (!CANCELLABLE_STATUSES.includes(order.order_status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status "${order.order_status}". Only orders with status: ${CANCELLABLE_STATUSES.join(', ')} can be cancelled.` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const updateData: Record<string, any> = {
      order_status: 'cancelled',
      cancelled_at: now,
      acknowledged_at: order.acknowledged_at || now,
    }

    if (mark_refunded) {
      updateData.payment_status = 'refunded'
    }

    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to cancel order:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel order' },
        { status: 500 }
      )
    }

    const historyNote = reason
      ? `Order cancelled by admin (ID: ${adminUser.id}). Reason: ${reason}`
      : `Order cancelled by admin (ID: ${adminUser.id})`

    await (supabase as any)
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'cancelled',
        notes: historyNote,
        created_at: now,
      })

    return NextResponse.json({
      success: true,
      order_id: orderId,
      order_status: 'cancelled',
      payment_status: mark_refunded ? 'refunded' : order.payment_status,
    })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Cancel order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
