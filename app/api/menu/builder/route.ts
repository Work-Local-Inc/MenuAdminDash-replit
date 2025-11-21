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

    console.log('[MENU BUILDER] Fetching menu for restaurant:', restaurantId)

    const { data: categories, error: categoriesError } = await supabase
      .schema('menuca_v3')
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

    console.log('[MENU BUILDER] Categories query result:', {
      count: categories?.length || 0,
      error: categoriesError,
      sample: categories?.[0]
    })

    if (categoriesError) throw categoriesError

    // Fetch templates with left join (returns templates even if they have no modifiers)
    // Guard against empty category list to prevent Supabase .in() error
    const categoryIds = (categories as any)?.map((c: any) => c.id) || []
    let templates: any[] = []
    let templatesError = null
    
    if (categoryIds.length > 0) {
      const result = await (supabase
        .schema('menuca_v3')
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

    // Query dishes WITHOUT nested prices (FK relationship not in Supabase schema cache)
    const { data: dishes, error: dishesError } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select(`
        id,
        course_id,
        name,
        description,
        image_url,
        is_active,
        display_order
      `)
      .eq('restaurant_id', parseInt(restaurantId))
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    console.log('[MENU BUILDER] Dishes query result:', {
      count: dishes?.length || 0,
      error: dishesError,
      sample: dishes?.[0]
    })

    if (dishesError) throw dishesError

    // Query dish_prices separately and join in application code
    const dishIds = (dishes as any)?.map((d: any) => d.id) || []
    let dishPrices: any[] = []
    
    if (dishIds.length > 0) {
      const { data: pricesData, error: pricesError } = await supabase
        .schema('menuca_v3')
        .from('dish_prices')
        .select(`
          id,
          dish_id,
          price,
          size_variant,
          display_order
        `)
        .in('dish_id', dishIds)
        .order('display_order', { ascending: true })
      
      if (pricesError) {
        console.log('[MENU BUILDER] Prices query error:', pricesError)
      } else {
        dishPrices = pricesData || []
        console.log('[MENU BUILDER] Prices loaded:', dishPrices.length)
      }
    }

    // Fetch modifier groups with left join (returns groups even if they have no modifiers)
    // dishIds already declared above when querying prices
    let modifierGroups: any[] = []
    let groupsError = null
    
    if (dishIds.length > 0) {
      const result = await (supabase
        .schema('menuca_v3')
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
      dishes: (dishes as any)?.filter((d: any) => d.course_id === category.id).map((dish: any) => {
        // Join dish_prices from separate query
        const dishPricesForDish = dishPrices.filter((p: any) => p.dish_id === dish.id)
        const sortedPrices = dishPricesForDish.sort((a: any, b: any) => a.display_order - b.display_order)
        const defaultPrice = sortedPrices[0]?.price || 0
        
        return {
          ...dish,
          dish_prices: dishPricesForDish, // Add prices array from separate query
          price: defaultPrice, // Computed price from first variant
          modifier_groups: (modifierGroups as any)
            ?.filter((g: any) => g.dish_id === dish.id)
            .map((g: any) => ({
              ...g,
              // Filter out soft-deleted dish modifiers
              dish_modifiers: g.dish_modifiers?.filter((m: any) => !m.deleted_at) || []
            })) || []
        }
      }) || []
    })) || []

    return NextResponse.json(categoriesWithData)
  } catch (error: any) {
    console.error('[MENU BUILDER ERROR]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch menu builder data' },
      { status: 500 }
    )
  }
}
