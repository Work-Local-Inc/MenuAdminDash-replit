import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if ((adminUser as any).role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const restaurantId = searchParams.get('restaurantId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createAdminClient()

    const baseColumns = `
      id,
      order_number,
      total_amount,
      subtotal,
      delivery_fee,
      tax_amount,
      tip_amount,
      payment_status,
      stripe_payment_intent_id,
      payment_method,
      created_at,
      restaurant_id,
      is_test_order,
      user_id,
      is_guest_order,
      restaurants(id, name)
    `

    const guestColumns = `
      guest_email,
      guest_name,
    `

    const buildQuery = (includeGuestColumns: boolean, forCount: boolean) => {
      const selectClause = includeGuestColumns ? guestColumns + baseColumns : baseColumns
      let query = forCount
        ? supabase.from('orders').select(selectClause, { count: 'exact', head: true })
        : supabase.from('orders').select(selectClause)

      query = query.not('stripe_payment_intent_id', 'is', null)
      query = query.or('is_test_order.is.null,is_test_order.eq.false')

      if (search) {
        const searchTrimmed = search.trim()
        const numericId = parseInt(searchTrimmed)
        if (!isNaN(numericId) && String(numericId) === searchTrimmed) {
          query = query.or(`guest_email.ilike.%${searchTrimmed}%,guest_name.ilike.%${searchTrimmed}%,stripe_payment_intent_id.ilike.%${searchTrimmed}%,id.eq.${numericId}`)
        } else {
          query = query.or(`guest_email.ilike.%${searchTrimmed}%,guest_name.ilike.%${searchTrimmed}%,stripe_payment_intent_id.ilike.%${searchTrimmed}%`)
        }
      }

      if (restaurantId) {
        const id = parseInt(restaurantId)
        if (!isNaN(id)) {
          query = query.eq('restaurant_id', id)
        }
      }

      if (status) {
        query = query.eq('payment_status', status)
      }

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`)
      }

      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`)
      }

      if (!forCount) {
        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
      }

      return query
    }

    let data: any[] | null = null
    let total = 0
    let includeGuest = true

    let countResult = await buildQuery(true, true)
    if (countResult.error) {
      includeGuest = false
      countResult = await buildQuery(false, true)
    }

    if (countResult.error) {
      console.error('[Transactions] Count query error:', countResult.error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }
    total = countResult.count || 0

    let dataResult = await buildQuery(includeGuest, false)
    if (dataResult.error && includeGuest) {
      includeGuest = false
      dataResult = await buildQuery(false, false)
    }

    if (dataResult.error) {
      console.error('[Transactions] Data query error:', dataResult.error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    data = dataResult.data || []

    const registeredUserIds = data
      .filter((o: any) => o.user_id && !o.guest_email)
      .map((o: any) => o.user_id)
    const uniqueUserIds = Array.from(new Set(registeredUserIds)) as number[]

    let usersMap: Record<number, { first_name: string; last_name: string; email: string }> = {}
    if (uniqueUserIds.length > 0) {
      const { data: usersData } = await (supabase as any)
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', uniqueUserIds)
      if (usersData) {
        for (const u of usersData) {
          usersMap[u.id] = u
        }
      }
    }

    const transactions = data.map((order: any) => {
      const registeredUser = order.user_id ? usersMap[order.user_id] : null
      const customerEmail = order.guest_email || registeredUser?.email || null
      const customerName = order.guest_name || (registeredUser ? `${registeredUser.first_name || ''} ${registeredUser.last_name || ''}`.trim() : null)

      return {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        tax_amount: order.tax_amount,
        tip_amount: order.tip_amount,
        payment_status: order.payment_status,
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        payment_method: order.payment_method,
        created_at: order.created_at,
        restaurant_id: order.restaurant_id,
        restaurant_name: order.restaurants?.name || 'Unknown Restaurant',
        customer_email: customerEmail,
        customer_name: customerName,
        is_test_order: order.is_test_order || false,
      }
    })

    return NextResponse.json({ transactions, total })
  } catch (error) {
    console.error('[Transactions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
