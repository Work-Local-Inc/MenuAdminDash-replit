import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request)
    const adminUser = authResult.adminUser

    if (!adminUser || typeof adminUser.id !== 'number' || typeof adminUser.role_id !== 'number') {
      return NextResponse.json({ error: 'Invalid admin user' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const restaurantId = searchParams.get('restaurant_id')

    const supabase = createAdminClient() as any

    let allowedIds: number[] | null = null
    if (adminUser.role_id === 2) {
      const { data: assignments } = await supabase
        .from('admin_user_restaurants')
        .select('restaurant_id')
        .eq('admin_user_id', adminUser.id)

      allowedIds = (assignments || []).map((a: { restaurant_id: number }) => a.restaurant_id)
      if (allowedIds!.length === 0) {
        return NextResponse.json([])
      }
    }

    const legacyQuery = supabase
      .from('orders')
      .select('id, order_number, restaurant_id, created_at, special_instructions, restaurant:restaurants!inner(id, name)')
      .ilike('special_instructions', '%[TWILIO_FALLBACK_CALL]%')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (restaurantId) legacyQuery.eq('restaurant_id', parseInt(restaurantId, 10))
    if (allowedIds) legacyQuery.in('restaurant_id', allowedIds)

    const historyQuery = supabase
      .from('order_status_history')
      .select('order_id, notes, created_at')
      .ilike('notes', '%[TWILIO_FALLBACK_CALL]%')
      .order('created_at', { ascending: false })
      .limit(limit)

    const [legacyResult, historyResult] = await Promise.all([
      legacyQuery,
      historyQuery,
    ])

    const legacyData = legacyResult.data || []
    const historyData = historyResult.data || []

    const legacyOrderIds = new Set(legacyData.map((o: any) => o.id))

    const historyOrderIdSet = new Set<number>()
    historyData.forEach((h: any) => {
      if (!legacyOrderIds.has(h.order_id)) {
        historyOrderIdSet.add(h.order_id)
      }
    })
    const historyOrderIds = Array.from(historyOrderIdSet)

    let historyOrders: any[] = []
    if (historyOrderIds.length > 0) {
      let orderQuery = supabase
        .from('orders')
        .select('id, order_number, restaurant_id, created_at, special_instructions, restaurant:restaurants!inner(id, name)')
        .in('id', historyOrderIds)

      if (restaurantId) orderQuery.eq('restaurant_id', parseInt(restaurantId, 10))
      if (allowedIds) orderQuery.in('restaurant_id', allowedIds)

      const { data: extraOrders } = await orderQuery
      historyOrders = extraOrders || []

      historyOrders = historyOrders.map((order: any) => {
        const matchingHistory = historyData.filter((h: any) => h.order_id === order.id)
        const historyNotes = matchingHistory.map((h: any) => h.notes).join('\n')
        const combined = [order.special_instructions, historyNotes].filter(Boolean).join('\n')
        return { ...order, special_instructions: combined }
      })
    }

    const allOrders = [...legacyData, ...historyOrders]
    allOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const results = allOrders.slice(0, limit).map((order: any) => ({
      order_id: order.id,
      order_number: order.order_number,
      restaurant_id: order.restaurant_id,
      restaurant_name: (Array.isArray(order.restaurant) ? order.restaurant[0] : order.restaurant)?.name || 'Unknown Restaurant',
      created_at: order.created_at,
      special_instructions: order.special_instructions,
    }))

    return NextResponse.json(results)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[fallback-calls] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fallback calls' },
      { status: 500 }
    )
  }
}
