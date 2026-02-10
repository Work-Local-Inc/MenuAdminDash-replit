import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    const orderId = parseInt(params.id)
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const baseColumns = `
      id,
      order_number,
      order_type,
      order_status,
      created_at,
      user_id,
      restaurant_id,
      items,
      subtotal,
      delivery_fee,
      tax_amount,
      tip_amount,
      total_amount,
      payment_status,
      payment_method,
      delivery_address,
      special_instructions,
      stripe_payment_intent_id,
      restaurants(id, name)
    `

    const guestColumns = `
      is_guest_order,
      guest_name,
      guest_phone,
      guest_email,
    `

    let { data, error } = await supabase
      .from('orders')
      .select(guestColumns + baseColumns)
      .eq('id', orderId)
      .single()

    if (error) {
      const fallback = await supabase
        .from('orders')
        .select(baseColumns)
        .eq('id', orderId)
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (error || !data) {
      return NextResponse.json({ error: `Order #${orderId} not found` }, { status: 404 })
    }

    if ((adminUser as any).role_id === 2) {
      const { data: assignments } = await (supabase as any)
        .schema('menuca_v3')
        .from('admin_user_restaurants')
        .select('restaurant_id')
        .eq('admin_user_id', (adminUser as any).id)

      const allowedIds = (assignments || []).map((a: any) => a.restaurant_id)
      if (!allowedIds.includes(data.restaurant_id)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const order = {
      ...data,
      total: data.total_amount,
      restaurant_name: (data as any).restaurants?.name || null,
      customer_name: (data as any).guest_name || null,
      customer_email: (data as any).guest_email || null,
      customer_phone: (data as any).guest_phone || null,
    }

    return NextResponse.json(order)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[Orders] Single order fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
