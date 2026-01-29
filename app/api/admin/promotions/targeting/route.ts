import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const { adminUser } = await verifyAdminAuth(request)
    
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
        .select('id, name_en, name_fr, display_order')
        .eq('restaurant_id', parseInt(restaurantId))
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .schema('menuca_v3')
        .from('dishes')
        .select('id, name_en, name_fr, course_id, display_order')
        .eq('restaurant_id', parseInt(restaurantId))
        .eq('is_active', true)
        .order('display_order', { ascending: true })
    ])

    if (coursesResult.error) throw coursesResult.error
    if (dishesResult.error) throw dishesResult.error

    // Use name_en with name_fr fallback for bilingual support
    const courses = (coursesResult.data || []).map((course: any) => ({
      id: course.id,
      name: course.name_en || course.name_fr || `Course ${course.id}`,
      type: 'course' as const,
    }))

    const dishes = (dishesResult.data || []).map((dish: any) => ({
      id: dish.id,
      name: dish.name_en || dish.name_fr || `Dish ${dish.id}`,
      courseId: dish.course_id,
      type: 'dish' as const,
    }))

    return NextResponse.json({ courses, dishes })
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[Targeting API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch targeting options' },
      { status: 500 }
    )
  }
}
