import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';

export interface DishListItem {
  id: number;
  name: string;
  category: string;
  category_id: number | null;
  dish_type: 'simple' | 'pizza' | 'combo';
  has_modifiers: boolean;
  modifier_count: number;
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
    
    if (dishIds.length === 0) {
      return NextResponse.json([]);
    }
    
    const [simpleGroupsResult, comboLinksResult] = await Promise.all([
      supabase
        .schema('menuca_v3')
        .from('modifier_groups')
        .select('dish_id, id')
        .in('dish_id', dishIds)
        .is('deleted_at', null),
      supabase
        .schema('menuca_v3')
        .from('dish_combo_groups')
        .select('dish_id, combo_group_id')
        .in('dish_id', dishIds)
        .eq('is_active', true)
    ]);
    
    const simpleGroupsByDish: Record<number, number> = {};
    (simpleGroupsResult.data || []).forEach((m: any) => {
      simpleGroupsByDish[m.dish_id] = (simpleGroupsByDish[m.dish_id] || 0) + 1;
    });
    
    const comboGroupsByDish: Record<number, number> = {};
    (comboLinksResult.data || []).forEach((c: any) => {
      comboGroupsByDish[c.dish_id] = (comboGroupsByDish[c.dish_id] || 0) + 1;
    });
    
    const enrichedDishes: DishListItem[] = (dishes || []).map((d: any) => {
      const hasCombo = comboGroupsByDish[d.id] > 0;
      const hasSimple = simpleGroupsByDish[d.id] > 0;
      
      let dishType: 'simple' | 'pizza' | 'combo' = 'simple';
      if (hasCombo) {
        dishType = d.is_combo ? 'combo' : 'pizza';
      }
      
      const modifierCount = hasCombo 
        ? comboGroupsByDish[d.id] 
        : (simpleGroupsByDish[d.id] || 0);
      
      return {
        id: d.id,
        name: d.name,
        category: d.courses?.name || 'Uncategorized',
        category_id: d.course_id,
        dish_type: dishType,
        has_modifiers: hasSimple || hasCombo,
        modifier_count: modifierCount
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
