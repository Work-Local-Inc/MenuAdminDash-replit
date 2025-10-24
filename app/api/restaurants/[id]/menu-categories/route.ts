import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const supabase = createAdminClient()
    const restaurantId = parseInt(params.id)
    
    // Get courses
    const { data: courses, error: coursesError } = await supabase
      .schema('menuca_v3').from('courses')
      .select('id, name, description, display_order, is_active')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true })
    
    if (coursesError) throw coursesError
    
    // Get dish counts in a single query with GROUP BY
    const { data: dishCounts, error: countError } = await supabase
      .schema('menuca_v3').from('dishes')
      .select('course_id')
      .eq('restaurant_id', restaurantId)
    
    if (countError) throw countError
    
    // Build count map
    const countMap = new Map<number, number>()
    dishCounts?.forEach((dish) => {
      if (dish.course_id) {
        countMap.set(dish.course_id, (countMap.get(dish.course_id) || 0) + 1)
      }
    })
    
    // Merge counts with courses
    const coursesWithCounts = (courses || []).map((course) => ({
      ...course,
      dish_count: countMap.get(course.id) || 0
    }))
    
    return NextResponse.json(coursesWithCounts)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch menu categories' }, { status: 500 })
  }
}
