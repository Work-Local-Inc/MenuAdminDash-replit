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

    const { data: courses, error: coursesError } = await supabase
      .schema('menuca_v3')
      .from('courses')
      .select('id, name')
      .eq('restaurant_id', restaurant.id)
      .order('display_order')

    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
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

    const categoryPromises = (courses || []).map(async (course: any) => {
      const { count } = await supabase
        .schema('menuca_v3')
        .from('dishes')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', dishRestaurantId)
        .eq('course_id', course.id)

      return {
        id: course.id,
        name: course.name,
        count: count || 0,
        checked: false
      }
    })

    const categories = await Promise.all(categoryPromises)

    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    )
  }
}
