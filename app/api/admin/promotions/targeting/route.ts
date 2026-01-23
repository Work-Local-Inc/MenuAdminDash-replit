import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient() as any
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant')
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const [coursesResult, dishesResult] = await Promise.all([
      supabase
        .schema('menuca_v3')
        .from('courses')
        .select('id, name, display_order')
        .eq('restaurant_id', parseInt(restaurantId))
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .schema('menuca_v3')
        .from('dishes')
        .select('id, name, course_id, display_order')
        .eq('restaurant_id', parseInt(restaurantId))
        .eq('is_active', true)
        .order('display_order', { ascending: true })
    ])

    if (coursesResult.error) throw coursesResult.error
    if (dishesResult.error) throw dishesResult.error

    const courses = (coursesResult.data || []).map((course: any) => ({
      id: course.id,
      name: course.name,
      type: 'course' as const,
    }))

    const dishes = (dishesResult.data || []).map((dish: any) => ({
      id: dish.id,
      name: dish.name,
      courseId: dish.course_id,
      type: 'dish' as const,
    }))

    return NextResponse.json({ courses, dishes })
  } catch (error: any) {
    console.error('[Targeting API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch targeting options' },
      { status: 500 }
    )
  }
}
