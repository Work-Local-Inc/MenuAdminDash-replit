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
          library_template_id,
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

    // Fetch library template modifiers for templates that reference library groups
    const libraryTemplateIds = templates
      .filter((t: any) => t.library_template_id)
      .map((t: any) => t.library_template_id)
    
    let libraryModifiers: any[] = []
    if (libraryTemplateIds.length > 0) {
      const { data: libModsData, error: libModsError } = await (supabase
        .schema('menuca_v3')
        .from('course_template_modifiers' as any)
        .select(`
          id,
          template_id,
          name,
          price,
          is_included,
          display_order,
          deleted_at
        `)
        .in('template_id', libraryTemplateIds)
        .is('deleted_at', null)
        .order('display_order', { ascending: true }) as any)
      
      if (libModsError) {
        console.log('[MENU BUILDER] Library modifiers query error:', libModsError)
      } else {
        libraryModifiers = libModsData || []
        console.log('[MENU BUILDER] Library modifiers loaded:', libraryModifiers.length)
      }
    }

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

    // Query modifier groups WITHOUT nested dish_modifiers (no FK relationship)
    let modifierGroups: any[] = []
    let dishModifiers: any[] = []
    let modifierPrices: any[] = []
    
    if (dishIds.length > 0) {
      // Query modifier groups
      const { data: groupsData, error: groupsError } = await supabase
        .schema('menuca_v3')
        .from('modifier_groups' as any)
        .select(`
          id,
          dish_id,
          course_template_id,
          name,
          is_required,
          min_selections,
          max_selections,
          display_order,
          is_custom
        `)
        .in('dish_id', dishIds)
        .is('deleted_at', null)
        .order('display_order', { ascending: true })
      
      if (groupsError) throw groupsError
      modifierGroups = groupsData || []
      
      // Query dish_modifiers separately and join in application code
      if (modifierGroups.length > 0) {
        const modifierGroupIds = modifierGroups.map((g: any) => g.id)
        const { data: modifiersData, error: modifiersError } = await supabase
          .schema('menuca_v3')
          .from('dish_modifiers' as any)
          .select(`
            id,
            modifier_group_id,
            name,
            is_included,
            is_default,
            display_order,
            deleted_at
          `)
          .in('modifier_group_id', modifierGroupIds)
          .order('display_order', { ascending: true })
        
        if (modifiersError) {
          console.log('[MENU BUILDER] Modifiers query error:', modifiersError)
        } else {
          dishModifiers = modifiersData || []
          console.log('[MENU BUILDER] Modifiers loaded:', dishModifiers.length)
        }

        // Query dish_modifier_prices separately (pricing is in separate table)
        if (dishModifiers.length > 0) {
          const modifierIds = dishModifiers.map((m: any) => m.id)
          const { data: pricesData, error: pricesError } = await supabase
            .schema('menuca_v3')
            .from('dish_modifier_prices' as any)
            .select(`
              id,
              dish_modifier_id,
              price
            `)
            .in('dish_modifier_id', modifierIds)
          
          if (pricesError) {
            console.log('[MENU BUILDER] Modifier prices query error:', pricesError)
          } else {
            modifierPrices = pricesData || []
            console.log('[MENU BUILDER] Modifier prices loaded:', modifierPrices.length)
          }
        }
      }
    }

    // Filter soft-deleted modifiers in application layer after fetching with left joins
    const categoriesWithData = (categories as any)?.map((category: any) => ({
      ...category,
      modifier_groups: (templates as any)
        ?.filter((t: any) => t.course_id === category.id)
        .map((t: any) => {
          // CRITICAL FIX: Use library modifiers when library_template_id is set
          let modifiers: any[] = []
          if (t.library_template_id) {
            // Try library template via JOIN first
            modifiers = libraryModifiers
              .filter((m: any) => m.template_id === t.library_template_id && !m.deleted_at)
              .sort((a: any, b: any) => a.display_order - b.display_order)
            
            // DEFENSIVE FALLBACK: If library join returns empty, use course_template_modifiers
            if (!modifiers || modifiers.length === 0) {
              console.warn(`[FALLBACK] Library join empty for template ${t.id} (library_template_id: ${t.library_template_id}), using course_template_modifiers`)
              modifiers = t.course_template_modifiers?.filter((m: any) => !m.deleted_at) || []
            }
          } else {
            // Use own modifiers for custom (non-library) templates
            modifiers = t.course_template_modifiers?.filter((m: any) => !m.deleted_at) || []
          }
          
          return {
            ...t,
            course_template_modifiers: modifiers
          }
        }) || [],
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
            .map((g: any) => {
              let modifiers: any[] = []
              
              // ===================================================================
              // STATE GUARD: Handle mixed state (cloned vs linked modifiers)
              // ===================================================================
              // PRIORITY 1: If course_template_id is set (inherited) → fetch via library
              // PRIORITY 2: If is_custom = true (broke inheritance) → fetch dish_modifiers
              // NEVER SHOW BOTH (even if both exist in database due to legacy cloning)
              // ===================================================================
              
              if (g.course_template_id) {
                // INHERITED: Fetch from library via category template
                // IGNORE any dish_modifiers that might exist (legacy clones)
                const categoryTemplate = templates.find((t: any) => t.id === g.course_template_id)
                
                if (categoryTemplate?.library_template_id) {
                  // TRUE LINKING: Try to fetch from library template first
                  modifiers = libraryModifiers
                    .filter((m: any) => m.template_id === categoryTemplate.library_template_id && !m.deleted_at)
                    .sort((a: any, b: any) => a.display_order - b.display_order)
                  
                  // DEFENSIVE FALLBACK: If library join returns empty, fall back to dish_modifiers
                  if (!modifiers || modifiers.length === 0) {
                    console.warn(`[FALLBACK] Library join empty for dish_group ${g.id} (library_template_id: ${categoryTemplate.library_template_id}), using dish_modifiers`)
                    modifiers = dishModifiers
                      .filter((m: any) => m.modifier_group_id === g.id && !m.deleted_at)
                      .sort((a: any, b: any) => a.display_order - b.display_order)
                  } else {
                    // MIXED STATE DETECTION: Warn if dish_modifiers also exist (shouldn't happen)
                    const legacyModifiers = dishModifiers.filter((m: any) => m.modifier_group_id === g.id && !m.deleted_at)
                    if (legacyModifiers.length > 0) {
                      console.warn('[MIXED STATE DETECTED]', {
                        message: 'Dish has both library link AND cloned modifiers',
                        dish_id: dish.id,
                        group_id: g.id,
                        course_template_id: g.course_template_id,
                        library_template_id: categoryTemplate.library_template_id,
                        library_modifiers: modifiers.length,
                        legacy_cloned_modifiers: legacyModifiers.length,
                        action: 'Using library modifiers (correct), ignoring clones (legacy)'
                      })
                    }
                  }
                } else if (categoryTemplate) {
                  // Fetch from category template's own modifiers (no library link)
                  modifiers = categoryTemplate.course_template_modifiers?.filter((m: any) => !m.deleted_at) || []
                  
                  // DEFENSIVE FALLBACK: If template modifiers empty, fall back to dish_modifiers
                  if (!modifiers || modifiers.length === 0) {
                    console.warn(`[FALLBACK] Template modifiers empty for dish_group ${g.id} (course_template_id: ${g.course_template_id}), using dish_modifiers`)
                    modifiers = dishModifiers
                      .filter((m: any) => m.modifier_group_id === g.id && !m.deleted_at)
                      .sort((a: any, b: any) => a.display_order - b.display_order)
                  } else {
                    // MIXED STATE DETECTION: Warn if dish_modifiers also exist
                    const legacyModifiers = dishModifiers.filter((m: any) => m.modifier_group_id === g.id && !m.deleted_at)
                    if (legacyModifiers.length > 0) {
                      console.warn('[MIXED STATE DETECTED]', {
                        message: 'Dish has both template link AND cloned modifiers',
                        dish_id: dish.id,
                        group_id: g.id,
                        course_template_id: g.course_template_id,
                        template_modifiers: modifiers.length,
                        legacy_cloned_modifiers: legacyModifiers.length,
                        action: 'Using template modifiers (correct), ignoring clones (legacy)'
                      })
                    }
                  }
                }
              } else if (g.is_custom) {
                // CUSTOM: Dish broke inheritance, use its own modifiers
                modifiers = dishModifiers
                  .filter((m: any) => m.modifier_group_id === g.id && !m.deleted_at)
                  .sort((a: any, b: any) => a.display_order - b.display_order)
              } else {
                // ORPHANED: No template link and not custom (shouldn't happen)
                // Check if dish_modifiers exist (legacy state)
                const orphanedModifiers = dishModifiers.filter((m: any) => m.modifier_group_id === g.id && !m.deleted_at)
                if (orphanedModifiers.length > 0) {
                  console.warn('[ORPHANED MODIFIERS DETECTED]', {
                    message: 'Modifier group has no template link and is not marked custom',
                    dish_id: dish.id,
                    group_id: g.id,
                    modifiers: orphanedModifiers.length,
                    action: 'Using dish_modifiers as fallback (needs migration)'
                  })
                  modifiers = orphanedModifiers.sort((a: any, b: any) => a.display_order - b.display_order)
                }
              }
              
              // Join modifier prices from separate query (dish_modifier_prices table)
              const modifiersWithPrices = modifiers.map((m: any) => {
                const pricesForModifier = modifierPrices.filter((p: any) => p.dish_modifier_id === m.id)
                const price = pricesForModifier[0]?.price || 0
                
                return {
                  ...m,
                  prices: pricesForModifier,
                  price // Default price for display
                }
              })
              
              return {
                ...g,
                dish_modifiers: modifiersWithPrices
              }
            }) || []
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
