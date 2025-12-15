import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient() as any;
    const dishId = parseInt(params.id, 10);
    
    if (isNaN(dishId)) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      );
    }
    
    // First, find combo groups linked to this dish via dish_combo_groups junction table
    const { data: dishComboGroups, error: linkError } = await supabase
      .schema('menuca_v3')
      .from('dish_combo_groups')
      .select('combo_group_id')
      .eq('dish_id', dishId)
      .eq('is_active', true);
    
    if (linkError) {
      throw linkError;
    }
    
    if (!dishComboGroups || dishComboGroups.length === 0) {
      return NextResponse.json([]);
    }
    
    const comboGroupIds = dishComboGroups.map((dcg: any) => dcg.combo_group_id);
    
    // Fetch combo groups with their metadata including special section support
    let comboGroups: any[] = [];
    
    // Fetch combo groups with all special section columns
    const fullResult = await supabase
      .schema('menuca_v3')
      .from('combo_groups')
      .select(`
        id,
        name,
        number_of_items,
        display_header,
        has_special_section
      `)
      .in('id', comboGroupIds)
      .is('deleted_at', null);
    
    if (fullResult.error) {
      // If error mentions missing column, try fetching just basic columns
      if (fullResult.error.message?.includes('does not exist') || fullResult.error.code === '42703') {
        console.log('[Combo Modifiers API] Some columns missing, falling back to basic query');
        const basicResult = await supabase
          .schema('menuca_v3')
          .from('combo_groups')
          .select(`
            id,
            name
          `)
          .in('id', comboGroupIds)
          .is('deleted_at', null);
        
        if (basicResult.error) {
          throw basicResult.error;
        }
        
        // Add default values for missing columns
        comboGroups = (basicResult.data || []).map((cg: any) => ({
          ...cg,
          number_of_items: 1,
          display_header: null,
          has_special_section: false
        }));
      } else {
        throw fullResult.error;
      }
    } else {
      comboGroups = fullResult.data || [];
    }
    
    // For combo groups with has_special_section=true, fetch dish selections
    const specialComboGroupIds = comboGroups
      .filter((cg: any) => cg.has_special_section === true)
      .map((cg: any) => cg.id);
    
    let dishSelectionsByComboGroup: Record<number, any[]> = {};
    
    if (specialComboGroupIds.length > 0) {
      // Fetch dish selections with joined dish and course data
      const { data: dishSelections, error: dishSelectionsError } = await supabase
        .schema('menuca_v3')
        .from('combo_group_dish_selections')
        .select(`
          id,
          combo_group_id,
          dish_id,
          size,
          dishes:dish_id (
            id,
            name,
            course_id,
            courses:course_id (
              id,
              name
            )
          )
        `)
        .in('combo_group_id', specialComboGroupIds)
        .eq('is_active', true);
      
      if (dishSelectionsError) {
        console.error('[Combo Modifiers API] Error fetching dish selections:', dishSelectionsError);
        // Continue without dish selections rather than failing completely
      } else if (dishSelections) {
        // Transform and group by combo_group_id
        dishSelections.forEach((ds: any) => {
          if (!dishSelectionsByComboGroup[ds.combo_group_id]) {
            dishSelectionsByComboGroup[ds.combo_group_id] = [];
          }
          
          const dish = ds.dishes;
          const course = dish?.courses;
          
          dishSelectionsByComboGroup[ds.combo_group_id].push({
            id: ds.id,
            dish_id: ds.dish_id,
            dish_name: dish?.name || `Dish ${ds.dish_id}`,
            dish_display_name: null, // Can be extended if display name override exists
            size: ds.size,
            course_id: dish?.course_id || null,
            course_name: course?.name || null
          });
        });
      }
    }
    
    if (!comboGroups || comboGroups.length === 0) {
      return NextResponse.json([]);
    }
    
    // Fetch combo group sections with nested modifier groups, modifiers, prices, and placements
    const { data: sections, error: sectionsError } = await supabase
      .schema('menuca_v3')
      .from('combo_group_sections')
      .select(`
        id,
        combo_group_id,
        section_type,
        use_header,
        display_order,
        free_items,
        min_selection,
        max_selection,
        is_active
      `)
      .in('combo_group_id', comboGroupIds)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (sectionsError) {
      throw sectionsError;
    }
    
    if (!sections || sections.length === 0) {
      // Return combo groups with empty sections but include dish_selections for special combos
      const result = comboGroups.map((cg: any) => ({
        ...cg,
        sections: [],
        dish_selections: dishSelectionsByComboGroup[cg.id] || []
      }));
      return NextResponse.json(result);
    }
    
    const sectionIds = sections.map((s: any) => s.id);
    console.log(`[Combo Modifiers API] Dish ${dishId}: Section IDs being queried:`, sectionIds);
    
    // Fetch only selected modifier groups (is_selected=true means this modifier group is available for this dish)
    const { data: modifierGroups, error: groupsError } = await supabase
      .schema('menuca_v3')
      .from('combo_modifier_groups')
      .select(`
        id,
        combo_group_section_id,
        name,
        type_code,
        is_selected
      `)
      .in('combo_group_section_id', sectionIds)
      .eq('is_selected', true);
    
    console.log(`[Combo Modifiers API] Dish ${dishId}: ${sections.length} sections, ${modifierGroups?.length || 0} modifier groups`);
    
    // Debug: Check if there are ANY combo_modifier_groups for a sample section
    if (sectionIds.length > 0) {
      const { data: debugCheck, error: debugError } = await supabase
        .schema('menuca_v3')
        .from('combo_modifier_groups')
        .select('id, combo_group_section_id, name')
        .limit(5);
      console.log(`[Combo Modifiers API] Sample combo_modifier_groups in DB:`, debugCheck?.slice(0, 3));
    }
    
    if (groupsError) {
      throw groupsError;
    }
    
    if (!modifierGroups || modifierGroups.length === 0) {
      console.log(`[Combo Modifiers API] Dish ${dishId}: No selected modifier groups found. Returning sections without options.`);
      console.log(`[Combo Modifiers API] Sections with min_selection > 0:`, sections.filter((s: any) => s.min_selection > 0).map((s: any) => ({ id: s.id, header: s.use_header, min: s.min_selection })));
      
      // Return combo groups with sections but no modifier groups - include dish_selections for special combos
      const sectionsByComboGroup: Record<number, any[]> = {};
      sections.forEach((s: any) => {
        if (!sectionsByComboGroup[s.combo_group_id]) {
          sectionsByComboGroup[s.combo_group_id] = [];
        }
        sectionsByComboGroup[s.combo_group_id].push({ ...s, modifier_groups: [] });
      });
      
      const result = comboGroups.map((cg: any) => ({
        ...cg,
        sections: sectionsByComboGroup[cg.id] || [],
        dish_selections: dishSelectionsByComboGroup[cg.id] || []
      }));
      return NextResponse.json(result);
    }
    
    const modifierGroupIds = modifierGroups.map((mg: any) => mg.id);
    
    // Fetch modifiers
    const { data: modifiers, error: modifiersError } = await supabase
      .schema('menuca_v3')
      .from('combo_modifiers')
      .select(`
        id,
        combo_modifier_group_id,
        name,
        display_order
      `)
      .in('combo_modifier_group_id', modifierGroupIds)
      .order('display_order', { ascending: true });
    
    if (modifiersError) {
      throw modifiersError;
    }
    
    const modifierIds = (modifiers || []).map((m: any) => m.id);
    
    // Fetch prices and placements in parallel
    const [pricesResult, placementsResult] = await Promise.all([
      modifierIds.length > 0 
        ? supabase
            .schema('menuca_v3')
            .from('combo_modifier_prices')
            .select('id, combo_modifier_id, size_variant, price')
            .in('combo_modifier_id', modifierIds)
        : { data: [], error: null },
      modifierIds.length > 0
        ? supabase
            .schema('menuca_v3')
            .from('combo_modifier_placements')
            .select('id, combo_modifier_id, placement')
            .in('combo_modifier_id', modifierIds)
        : { data: [], error: null }
    ]);
    
    if (pricesResult.error) throw pricesResult.error;
    if (placementsResult.error) throw placementsResult.error;
    
    const prices = pricesResult.data || [];
    const placements = placementsResult.data || [];
    
    // Build nested response structure
    // Group prices and placements by modifier_id
    const pricesByModifier: Record<number, any[]> = {};
    prices.forEach((p: any) => {
      if (!pricesByModifier[p.combo_modifier_id]) {
        pricesByModifier[p.combo_modifier_id] = [];
      }
      pricesByModifier[p.combo_modifier_id].push({
        id: p.id,
        size_variant: p.size_variant,
        price: p.price
      });
    });
    
    const placementsByModifier: Record<number, string[]> = {};
    placements.forEach((p: any) => {
      if (!placementsByModifier[p.combo_modifier_id]) {
        placementsByModifier[p.combo_modifier_id] = [];
      }
      placementsByModifier[p.combo_modifier_id].push(p.placement);
    });
    
    // Enrich modifiers with prices and placements
    const enrichedModifiers = (modifiers || []).map((m: any) => ({
      ...m,
      prices: pricesByModifier[m.id] || [],
      placements: placementsByModifier[m.id] || []
    }));
    
    // Group modifiers by modifier_group_id
    const modifiersByGroup: Record<number, any[]> = {};
    enrichedModifiers.forEach((m: any) => {
      if (!modifiersByGroup[m.combo_modifier_group_id]) {
        modifiersByGroup[m.combo_modifier_group_id] = [];
      }
      modifiersByGroup[m.combo_modifier_group_id].push(m);
    });
    
    // Enrich modifier groups
    const enrichedModifierGroups = modifierGroups.map((mg: any) => ({
      ...mg,
      modifiers: modifiersByGroup[mg.id] || []
    }));
    
    // Group modifier groups by section_id
    const groupsBySection: Record<number, any[]> = {};
    enrichedModifierGroups.forEach((mg: any) => {
      if (!groupsBySection[mg.combo_group_section_id]) {
        groupsBySection[mg.combo_group_section_id] = [];
      }
      groupsBySection[mg.combo_group_section_id].push(mg);
    });
    
    // Enrich sections with modifier groups
    const enrichedSections = sections.map((s: any) => ({
      ...s,
      modifier_groups: groupsBySection[s.id] || []
    }));
    
    // Group sections by combo_group_id
    const sectionsByComboGroup: Record<number, any[]> = {};
    enrichedSections.forEach((s: any) => {
      if (!sectionsByComboGroup[s.combo_group_id]) {
        sectionsByComboGroup[s.combo_group_id] = [];
      }
      sectionsByComboGroup[s.combo_group_id].push(s);
    });
    
    // Build final result: combo_groups with nested sections and dish_selections
    // Get display_order from the minimum of sections' display_order
    const result = comboGroups.map((cg: any) => {
      const cgSections = sectionsByComboGroup[cg.id] || [];
      const minDisplayOrder = cgSections.length > 0 
        ? Math.min(...cgSections.map((s: any) => s.display_order ?? 999))
        : 1;
      return {
        ...cg,
        display_order: minDisplayOrder,
        sections: cgSections,
        // Include dish_selections for special combo groups
        dish_selections: dishSelectionsByComboGroup[cg.id] || []
      };
    });
    
    // Sort by display_order
    result.sort((a: any, b: any) => (a.display_order ?? 999) - (b.display_order ?? 999));
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching combo modifiers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch combo modifiers' },
      { status: 500 }
    );
  }
}
