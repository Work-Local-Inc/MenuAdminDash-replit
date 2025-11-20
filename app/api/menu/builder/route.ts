import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        description,
        display_order,
        is_active
      `)
      .eq('restaurant_id', parseInt(restaurantId))
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (categoriesError) throw categoriesError

    const { data: templates, error: templatesError } = await (supabase
      .from('course_modifier_templates' as any)
      .select(`
        id,
        course_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        course_template_modifiers (
          id,
          name,
          price,
          is_included,
          display_order
        )
      `)
      .in('course_id', (categories as any)?.map((c: any) => c.id) || [])
      .is('deleted_at', null)
      .order('display_order', { ascending: true }) as any)

    if (templatesError) throw templatesError

    const { data: dishes, error: dishesError } = await supabase
      .from('dishes')
      .select(`
        id,
        course_id,
        name,
        description,
        price,
        image_url,
        is_active,
        is_featured,
        display_order
      `)
      .eq('restaurant_id', parseInt(restaurantId))
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (dishesError) throw dishesError

    const { data: modifierGroups, error: groupsError } = await (supabase
      .from('dish_modifier_groups' as any)
      .select(`
        id,
        dish_id,
        course_template_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        is_custom,
        dish_modifiers (
          id,
          name,
          price,
          is_included,
          is_default,
          display_order
        )
      `)
      .in('dish_id', (dishes as any)?.map((d: any) => d.id) || [])
      .is('deleted_at', null)
      .order('display_order', { ascending: true }) as any)

    if (groupsError) throw groupsError

    const categoriesWithData = (categories as any)?.map((category: any) => ({
      ...category,
      templates: (templates as any)?.filter((t: any) => t.course_id === category.id) || [],
      dishes: (dishes as any)?.filter((d: any) => d.course_id === category.id).map((dish: any) => ({
        ...dish,
        modifier_groups: (modifierGroups as any)?.filter((g: any) => g.dish_id === dish.id) || []
      })) || []
    })) || []

    return NextResponse.json(categoriesWithData)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch menu builder data' },
      { status: 500 }
    )
  }
}
