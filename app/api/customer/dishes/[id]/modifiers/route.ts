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
    
    // Fetch modifier groups with minimal fields to avoid column errors
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
        modifiers:dish_modifiers(
          id,
          name,
          display_order,
          prices:dish_modifier_prices(
            size_variant,
            price
          )
        )
      `)
      .eq('dish_id', dishId)
      .order('display_order', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Sort modifiers
    const processedGroups = (modifierGroups || []).map((group: any) => ({
      ...group,
      modifiers: (group.modifiers || [])
        .map((modifier: any) => ({
          ...modifier,
          prices: modifier.prices || []
        }))
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
