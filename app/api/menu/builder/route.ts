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

    // Fetch templates with left join (returns templates even if they have no modifiers)
    // Guard against empty category list to prevent Supabase .in() error
    const categoryIds = (categories as any)?.map((c: any) => c.id) || []
    let templates: any[] = []
    let templatesError = null
    
    if (categoryIds.length > 0) {
      const result = await (supabase
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
            display_order,
            deleted_at
          )
        `)
        .in('course_id', categoryIds)
        .is('deleted_at', null)
        .order('display_order', { ascending: true }) as any)
      
      templates = result.data || []
      templatesError = result.error
    }

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

    // Fetch modifier groups with left join (returns groups even if they have no modifiers)
    // Guard against empty dish list to prevent Supabase .in() error
    const dishIds = (dishes as any)?.map((d: any) => d.id) || []
    let modifierGroups: any[] = []
    let groupsError = null
    
    if (dishIds.length > 0) {
      const result = await (supabase
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
            display_order,
            deleted_at
          )
        `)
        .in('dish_id', dishIds)
        .is('deleted_at', null)
        .order('display_order', { ascending: true }) as any)
      
      modifierGroups = result.data || []
      groupsError = result.error
    }

    if (groupsError) throw groupsError

    // Filter soft-deleted modifiers in application layer after fetching with left joins
    const categoriesWithData = (categories as any)?.map((category: any) => ({
      ...category,
      templates: (templates as any)
        ?.filter((t: any) => t.course_id === category.id)
        .map((t: any) => ({
          ...t,
          // Filter out soft-deleted template modifiers
          course_template_modifiers: t.course_template_modifiers?.filter((m: any) => !m.deleted_at) || []
        })) || [],
      dishes: (dishes as any)?.filter((d: any) => d.course_id === category.id).map((dish: any) => ({
        ...dish,
        modifier_groups: (modifierGroups as any)
          ?.filter((g: any) => g.dish_id === dish.id)
          .map((g: any) => ({
            ...g,
            // Filter out soft-deleted dish modifiers
            dish_modifiers: g.dish_modifiers?.filter((m: any) => !m.deleted_at) || []
          })) || []
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
