import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';

export interface UnifiedModifier {
  id: number;
  name: string;
  price: number;
  display_order: number;
  is_default: boolean;
  is_included: boolean;
  placements?: string[];
  size_prices?: Array<{ size_variant: string; price: number }>;
}

export interface UnifiedModifierGroup {
  id: number;
  name: string;
  display_order: number;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  section_type?: string;
  section_header?: string;
  source: 'simple' | 'combo' | 'category';
  modifiers: UnifiedModifier[];
}

export interface UnifiedDishModifiers {
  dish_id: number;
  dish_name: string;
  dish_type: 'simple' | 'pizza' | 'combo';
  has_placements: boolean;
  has_size_pricing: boolean;
  modifier_groups: UnifiedModifierGroup[];
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const { searchParams } = new URL(request.url);
    const dishId = searchParams.get('dish_id');
    const restaurantId = searchParams.get('restaurant_id');
    
    if (!dishId) {
      return NextResponse.json(
        { error: 'dish_id is required' },
        { status: 400 }
      );
    }
    
    const supabase = createAdminClient() as any;
    const dishIdNum = parseInt(dishId, 10);
    
    // Fetch dish with restaurant info to get legacy_v1_id for proper lookups
    const { data: dish, error: dishError } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('id, name, is_combo, restaurant_id')
      .eq('id', dishIdNum)
      .single();
    
    if (dishError || !dish) {
      return NextResponse.json(
        { error: 'Dish not found' },
        { status: 404 }
      );
    }
    
    const { data: comboLinks } = await supabase
      .schema('menuca_v3')
      .from('dish_combo_groups')
      .select('combo_group_id')
      .eq('dish_id', dishIdNum)
      .eq('is_active', true);
    
    const hasComboGroups = comboLinks && comboLinks.length > 0;
    
    let result: UnifiedDishModifiers;
    
    if (hasComboGroups) {
      result = await fetchComboModifiers(supabase, dish, comboLinks);
    } else {
      result = await fetchSimpleModifiers(supabase, dish);
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching unified modifiers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch modifiers' },
      { status: 500 }
    );
  }
}

