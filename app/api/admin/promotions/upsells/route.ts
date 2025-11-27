import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { getAdminAuthorizedRestaurants } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/promotions/upsells
 * Get all upsell rules for admin's authorized restaurants
 */
export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const isActive = searchParams.get('is_active')

    const supabase = createAdminClient()
    const authorizedIds = await getAdminAuthorizedRestaurants(adminUser.id)

    if (authorizedIds.length === 0) {
      return NextResponse.json({ upsells: [] })
    }

    let query = supabase
      .from('upsell_rules')
      .select(`
        *,
        restaurant:restaurant_id (
          id,
          name
        ),
        trigger_dish:trigger_dish_id (
          id,
          name
        ),
        trigger_course:trigger_course_id (
          id,
          name
        ),
        upsell_dish:upsell_dish_id (
          id,
          name
        )
      `)
      .in('restaurant_id', authorizedIds)
      .order('display_priority', { ascending: true })

    if (restaurantId) {
      if (!authorizedIds.includes(parseInt(restaurantId))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      query = query.eq('restaurant_id', parseInt(restaurantId))
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ upsells: data || [] })
  } catch (error) {
    console.error('[GET /api/admin/promotions/upsells]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch upsells' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

/**
 * POST /api/admin/promotions/upsells
 * Create a new upsell rule
 */
export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const body = await request.json()
    const { restaurant_id, ...upsellData } = body

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
    }

    const authorizedIds = await getAdminAuthorizedRestaurants(adminUser.id)
    if (!authorizedIds.includes(parseInt(restaurant_id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('upsell_rules')
      .insert({
        restaurant_id: parseInt(restaurant_id),
        ...upsellData,
        is_active: upsellData.is_active ?? true,
        display_priority: upsellData.display_priority ?? 0,
        impressions_count: 0,
        acceptance_count: 0,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ upsell: data })
  } catch (error) {
    console.error('[POST /api/admin/promotions/upsells]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create upsell' },
      { status: 500 }
    )
  }
}

