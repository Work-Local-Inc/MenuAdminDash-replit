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
    const restaurantIdNum = parseInt(restaurantId, 10);
    
    // Look up the restaurant to get legacy_v1_id if it exists
    // Some restaurants have dishes stored under legacy_v1_id, others under the V3 id
    const { data: restaurant } = await supabase
      .schema('menuca_v3')
      .from('restaurants')
      .select('id, legacy_v1_id')
      .eq('id', restaurantIdNum)
      .single();
    
    // For Centertown and similar restaurants, dishes might be stored with V3 ID
    // Try V3 ID first, then fall back to legacy_v1_id if no results
    const legacyId = restaurant?.legacy_v1_id || restaurantIdNum;
    
    console.log('[Dishes API] Restaurant lookup:', { inputId: restaurantIdNum, restaurant, legacyId });
    
    // Try V3 ID first (restaurantIdNum)
    let [dishesResult, coursesResult] = await Promise.all([
      supabase
        .schema('menuca_v3')
        .from('dishes')
        .select('id, name, is_combo, course_id')
        .eq('restaurant_id', restaurantIdNum)
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      supabase
        .schema('menuca_v3')
        .from('courses')
        .select('id, name')
        .eq('restaurant_id', restaurantIdNum)
        .is('deleted_at', null)
    ]);
    
    // If no dishes found with V3 ID and legacy ID is different, try legacy
    if ((!dishesResult.data || dishesResult.data.length === 0) && legacyId !== restaurantIdNum) {
      console.log('[Dishes API] No dishes with V3 ID, trying legacy ID:', legacyId);
      [dishesResult, coursesResult] = await Promise.all([
        supabase
          .schema('menuca_v3')
          .from('dishes')
          .select('id, name, is_combo, course_id')
          .eq('restaurant_id', legacyId)
          .is('deleted_at', null)
          .order('name', { ascending: true }),
        supabase
          .schema('menuca_v3')
          .from('courses')
          .select('id, name')
          .eq('restaurant_id', legacyId)
          .is('deleted_at', null)
      ]);
    }
    
    if (dishesResult.error) throw dishesResult.error;
    
    const dishes = dishesResult.data || [];
    const courses = coursesResult.data || [];
    
    console.log('[Dishes API] Found dishes:', dishes.length, 'courses:', courses.length);
    
    // Build course lookup map
    const courseMap: Record<number, string> = {};
    courses.forEach((c: any) => {
      courseMap[c.id] = c.name;
    });
    
    const dishIds = dishes.map((d: any) => d.id);
    
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
    
    const enrichedDishes: DishListItem[] = dishes.map((d: any) => {
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
        category: courseMap[d.course_id] || 'Uncategorized',
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
