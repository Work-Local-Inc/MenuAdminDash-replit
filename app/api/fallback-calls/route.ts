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

    const supabase = createAdminClient()

    let query = supabase
      .from('orders')
      .select('id, order_number, restaurant_id, created_at, special_instructions, restaurant:restaurants!inner(id, name)')
      .ilike('special_instructions', '%[TWILIO_FALLBACK_CALL]%')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (restaurantId) {
      query = query.eq('restaurant_id', parseInt(restaurantId, 10))
    }

    if (adminUser.role_id === 2) {
      const { data: assignments } = await (supabase as any)
        .schema('menuca_v3')
        .from('admin_user_restaurants')
        .select('restaurant_id')
        .eq('admin_user_id', adminUser.id)

      const allowedIds = (assignments || []).map((a: { restaurant_id: number }) => a.restaurant_id)
      if (allowedIds.length > 0) {
        query = query.in('restaurant_id', allowedIds)
      } else {
        return NextResponse.json([])
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('[fallback-calls] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch fallback calls' }, { status: 500 })
    }

    const results = (data || []).map((order: any) => ({
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
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fallback calls' },
      { status: 500 }
    )
  }
}