async function fetchComboModifiers(
  supabase: any,
  dish: any,
  comboLinks: any[]
): Promise<UnifiedDishModifiers> {
  const comboGroupIds = comboLinks.map((cl: any) => cl.combo_group_id);
  
  const { data: sections } = await supabase
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
  
  if (!sections || sections.length === 0) {
    return {
      dish_id: dish.id,
      dish_name: dish.name,
      dish_type: 'combo',
      has_placements: false,
      has_size_pricing: false,
      modifier_groups: []
    };
  }
  
  const sectionIds = sections.map((s: any) => s.id);
  
  const { data: modifierGroups } = await supabase
    .schema('menuca_v3')
    .from('combo_modifier_groups')
    .select('id, combo_group_section_id, name, type_code, is_selected')
    .in('combo_group_section_id', sectionIds);
  
  if (!modifierGroups || modifierGroups.length === 0) {
    return {
      dish_id: dish.id,
      dish_name: dish.name,
      dish_type: 'combo',
      has_placements: false,
      has_size_pricing: false,
      modifier_groups: []
    };
  }
  
  const modifierGroupIds = modifierGroups.map((mg: any) => mg.id);
  
  const { data: modifiers } = await supabase
    .schema('menuca_v3')
    .from('combo_modifiers')
    .select('id, combo_modifier_group_id, name, display_order')
    .in('combo_modifier_group_id', modifierGroupIds)
    .order('display_order', { ascending: true });
  
  const modifierIds = (modifiers || []).map((m: any) => m.id);
  
  const [pricesResult, placementsResult] = await Promise.all([
    modifierIds.length > 0
      ? supabase
          .schema('menuca_v3')
          .from('combo_modifier_prices')
          .select('combo_modifier_id, size_variant, price')
          .in('combo_modifier_id', modifierIds)
      : { data: [] },
    modifierIds.length > 0
      ? supabase
          .schema('menuca_v3')
          .from('combo_modifier_placements')
          .select('combo_modifier_id, placement')
          .in('combo_modifier_id', modifierIds)
      : { data: [] }
  ]);
  
  const prices = pricesResult.data || [];
  const placements = placementsResult.data || [];
  
  const pricesByModifier: Record<number, any[]> = {};
  prices.forEach((p: any) => {
    if (!pricesByModifier[p.combo_modifier_id]) {
      pricesByModifier[p.combo_modifier_id] = [];
    }
    pricesByModifier[p.combo_modifier_id].push({
      size_variant: p.size_variant,
      price: parseFloat(p.price)
    });
  });
  
  const placementsByModifier: Record<number, string[]> = {};
  placements.forEach((p: any) => {
    if (!placementsByModifier[p.combo_modifier_id]) {
      placementsByModifier[p.combo_modifier_id] = [];
    }
    placementsByModifier[p.combo_modifier_id].push(p.placement);
  });
  
  const modifiersByGroup: Record<number, UnifiedModifier[]> = {};
  (modifiers || []).forEach((m: any) => {
    if (!modifiersByGroup[m.combo_modifier_group_id]) {
      modifiersByGroup[m.combo_modifier_group_id] = [];
    }
    const sizePrices = pricesByModifier[m.id] || [];
    const defaultPrice = sizePrices.length > 0 ? sizePrices[0].price : 0;
    
    modifiersByGroup[m.combo_modifier_group_id].push({
      id: m.id,
      name: m.name,
      price: defaultPrice,
      display_order: m.display_order,
      is_default: false,
      is_included: defaultPrice === 0,
      placements: placementsByModifier[m.id],
      size_prices: sizePrices.length > 1 ? sizePrices : undefined
    });
  });
  
  const sectionLookup: Record<number, any> = {};
  sections.forEach((s: any) => {
    sectionLookup[s.id] = s;
  });
  
  const unifiedGroups: UnifiedModifierGroup[] = modifierGroups.map((mg: any) => {
    const section = sectionLookup[mg.combo_group_section_id];
    return {
      id: mg.id,
      name: mg.name,
      display_order: section?.display_order || 0,
      is_required: section?.min_selection > 0,
      min_selections: section?.min_selection || 0,
      max_selections: section?.max_selection || 999,
      section_type: section?.section_type,
      section_header: section?.use_header,
      source: 'combo' as const,
      modifiers: modifiersByGroup[mg.id] || []
    };
  });
  
  unifiedGroups.sort((a, b) => a.display_order - b.display_order);
  
  const hasPlacements = placements.length > 0;
  const hasSizePricing = Object.values(pricesByModifier).some(arr => arr.length > 1);
  const isPizza = sections.some((s: any) => 
    s.section_type === 'custom_ingredients' || 
    s.section_type === 'sauce' ||
    s.use_header?.toLowerCase().includes('topping')
  );
  
  return {
    dish_id: dish.id,
    dish_name: dish.name,
    dish_type: isPizza ? 'pizza' : 'combo',
    has_placements: hasPlacements,
    has_size_pricing: hasSizePricing,
    modifier_groups: unifiedGroups
  };
}

