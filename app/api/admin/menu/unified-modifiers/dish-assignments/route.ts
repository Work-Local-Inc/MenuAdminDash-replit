import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any
    
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const groupId = searchParams.get('group_id')
    
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
    }

    const { data: restaurant, error: restError } = await supabase
      .schema('menuca_v3')
      .from('restaurants')
      .select('id, legacy_v1_id')
      .eq('id', parseInt(restaurantId))
      .single()

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    let dishRestaurantId = restaurant.id
    let { count: testCount } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)

    if (!testCount || testCount === 0) {
      if (restaurant.legacy_v1_id) {
        dishRestaurantId = restaurant.legacy_v1_id
      }
    }

    const { data: dishes, error: dishesError } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('id, name, course_id')
      .eq('restaurant_id', dishRestaurantId)
      .order('name')

    if (dishesError) {
      console.error('Error fetching dishes:', dishesError)
      return NextResponse.json({ error: 'Failed to fetch dishes' }, { status: 500 })
    }

    const { data: courses } = await supabase
      .schema('menuca_v3')
      .from('courses')
      .select('id, name')
      .eq('restaurant_id', restaurant.id)

    const courseMap = new Map((courses || []).map((c: any) => [c.id, c.name]))

    const dishAssignments = (dishes || []).map((dish: any) => ({
      id: dish.id,
      name: dish.name,
      category: courseMap.get(dish.course_id) || 'Uncategorized',
      category_id: dish.course_id,
      inherited: false,
      override: false,
      overrideReason: null
    }))

    return NextResponse.json(dishAssignments)
  } catch (error: any) {
    console.error('Error fetching dish assignments:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    )
  }
}
