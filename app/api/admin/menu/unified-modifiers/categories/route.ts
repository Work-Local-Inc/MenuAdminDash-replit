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
    const source = searchParams.get('source') || 'combo' // 'simple' or 'combo'
    
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

    // Get courses for this restaurant
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

    // Dual-ID lookup for dishes
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

    // Get all dishes with their course_id for category assignment counting
    const { data: allDishes } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('id, course_id')
      .eq('restaurant_id', dishRestaurantId)
      .is('deleted_at', null)

    // Build a map of dish_id -> course_id
    const dishCourseMap = new Map((allDishes || []).map((d: any) => [d.id, d.course_id]))

    // Get linked dish IDs based on modifier type
    let linkedDishIds = new Set<number>()
    let categoriesWithLinks = new Set<number>() // Categories that have linked dishes

    if (groupId) {
      const groupIdNum = parseInt(groupId)
      
      if (source === 'combo') {
        // Combo modifiers: query dish_combo_groups
        const { data: comboLinks } = await supabase
          .schema('menuca_v3')
          .from('dish_combo_groups')
          .select('dish_id')
          .eq('combo_group_id', groupIdNum)
          .eq('is_active', true)
        
        if (comboLinks) {
          comboLinks.forEach((link: any) => {
            linkedDishIds.add(link.dish_id)
            const courseId = dishCourseMap.get(link.dish_id) as number | undefined
            if (typeof courseId === 'number') categoriesWithLinks.add(courseId)
          })
        }
      } else {
        // Simple modifiers: check course_modifier_templates for category-level linking
        const { data: templates } = await supabase
          .schema('menuca_v3')
          .from('course_modifier_templates')
          .select('course_id')
          .eq('library_template_id', groupIdNum)
          .not('course_id', 'is', null)
          .is('deleted_at', null)
        
        if (templates) {
          templates.forEach((t: any) => {
            if (t.course_id) categoriesWithLinks.add(t.course_id)
          })
        }
      }
      
      console.log('[Categories API] Links found:', {
        groupId: groupIdNum,
        source,
        linkedDishCount: linkedDishIds.size,
        categoriesWithLinks: Array.from(categoriesWithLinks)
      })
    }

    // Build category response with dish counts and checked status
    const categoryPromises = (courses || []).map(async (course: any) => {
      const { count } = await supabase
        .schema('menuca_v3')
        .from('dishes')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', dishRestaurantId)
        .eq('course_id', course.id)

      // Count how many dishes in this category are linked
      const linkedInCategory = Array.from(linkedDishIds).filter(dishId => 
        dishCourseMap.get(dishId) === course.id
      ).length

      return {
        id: course.id,
        name: course.name,
        count: count || 0,
        linkedCount: linkedInCategory, // How many dishes in this category are linked
        checked: categoriesWithLinks.has(course.id) // Category has at least one linked dish
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