async function fetchSimpleModifiers(
  supabase: any,
  dish: any
): Promise<UnifiedDishModifiers> {
  const { data: modifierGroups } = await supabase
    .schema('menuca_v3')
    .from('modifier_groups')
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
    .eq('dish_id', dish.id)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });
  
  if (!modifierGroups || modifierGroups.length === 0) {
    return {
      dish_id: dish.id,
      dish_name: dish.name,
      dish_type: 'simple',
      has_placements: false,
      has_size_pricing: false,
      modifier_groups: []
    };
  }
  
  const groupIds = modifierGroups.map((g: any) => g.id);
  
  const { data: modifiers } = await supabase
    .schema('menuca_v3')
    .from('dish_modifiers')
    .select(`
      id,
      modifier_group_id,
      name,
      is_included,
      is_default,
      display_order
    `)
    .in('modifier_group_id', groupIds)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });
  
  const modifierIds = (modifiers || []).map((m: any) => m.id);
  
  let prices: any[] = [];
  if (modifierIds.length > 0) {
    const { data: pricesData } = await supabase
      .schema('menuca_v3')
      .from('dish_modifier_prices')
      .select('dish_modifier_id, price')
      .in('dish_modifier_id', modifierIds);
    prices = pricesData || [];
  }
  
  const pricesByModifier: Record<number, number> = {};
  prices.forEach((p: any) => {
    pricesByModifier[p.dish_modifier_id] = parseFloat(p.price);
  });
  
  const modifiersByGroup: Record<number, UnifiedModifier[]> = {};
  (modifiers || []).forEach((m: any) => {
    if (!modifiersByGroup[m.modifier_group_id]) {
      modifiersByGroup[m.modifier_group_id] = [];
    }
    modifiersByGroup[m.modifier_group_id].push({
      id: m.id,
      name: m.name,
      price: pricesByModifier[m.id] || 0,
      display_order: m.display_order,
      is_default: m.is_default,
      is_included: m.is_included
    });
  });
  
  const unifiedGroups: UnifiedModifierGroup[] = modifierGroups.map((g: any) => ({
    id: g.id,
    name: g.name,
    display_order: g.display_order,
    is_required: g.is_required,
    min_selections: g.min_selections,
    max_selections: g.max_selections,
    source: g.course_template_id ? 'category' as const : 'simple' as const,
    modifiers: modifiersByGroup[g.id] || []
  }));
  
  return {
    dish_id: dish.id,
    dish_name: dish.name,
    dish_type: 'simple',
    has_placements: false,
    has_size_pricing: false,
    modifier_groups: unifiedGroups
  };
}

export async function GET_DISHES(request: NextRequest) {
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
    
    const { data: dishes, error } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select(`
        id,
        name,
        is_combo,
        course_id,
        courses:course_id (id, name)
      `)
      .eq('restaurant_id', parseInt(restaurantId, 10))
      .is('deleted_at', null)
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    const dishIds = (dishes || []).map((d: any) => d.id);
    
    const [simpleModifiersResult, comboLinksResult] = await Promise.all([
      dishIds.length > 0
        ? supabase
            .schema('menuca_v3')
            .from('modifier_groups')
            .select('dish_id')
            .in('dish_id', dishIds)
            .is('deleted_at', null)
        : { data: [] },
      dishIds.length > 0
        ? supabase
            .schema('menuca_v3')
            .from('dish_combo_groups')
            .select('dish_id')
            .in('dish_id', dishIds)
            .eq('is_active', true)
        : { data: [] }
    ]);
    
    const dishesWithSimple = new Set(
      (simpleModifiersResult.data || []).map((m: any) => m.dish_id)
    );
    const dishesWithCombo = new Set(
      (comboLinksResult.data || []).map((c: any) => c.dish_id)
    );
    
    const enrichedDishes = (dishes || []).map((d: any) => {
      let dishType: 'simple' | 'pizza' | 'combo' = 'simple';
      if (dishesWithCombo.has(d.id)) {
        dishType = d.is_combo ? 'combo' : 'pizza';
      }
      
      return {
        id: d.id,
        name: d.name,
        category: d.courses?.name || 'Uncategorized',
        dish_type: dishType,
        has_modifiers: dishesWithSimple.has(d.id) || dishesWithCombo.has(d.id)
      };
    });
    
    return NextResponse.json(enrichedDishes);
  } catch (error: any) {
    console.error('Error fetching dishes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dishes' },
      { status: 500 }
    );
  }
}
