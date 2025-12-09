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

    // Dual-ID lookup: try V3 ID first, fall back to legacy_v1_id
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

    // Get all dishes for this restaurant
    const { data: dishes, error: dishesError } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('id, name, course_id')
      .eq('restaurant_id', dishRestaurantId)
      .is('deleted_at', null)
      .order('name')

    if (dishesError) {
      console.error('Error fetching dishes:', dishesError)
      return NextResponse.json({ error: 'Failed to fetch dishes' }, { status: 500 })
    }

    // Get courses for category names
    const { data: courses } = await supabase
      .schema('menuca_v3')
      .from('courses')
      .select('id, name')
      .eq('restaurant_id', restaurant.id)

    const courseMap = new Map((courses || []).map((c: any) => [c.id, c.name]))

    // Get actual links based on modifier type
    let linkedDishIds = new Set<number>()
    
    if (groupId) {
      const groupIdNum = parseInt(groupId)
      
      if (source === 'combo') {
        // Combo modifiers use dish_combo_groups junction table
        const { data: comboLinks } = await supabase
          .schema('menuca_v3')
          .from('dish_combo_groups')
          .select('dish_id')
          .eq('combo_group_id', groupIdNum)
          .eq('is_active', true)
        
        if (comboLinks) {
          comboLinks.forEach((link: any) => linkedDishIds.add(link.dish_id))
        }
        
        console.log('[Dish Assignments API] Combo links found:', {
          groupId: groupIdNum,
          linkedCount: linkedDishIds.size,
          linkedIds: Array.from(linkedDishIds)
        })
      } else {
        // Simple modifiers: modifier_groups.dish_id is direct FK
        const { data: simpleGroup } = await supabase
          .schema('menuca_v3')
          .from('modifier_groups')
          .select('dish_id')
          .eq('id', groupIdNum)
          .single()
        
        if (simpleGroup?.dish_id) {
          linkedDishIds.add(simpleGroup.dish_id)
        }
        
        console.log('[Dish Assignments API] Simple modifier link:', {
          groupId: groupIdNum,
          dishId: simpleGroup?.dish_id
        })
      }
    }

    // Map dishes with actual assignment status
    const dishAssignments = (dishes || []).map((dish: any) => {
      const isLinked = linkedDishIds.has(dish.id)
      
      return {
        id: dish.id,
        name: dish.name,
        category: courseMap.get(dish.course_id) || 'Uncategorized',
        category_id: dish.course_id,
        inherited: false, // Category-level inheritance (future enhancement)
        override: isLinked, // Direct dish-level assignment
        overrideReason: isLinked ? 'Directly assigned' : null
      }
    })

    return NextResponse.json(dishAssignments)
  } catch (error: any) {
    console.error('Error fetching dish assignments:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    )
  }
}
