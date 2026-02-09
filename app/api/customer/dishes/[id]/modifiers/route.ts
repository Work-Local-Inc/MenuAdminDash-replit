import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic'

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
    
    // Fetch modifier groups
    const { data: modifierGroups, error: groupsError } = await supabase
      .schema('menuca_v3')
      .from('modifier_groups' as any)
      .select(`
        id,
        dish_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order
      `)
      .eq('dish_id', dishId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });
    
    if (groupsError) {
      throw groupsError;
    }
    
    if (!modifierGroups || modifierGroups.length === 0) {
      return NextResponse.json([]);
    }
    
    const modifierGroupIds = modifierGroups.map((g: any) => g.id);
    
    // Fetch modifiers from modifiers table (NOT the empty dish_modifiers table)
    const { data: modifiers, error: modifiersError } = await supabase
      .schema('menuca_v3')
      .from('modifiers' as any)
      .select(`
        id,
        modifier_group_id,
        name_en,
        name_fr,
        display_order,
        is_active
      `)
      .in('modifier_group_id', modifierGroupIds)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });
    
    if (modifiersError) {
      throw modifiersError;
    }
    
    // Fetch modifier prices from modifier_prices table (NOT the empty dish_modifier_prices table)
    const modifierIds = (modifiers || []).map((m: any) => m.id);
    let prices: any[] = [];
    
    if (modifierIds.length > 0) {
      const { data: pricesData, error: pricesError } = await supabase
        .schema('menuca_v3')
        .from('modifier_prices' as any)
        .select(`
          id,
          modifier_id,
          modifier_size_variant_id,
          price
        `)
        .in('modifier_id', modifierIds);
      
      if (pricesError) {
        console.log('[Customer Modifiers] Prices query error:', pricesError);
      } else {
        prices = pricesData || [];
      }
    }
    
    // Group prices by modifier id
    const pricesByModifier: Record<number, any[]> = {};
    prices.forEach((p: any) => {
      if (!pricesByModifier[p.modifier_id]) {
        pricesByModifier[p.modifier_id] = [];
      }
      pricesByModifier[p.modifier_id].push({
        size_variant: p.modifier_size_variant_id === 1 || !p.modifier_size_variant_id ? null : `Size ${p.modifier_size_variant_id}`,
        price: p.price
      });
    });
    
    // Group modifiers by group id
    const modifiersByGroup: Record<number, any[]> = {};
    (modifiers || []).forEach((m: any) => {
      if (!modifiersByGroup[m.modifier_group_id]) {
        modifiersByGroup[m.modifier_group_id] = [];
      }
      modifiersByGroup[m.modifier_group_id].push({
        id: m.id,
        name: m.name_en || m.name_fr,
        name_en: m.name_en,
        name_fr: m.name_fr,
        display_order: m.display_order,
        prices: pricesByModifier[m.id] || []
      });
    });
    
    // Build final response
    const processedGroups = modifierGroups.map((group: any) => ({
      ...group,
      modifiers: (modifiersByGroup[group.id] || [])
        .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
    }));
    
    return NextResponse.json(processedGroups);
  } catch (error: any) {
    console.error('Error fetching dish modifiers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch modifiers' },
      { status: 500 }
    );
  }
}
