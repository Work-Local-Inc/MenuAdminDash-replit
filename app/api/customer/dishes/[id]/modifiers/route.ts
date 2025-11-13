import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const dishId = parseInt(params.id, 10);
    
    if (isNaN(dishId)) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      );
    }
    
    // Fetch modifier groups with nested modifiers and prices
    // Schema hierarchy: modifier_groups → dish_modifiers → dish_modifier_prices
    const { data: modifierGroups, error } = await supabase
      .schema('menuca_v3')
      .from('modifier_groups')
      .select(`
        id,
        dish_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        parent_modifier_id,
        instructions,
        modifiers:dish_modifiers(
          id,
          uuid,
          restaurant_id,
          dish_id,
          modifier_group_id,
          name,
          is_default,
          modifier_type,
          display_order,
          prices:dish_modifier_prices(
            id,
            uuid,
            dish_modifier_id,
            dish_id,
            size_variant,
            price,
            display_order,
            is_active
          )
        )
      `)
      .eq('dish_id', dishId)
      .order('display_order', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Filter out inactive modifier prices and sort modifiers
    const processedGroups = (modifierGroups || []).map(group => ({
      ...group,
      modifiers: (group.modifiers || [])
        .map((modifier: any) => ({
          ...modifier,
          prices: (modifier.prices || [])
            .filter((price: any) => price.is_active)
            .sort((a: any, b: any) => a.display_order - b.display_order)
        }))
        .sort((a: any, b: any) => a.display_order - b.display_order)
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
