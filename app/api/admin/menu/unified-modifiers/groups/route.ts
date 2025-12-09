import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';

export interface ModifierGroupListItem {
  id: number;
  name: string;
  source: 'simple' | 'combo';
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  modifier_count: number;
  linked_dish_count: number;
  supports_placements: boolean;
  supports_size_pricing: boolean;
  display_order: number;
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient() as any;
    const restaurantIdNum = parseInt(restaurantId, 10);
    
    const { data: restaurant } = await supabase
      .schema('menuca_v3')
      .from('restaurants')
      .select('id, legacy_v1_id')
      .eq('id', restaurantIdNum)
      .single();
    
    const effectiveRestaurantId = restaurant?.legacy_v1_id || restaurantIdNum;
    
    console.log('[Modifier Groups API] Restaurant lookup:', {
      inputId: restaurantIdNum,
      legacyId: restaurant?.legacy_v1_id,
      effectiveId: effectiveRestaurantId
    });
    
    // Simple modifier groups are queried through dishes (use legacy ID)
    // Combo groups have direct restaurant_id FK to restaurants.id (use V3 ID)
    const [simpleGroups, comboGroups] = await Promise.all([
      fetchSimpleModifierGroups(supabase, effectiveRestaurantId),
      fetchComboModifierGroups(supabase, restaurantIdNum) // Use V3 ID for combo_groups
    ]);
    
    console.log('[Modifier Groups API] Results:', {
      simpleCount: simpleGroups.length,
      comboCount: comboGroups.length
    });
    
    const allGroups = [...simpleGroups, ...comboGroups];
    
    return NextResponse.json(allGroups);
  } catch (error: any) {
    console.error('Error fetching modifier groups:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch modifier groups' },
      { status: 500 }
    );
  }
}

async function fetchSimpleModifierGroups(
  supabase: any,
  restaurantId: number
): Promise<ModifierGroupListItem[]> {
  const { data: dishes } = await supabase
    .schema('menuca_v3')
    .from('dishes')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null);
  
  if (!dishes || dishes.length === 0) {
    return [];
  }
  
  const dishIds = dishes.map((d: any) => d.id);
  
  const { data: modifierGroups } = await supabase
    .schema('menuca_v3')
    .from('modifier_groups')
    .select('id, dish_id, name, is_required, min_selections, max_selections, display_order')
    .in('dish_id', dishIds)
    .is('deleted_at', null);
  
  if (!modifierGroups || modifierGroups.length === 0) {
    return [];
  }
  
  const groupIds = modifierGroups.map((g: any) => g.id);
  
  const { data: modifiers } = await supabase
    .schema('menuca_v3')
    .from('dish_modifiers')
    .select('id, modifier_group_id')
    .in('modifier_group_id', groupIds)
    .is('deleted_at', null);
  
  const modifierCountByGroup: Record<number, number> = {};
  (modifiers || []).forEach((m: any) => {
    modifierCountByGroup[m.modifier_group_id] = (modifierCountByGroup[m.modifier_group_id] || 0) + 1;
  });
  
  return modifierGroups.map((g: any) => ({
    id: g.id,
    name: g.name,
    source: 'simple' as const,
    is_required: g.is_required || false,
    min_selections: g.min_selections || 0,
    max_selections: g.max_selections || 10,
    modifier_count: modifierCountByGroup[g.id] || 0,
    linked_dish_count: 1,
    supports_placements: false,
    supports_size_pricing: false,
    display_order: g.display_order || 1
  }));
}

async function fetchComboModifierGroups(
  supabase: any,
  restaurantId: number
): Promise<ModifierGroupListItem[]> {
  console.log('[fetchComboModifierGroups] Querying combo_groups with restaurant_id:', restaurantId);
  
  // Note: combo_groups table doesn't have display_order column
  // Actual columns: id, restaurant_id, name, number_of_items, display_header, source_id, created_at, updated_at, deleted_at
  const { data: comboGroups, error } = await supabase
    .schema('menuca_v3')
    .from('combo_groups')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null);
  
  console.log('[fetchComboModifierGroups] Result:', { 
    count: comboGroups?.length || 0, 
    error: error?.message,
    sample: comboGroups?.slice(0, 3)
  });
  
  if (!comboGroups || comboGroups.length === 0) {
    return [];
  }
  
  const comboGroupIds = comboGroups.map((g: any) => g.id);
  
  const [dishLinksResult, sectionsResult] = await Promise.all([
    supabase
      .schema('menuca_v3')
      .from('dish_combo_groups')
      .select('combo_group_id, dish_id')
      .in('combo_group_id', comboGroupIds)
      .eq('is_active', true),
    supabase
      .schema('menuca_v3')
      .from('combo_group_sections')
      .select('id, combo_group_id, min_selection, max_selection')
      .in('combo_group_id', comboGroupIds)
      .eq('is_active', true)
  ]);
  
  const dishLinks = dishLinksResult.data || [];
  const sections = sectionsResult.data || [];
  
  const dishCountByGroup: Record<number, number> = {};
  dishLinks.forEach((link: any) => {
    dishCountByGroup[link.combo_group_id] = (dishCountByGroup[link.combo_group_id] || 0) + 1;
  });
  
  if (sections.length === 0) {
    return comboGroups.map((g: any) => ({
      id: g.id,
      name: g.name,
      source: 'combo' as const,
      is_required: false,
      min_selections: 0,
      max_selections: 10,
      modifier_count: 0,
      linked_dish_count: dishCountByGroup[g.id] || 0,
      supports_placements: false,
      supports_size_pricing: false,
      display_order: 1 // combo_groups table doesn't have display_order column
    }));
  }
  
  const sectionIds = sections.map((s: any) => s.id);
  
  const { data: modifierGroupsData } = await supabase
    .schema('menuca_v3')
    .from('combo_modifier_groups')
    .select('id, combo_group_section_id')
    .in('combo_group_section_id', sectionIds);
  
  const modifierGroups = modifierGroupsData || [];
  const modGroupIds = modifierGroups.map((mg: any) => mg.id);
  
  let modifiers: any[] = [];
  if (modGroupIds.length > 0) {
    const { data: modifiersData } = await supabase
      .schema('menuca_v3')
      .from('combo_modifiers')
      .select('id, combo_modifier_group_id')
      .in('combo_modifier_group_id', modGroupIds);
    modifiers = modifiersData || [];
  }
  
  const modifierIds = modifiers.map((m: any) => m.id);
  
  let prices: any[] = [];
  let placements: any[] = [];
  
  if (modifierIds.length > 0) {
    const [pricesResult, placementsResult] = await Promise.all([
      supabase
        .schema('menuca_v3')
        .from('combo_modifier_prices')
        .select('combo_modifier_id, size_variant')
        .in('combo_modifier_id', modifierIds),
      supabase
        .schema('menuca_v3')
        .from('combo_modifier_placements')
        .select('combo_modifier_id')
        .in('combo_modifier_id', modifierIds)
    ]);
    prices = pricesResult.data || [];
    placements = placementsResult.data || [];
  }
  
  const sectionsByComboGroup: Record<number, any[]> = {};
  sections.forEach((s: any) => {
    if (!sectionsByComboGroup[s.combo_group_id]) {
      sectionsByComboGroup[s.combo_group_id] = [];
    }
    sectionsByComboGroup[s.combo_group_id].push(s);
  });
  
  const modGroupsBySection: Record<number, any[]> = {};
  modifierGroups.forEach((mg: any) => {
    if (!modGroupsBySection[mg.combo_group_section_id]) {
      modGroupsBySection[mg.combo_group_section_id] = [];
    }
    modGroupsBySection[mg.combo_group_section_id].push(mg);
  });
  
  const modifiersByModGroup: Record<number, any[]> = {};
  modifiers.forEach((m: any) => {
    if (!modifiersByModGroup[m.combo_modifier_group_id]) {
      modifiersByModGroup[m.combo_modifier_group_id] = [];
    }
    modifiersByModGroup[m.combo_modifier_group_id].push(m);
  });
  
  const priceCountByModifier: Record<number, number> = {};
  prices.forEach((p: any) => {
    priceCountByModifier[p.combo_modifier_id] = (priceCountByModifier[p.combo_modifier_id] || 0) + 1;
  });
  
  const modifiersWithSizePricing = new Set(
    Object.entries(priceCountByModifier)
      .filter(([_, count]) => count > 1)
      .map(([id]) => parseInt(id))
  );
  
  const modifiersWithPlacements = new Set(placements.map((p: any) => p.combo_modifier_id));
  
  return comboGroups.map((g: any) => {
    const groupSections = sectionsByComboGroup[g.id] || [];
    
    let totalModifierCount = 0;
    let hasPlacements = false;
    let hasSizePricing = false;
    let isRequired = false;
    let minSelections = 0;
    let maxSelections = 10;
    
    groupSections.forEach((section: any) => {
      if (section.min_selection > 0) isRequired = true;
      minSelections = Math.max(minSelections, section.min_selection || 0);
      if (section.max_selection && section.max_selection < maxSelections) {
        maxSelections = section.max_selection;
      }
      
      const sectionModGroups = modGroupsBySection[section.id] || [];
      sectionModGroups.forEach((mg: any) => {
        const mods = modifiersByModGroup[mg.id] || [];
        totalModifierCount += mods.length;
        
        mods.forEach((mod: any) => {
          if (modifiersWithPlacements.has(mod.id)) hasPlacements = true;
          if (modifiersWithSizePricing.has(mod.id)) hasSizePricing = true;
        });
      });
    });
    
    return {
      id: g.id,
      name: g.name,
      source: 'combo' as const,
      is_required: isRequired,
      min_selections: minSelections,
      max_selections: maxSelections,
      modifier_count: totalModifierCount,
      linked_dish_count: dishCountByGroup[g.id] || 0,
      supports_placements: hasPlacements,
      supports_size_pricing: hasSizePricing,
      display_order: 1 // combo_groups table doesn't have display_order column
    };
  });
}
